import { app, systemPreferences } from 'electron';
import * as electronDownloader from 'electron-dl';
import * as shellPath from 'shell-path';

import { isDevEnv, isElectronQA, isLinux, isMac } from '../common/env';
import { logger } from '../common/logger';
import { getCommandLineArgs } from '../common/utils';
import { cleanUpAppCache, createAppCacheFile } from './app-cache-handler';
import { autoLaunchInstance } from './auto-launch-controller';
import { setChromeFlags, setSessionProperties } from './chrome-flags';
import { config } from './config-handler';
import './dialog-handler';
import './main-api-handler';
import { handlePerformanceSettings } from './perf-handler';
import { protocolHandler } from './protocol-handler';
import { ICustomBrowserWindow, windowHandler } from './window-handler';

// Set automatic period substitution to false because of a bug in draft js on the client app
// See https://perzoinc.atlassian.net/browse/SDA-2215 for more details
if (isMac) {
    systemPreferences.setUserDefault('NSAutomaticPeriodSubstitutionEnabled', 'string', 'false');
}

logger.info(`App started with the args ${JSON.stringify(process.argv)}`);

const allowMultiInstance: string | boolean = getCommandLineArgs(process.argv, '--multiInstance', true) || isDevEnv;
let isAppAlreadyOpen: boolean = false;

// Setting the env path child_process issue https://github.com/electron/electron/issues/7688
(async () => {
    try {
        const paths = await shellPath();
        if (paths) {
            return process.env.PATH = paths;
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

// Need this to prevent blank pop-out from 8.x versions
// Refer - SDA-1877 - https://github.com/electron/electron/issues/18397
if (!isElectronQA) {
    app.allowRendererProcessReuse = true;
}

// Electron sets the default protocol
if (!isDevEnv) {
    app.setAsDefaultProtocolClient('symphony');
}

let oneStart = false;

/**
 * Main function that initialises the application
 */
const startApplication = async () => {
    if (config.isFirstTimeLaunch()) {
        logger.info(`main: This is a first time launch! will update config and handle auto launch`);
        await config.setUpFirstTimeLaunch();
        if (!isLinux) {
            await autoLaunchInstance.handleAutoLaunch();
        }
    }
    await app.whenReady();
    if (oneStart) {
        return;
    }

    logger.info('main: app is ready, performing initial checks oneStart: ' + oneStart);
    oneStart = true;
    createAppCacheFile();
    setSessionProperties();
    await windowHandler.createApplication();
    logger.info(`main: created application`);
};

// Handle multiple/single instances
if (!allowMultiInstance) {
    logger.info('main: Multiple instances are not allowed, requesting lock', { allowMultiInstance });
    const gotTheLock = app.requestSingleInstanceLock();

    // quit if another instance is already running, ignore for dev env or if app was started with multiInstance flag
    if (!gotTheLock) {
        logger.info(`main: got the lock hence closing the new instance`, { gotTheLock });
        app.exit();
    } else {
        logger.info(`main: Creating the first instance of the application`);
        app.on('second-instance', (_event, argv) => {
            // Someone tried to run a second instance, we should focus our window.
            logger.info(`main: We've got a second instance of the app, will check if it's allowed and exit if not`);
            const mainWindow = windowHandler.getMainWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
                if (isMac) {
                    logger.info(`main: We are on mac, so, showing the existing window`);
                    return mainWindow.show();
                }
                if (mainWindow.isMinimized()) {
                    logger.info(`main: our main window is minimised, will restore it!`);
                    mainWindow.restore();
                }
                mainWindow.focus();
                isAppAlreadyOpen = true;
                protocolHandler.processArgv(argv, isAppAlreadyOpen);
            }
        });
        startApplication();
    }
} else {
    logger.info(`main: multi instance allowed, creating second instance`, { allowMultiInstance });
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
    cleanUpAppCache();
});

/**
 * Cleans up reference before quiting
 */
app.on('before-quit', () => windowHandler.willQuitApp = true);

/**
 * Is triggered when the application is launched
 * or clicking the application's dock or taskbar icon
 *
 * This event is emitted only on macOS at this moment
 */
app.on('activate', () => {
    const mainWindow: ICustomBrowserWindow | null = windowHandler.getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) {
        logger.info(`main: main window not existing or destroyed, creating a new instance of the main window!`);
        startApplication();
        return;
    }
    logger.info(`main: activating & showing main window now!`);
    mainWindow.show();
});

/**
 * Validates and Sends protocol action
 *
 * This event is emitted only on macOS at this moment
 */
app.on('open-url', (_event, url) => {
    logger.info(`main: we got a protocol request with url ${url}! processing the request!`);
    protocolHandler.sendProtocol(url);
});
