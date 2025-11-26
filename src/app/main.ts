import { app, systemPreferences } from 'electron';
import * as electronDownloader from 'electron-dl';

import { isDevEnv, isLinux, isMac, isWindowsOS } from '../common/env';
import { logger } from '../common/logger';
import { getCommandLineArgs } from '../common/utils';
import { cleanUpAppCache, createAppCacheFile } from './app-cache-handler';
import { setChromeFlags, setSessionProperties } from './chrome-flags';
import { config } from './config-handler';
import './dialog-handler';
import { displayMediaRequestHandler } from './display-media-request-handler';
import './main-api-handler';
import { handlePerformanceSettings } from './perf-handler';
import { protocolHandler } from './protocol-handler';
import { ICustomBrowserWindow, windowHandler } from './window-handler';

import { autoLaunchInstance } from './auto-launch-controller';
import { autoUpdate } from './auto-update-handler';
import { presenceStatus } from './presence-status-handler';
import { presenceStatusStore } from './stores';

// Set automatic period substitution to false because of a bug in draft js on the client app
// See https://perzoinc.atlassian.net/browse/SDA-2215 for more details
if (isMac) {
  systemPreferences.setUserDefault(
    'NSAutomaticPeriodSubstitutionEnabled',
    'string',
    'false',
  );
}

logger.info(`App started with the args ${JSON.stringify(process.argv)}`);

try {
  const detectedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const customTimezoneArgs: string | null = getCommandLineArgs(
    process.argv,
    '--custom-timezone',
    false,
  );
  const customTimezone =
    customTimezoneArgs &&
    customTimezoneArgs.substring(customTimezoneArgs.indexOf('=') + 1);

  logger.info(
    `main: Environment diagnostics: timeZone=${detectedTimeZone}, customTimeZone=${
      customTimezone || ''
    }`,
  );
  // Enforce time zone for the Electron/Node environment
  logger.info(`main: current timezone`, process.env.TZ);
  const currentTz = process.env.TZ;

  if (customTimezone) {
    // Highest precedence: explicit custom timezone from CLI
    process.env.TZ = customTimezone;
    logger.info(
      `main: Time zone enforcement: set process.env.TZ from custom arg '--custom-timezone'='${customTimezone}' (was '${
        currentTz || ''
      }')`,
    );
  } else if (!detectedTimeZone && currentTz) {
    delete process.env.TZ;
    logger.info(
      `main: Time zone enforcement: unset process.env.TZ due to failed detection`,
    );
  } else if (detectedTimeZone && currentTz !== detectedTimeZone) {
    process.env.TZ = detectedTimeZone;
    logger.info(
      `main: Time zone enforcement: set process.env.TZ='${detectedTimeZone}' (was '${
        currentTz || ''
      }')`,
    );
  } else {
    logger.info(
      `main: Time zone enforcement: process.env.TZ already aligned ('${
        currentTz || ''
      }')`,
    );
  }
  logger.info(`main: post timezone `, process.env.TZ);
} catch (e) {
  logger.info(
    `main: Environment diagnostics: failed to detect system time zone`,
    e,
  );
  // As a safety, if detection throws and TZ is set, clear it so OS drives Chromium time zone
  if (process.env.TZ) {
    delete process.env.TZ;
    logger.info(
      `main: Time zone enforcement: unset process.env.TZ after detection failure`,
    );
  }
}

// Always ignore TZ on Windows
if (isWindowsOS && process.env.TZ) {
  logger.info(`main: deleting invalid TZ='${process.env.TZ}'`);
  delete process.env.TZ;
}

const allowMultiInstance: string | boolean =
  getCommandLineArgs(process.argv, '--multiInstance', true) || isDevEnv;
let isAppAlreadyOpen: boolean = false;

// Setting the env path child_process issue https://github.com/electron/electron/issues/7688
(async () => {
  try {
    const shellPath = await import('shell-path');
    const paths = await shellPath();
    if (paths) {
      return (process.env.PATH = paths);
    }
    if (isMac) {
      process.env.PATH = [
        './node_modules/.bin',
        '/usr/local/bin',
        process.env.PATH,
      ].join(':');
    }
  } catch (e) {
    if (isMac) {
      process.env.PATH = [
        './node_modules/.bin',
        '/usr/local/bin',
        process.env.PATH,
      ].join(':');
    }
  }
})();

electronDownloader();
handlePerformanceSettings();
setChromeFlags();

// Electron sets the default protocol
if (!isDevEnv) {
  const { userDataPath } = config.getConfigFields(['userDataPath']);
  if (userDataPath === '') {
    app.setAsDefaultProtocolClient('symphony');
  } else {
    app.setAsDefaultProtocolClient('symphony', process.execPath, [
      '--userDataPath="' + userDataPath + '"',
    ]);
  }
}

/**
 * Main function that initialises the application
 */
let oneStart = false;
const startApplication = async () => {
  // Validate user config before starting the application
  await config.initializeUserConfig();
  await config.readUserConfig();
  await config.checkFirstTimeLaunch();
  const isFirstTimeLaunch = config.isFirstTimeLaunch();
  if (isFirstTimeLaunch) {
    logger.info(
      `main: This is a first time launch! will update config and handle auto launch`,
    );
    await config.setUpFirstTimeLaunch();
    if (!isLinux) {
      await autoLaunchInstance.handleAutoLaunch();
    }
    config.writeUserConfig();
  }
  await app.whenReady();
  if (oneStart) {
    return;
  }

  logger.info(
    'main: app is ready, performing initial checks oneStart: ' + oneStart,
  );
  oneStart = true;
  createAppCacheFile();
  // Picks global config values and updates them in the user config
  await config.updateUserConfigOnStart();
  setSessionProperties();
  displayMediaRequestHandler.init();
  if (!isDevEnv) {
    await autoUpdate.init();
  }
  await windowHandler.createApplication();
  logger.info(`main: created application`);

  if (isDevEnv) {
    const { loadReactDevToolsExtension } = require('./extension-handler');
    await loadReactDevToolsExtension(logger);
  }
};

// Handle multiple/single instances
if (!allowMultiInstance) {
  logger.info('main: Multiple instances are not allowed, requesting lock', {
    allowMultiInstance,
  });
  const gotTheLock = app.requestSingleInstanceLock();

  // quit if another instance is already running, ignore for dev env or if app was started with multiInstance flag
  if (!gotTheLock) {
    logger.info(`main: got the lock hence closing the new instance`, {
      gotTheLock,
    });
    app.exit();
  } else {
    logger.info(`main: Creating the first instance of the application`);
    app.on('second-instance', (_event, argv) => {
      // Someone tried to run a second instance, we should focus our window.
      logger.info(
        `main: We've got a second instance of the app, will check if it's allowed and exit if not`,
      );
      const mainWindow = windowHandler.getMainWindow();
      const mainWebContents = windowHandler.getMainWebContents();
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (isMac) {
          logger.info(`main: We are on mac, so, showing the existing window`);
          return mainWindow.show();
        }
        if (!mainWindow.isVisible()) {
          mainWindow.setSkipTaskbar(false);
          mainWindow.isMinimized() ? mainWindow.restore() : mainWindow.show();
        }
        if (mainWindow.isMinimized()) {
          logger.info(`main: our main window is minimised, will restore it!`);
          mainWindow.restore();
        }
        mainWindow.focus();
        isAppAlreadyOpen = true;
        protocolHandler.processArgv(argv, isAppAlreadyOpen);
        if (mainWebContents && !mainWebContents.isDestroyed()) {
          mainWebContents.focus();
        }
        const presence = presenceStatus.myCurrentPresence;
        if (presence) {
          presenceStatus.setMyPresence(presence);
          const items = presenceStatus.createThumbarButtons();
          mainWindow?.setThumbarButtons(items);
        }
      }
    });
    startApplication();
  }
} else {
  logger.info(`main: multi instance allowed, creating second instance`, {
    allowMultiInstance,
  });
  startApplication();
}

/**
 * Is triggered when all the windows are closed
 * In which case we quit the app
 */
app.on('window-all-closed', () => {
  logger.info(`main: all windows are closed, quitting the app!`);
  app.quit();
});

/**
 * Creates a new empty cache file when the app is quit
 */
app.on('quit', () => {
  logger.info(`main: quitting the app!`);
  presenceStatusStore.destroyCurrentTray();
  cleanUpAppCache();
});

/**
 * Cleans up reference before quiting
 */
app.on('before-quit', () => (windowHandler.willQuitApp = true));

/**
 * Is triggered when the application is launched
 * or clicking the application's dock or taskbar icon
 *
 * This event is emitted only on macOS at this moment
 */
app.on('activate', () => {
  const mainWindow: ICustomBrowserWindow | null = windowHandler.getMainWindow();
  if (!mainWindow || mainWindow.isDestroyed()) {
    logger.info(
      `main: main window not existing or destroyed, creating a new instance of the main window!`,
    );
    startApplication();
    return;
  }
  logger.info(`main: activating & showing main window now!`);
  mainWindow.setSkipTaskbar(false);
  mainWindow.show();
});

/**
 * Validates and Sends protocol action
 *
 * This event is emitted only on macOS at this moment
 */
app.on('open-url', (_event, url) => {
  if (!url.includes('skey') && !url.includes('anticsrf')) {
    logger.info(
      `main: we got a protocol request with url ${url}! processing the request!`,
    );
  }
  protocolHandler.sendProtocol(url);
});
