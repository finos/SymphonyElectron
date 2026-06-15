import { app, session } from 'electron';

import { logger } from '../common/logger';
import { CloudConfigDataTypes, config, IConfig } from './config-handler';

const CHROME_FLAG_PREFIX = '--';

// Set default flags
logger.info(`chrome-flags: Setting mandatory chrome flags`, {
  flag: { 'ssl-version-fallback-min': 'tls1.2' },
});
app.commandLine.appendSwitch('ssl-version-fallback-min', 'tls1.2');
app.commandLine.appendSwitch('disable-threaded-scrolling');
app.commandLine.appendSwitch('disable-smooth-scrolling');

// Special args that need to be excluded as part of the chrome command line switch
const specialArgs = [
  '--url',
  '--multiInstance',
  '--userDataPath=',
  'symphony://',
  '--inspect-brk',
  '--inspect',
  '--logPath',
  '--custom-timezone',
  '--auth-server-whitelist',
  '--auth-negotiate-delegate-whitelist',
];

/**
 * Validates an --auth-server-whitelist / --auth-negotiate-delegate-whitelist
 * value before it is applied as a Chromium switch or NTLM-credential allowlist.
 */
export const isSafeAuthWhitelist = (value: unknown): value is string => {
  if (typeof value !== 'string') {
    return false;
  }
  const entries = value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  if (entries.length === 0) {
    return false;
  }
  return entries.every((entry) => entry !== '*');
};

/**
 * Sets chrome flags
 */
export const setChromeFlags = () => {
  logger.info(`chrome-flags: Checking if we need to set chrome flags!`);

  const flagsConfig = config.getConfigFields([
    'customFlags',
    'disableGpu',
  ]) as IConfig;
  const { disableThrottling } = config.getCloudConfigFields([
    'disableThrottling',
  ]) as any;
  const configFlags: object = {
    'disable-background-timer-throttling': 'true',
    'disable-d3d11': true,
    'disable-gpu': flagsConfig.disableGpu || null,
    'disable-gpu-compositing': flagsConfig.disableGpu || null,
    'enable-blink-features': 'RTCInsertableStreams',
    'disable-features': 'ChromeRootStoreUsed',
  };
  const authNegotiate = flagsConfig.customFlags?.authNegotiateDelegateWhitelist;
  if (isSafeAuthWhitelist(authNegotiate)) {
    configFlags['auth-negotiate-delegate-whitelist'] = authNegotiate;
  } else if (authNegotiate) {
    logger.warn(
      `chrome-flags: rejecting unsafe authNegotiateDelegateWhitelist value`,
    );
  }
  const authServer = flagsConfig.customFlags?.authServerWhitelist;
  if (isSafeAuthWhitelist(authServer)) {
    configFlags['auth-server-whitelist'] = authServer;
  } else if (authServer) {
    logger.warn(`chrome-flags: rejecting unsafe authServerWhitelist value`);
  }
  if (
    flagsConfig.customFlags.disableThrottling ===
      CloudConfigDataTypes.ENABLED ||
    disableThrottling === CloudConfigDataTypes.ENABLED
  ) {
    configFlags['disable-renderer-backgrounding'] = 'true';
  }

  for (const key in configFlags) {
    if (!Object.prototype.hasOwnProperty.call(configFlags, key)) {
      continue;
    }
    const val = configFlags[key];
    if (key && val) {
      logger.info(
        `chrome-flags: Setting chrome flag for ${key} with value ${val}!`,
      );
      app.commandLine.appendSwitch(key, val);
    }
  }
  let cmdArgs = process.argv;
  const { chromeFlags } = config.getGlobalConfigFields(['chromeFlags']) as any;
  if (chromeFlags?.length) {
    logger.info(
      `chrome-flags: found chrome flags in config file: ${chromeFlags}`,
    );
    const splittedChromeFlags = chromeFlagsSplitter(chromeFlags);
    cmdArgs = cmdArgs.concat(splittedChromeFlags);
  }
  for (const arg of cmdArgs) {
    // Stop processing at the `--` separator: anything after it is positional
    // (the symphony:// URI placed by the protocol handler) and must never be
    // promoted to a Chromium switch (H1 #3770918).
    if (arg === '--') {
      break;
    }
    // We need to check if the argument key matches the one
    // in the special args array and return if it does match
    const argSplit = arg.split('=');
    const argKey = argSplit[0];
    const argValue = argSplit[1] && arg.substring(arg.indexOf('=') + 1);
    if (arg.startsWith(CHROME_FLAG_PREFIX) && specialArgs.includes(argKey)) {
      continue;
    }

    // All the chrome flags starts with --
    // So, any other arg (like 'electron' or '.')
    // need to be skipped
    if (arg.startsWith(CHROME_FLAG_PREFIX)) {
      // Since chrome takes values after an equals
      // We split the arg and set it either as
      // just a key, or as a key-value pair
      if (argKey && argValue) {
        app.commandLine.appendSwitch(argKey.substr(2), argValue);
        logger.info(
          `chrome-flags: Appended chrome command line switch ${argKey} with value ${argValue}`,
        );
      } else {
        app.commandLine.appendSwitch(argKey);
        logger.info(
          `chrome-flags: Appended chrome command line switch ${argKey}`,
        );
      }
    }
  }
};

/**
 * Sets default session properties
 */
export const setSessionProperties = () => {
  logger.info(`chrome-flags: Settings session properties`);
  const { customFlags } = config.getConfigFields(['customFlags']) as IConfig;
  const { defaultSession } = session;

  if (
    defaultSession &&
    customFlags &&
    isSafeAuthWhitelist(customFlags.authServerWhitelist)
  ) {
    defaultSession.allowNTLMCredentialsForDomains(
      customFlags.authServerWhitelist,
    );
  } else if (customFlags?.authServerWhitelist) {
    logger.warn(
      `chrome-flags: rejecting unsafe NTLM domain allowlist from customFlags`,
    );
  }
};

/**
 * Splits a string of concatenated chrome flags into an array of chrome flags.
 * @param flags Chrome flags provided as a string
 * @returns An array of chrome flags
 */
const chromeFlagsSplitter = (flags: string) => {
  logger.info('chrome-flags: Parsing flags', flags);
  const splittedFlags = flags
    .split(CHROME_FLAG_PREFIX)
    .filter((chromeFlag: string) => chromeFlag.length)
    .map(
      (filteredFlag: string) =>
        `${CHROME_FLAG_PREFIX}${filteredFlag.trimEnd()}`,
    );
  logger.info('chrome-flags: Parsed flags', splittedFlags);
  return splittedFlags;
};
