import { app, session } from 'electron';

import { logger } from '../common/logger';
import { CloudConfigDataTypes, config, IConfig } from './config-handler';

// Set default flags
logger.info(`chrome-flags: Setting mandatory chrome flags`, {
  flag: { 'ssl-version-fallback-min': 'tls1.2' },
});
app.commandLine.appendSwitch('ssl-version-fallback-min', 'tls1.2');

// Special args that need to be excluded as part of the chrome command line switch
const specialArgs = [
  '--url',
  '--multiInstance',
  '--userDataPath=',
  'symphony://',
  '--inspect-brk',
  '--inspect',
  '--logPath',
];

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
    'auth-negotiate-delegate-whitelist':
      flagsConfig.customFlags.authNegotiateDelegateWhitelist,
    'auth-server-whitelist': flagsConfig.customFlags.authServerWhitelist,
    'disable-background-timer-throttling': 'true',
    'disable-d3d11': flagsConfig.disableGpu || null,
    'disable-gpu': flagsConfig.disableGpu || null,
    'disable-gpu-compositing': flagsConfig.disableGpu || null,
    'enable-blink-features': 'RTCInsertableStreams',
  };
  if (
    flagsConfig.customFlags.disableThrottling ===
      CloudConfigDataTypes.ENABLED ||
    disableThrottling === CloudConfigDataTypes.ENABLED
  ) {
    configFlags['disable-renderer-backgrounding'] = 'true';
  }

  // Quick fix for GS only on 9.2.x
  // Only for mac Big Sur users
  // https://perzoinc.atlassian.net/browse/sda-3321 GS - SDA client fails to load for users on Mac after migration to Ping
  app.commandLine.appendSwitch('no-sandbox');

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

  const cmdArgs = process.argv;
  cmdArgs.forEach((arg) => {
    // We need to check if the argument key matches the one
    // in the special args array and return if it does match
    const argSplit = arg.split('=');
    const argKey = argSplit[0];
    const argValue = argSplit[1] && arg.substring(arg.indexOf('=') + 1);
    if (arg.startsWith('--') && specialArgs.includes(argKey)) {
      return;
    }

    // All the chrome flags starts with --
    // So, any other arg (like 'electron' or '.')
    // need to be skipped
    if (arg.startsWith('--')) {
      // Since chrome takes values after an equals
      // We split the arg and set it either as
      // just a key, or as a key-value pair
      if (argKey && argValue) {
        app.commandLine.appendSwitch(argKey.substr(2), argValue);
      } else {
        app.commandLine.appendSwitch(argKey);
      }
      logger.info(
        `Appended chrome command line switch ${argKey} with value ${argValue}`,
      );
    }
  });
};

/**
 * Sets default session properties
 */
export const setSessionProperties = () => {
  logger.info(`chrome-flags: Settings session properties`);
  const { customFlags } = config.getConfigFields(['customFlags']) as IConfig;

  if (
    session.defaultSession &&
    customFlags &&
    customFlags.authServerWhitelist &&
    customFlags.authServerWhitelist !== ''
  ) {
    session.defaultSession.allowNTLMCredentialsForDomains(
      customFlags.authServerWhitelist,
    );
  }
};
