import { app } from 'electron';

import { buildNumber, clientVersion, version } from '../../package.json';
import { isDevEnv, isMac } from '../common/env';
import { logger } from '../common/logger';
import { getCommandLineArgs } from '../common/utils';
import { cleanUpAppCache, createAppCacheFile } from './app-cache-handler';
import { autoLaunchInstance } from './auto-launch-controller';
import { setChromeFlags } from './chrome-flags';
import { config } from './config-handler';
import './dialog-handler';
import './main-api-handler';
import { protocolHandler } from './protocol-handler';
import { ICustomBrowserWindow, windowHandler } from './window-handler';

const allowMultiInstance: string | boolean = getCommandLineArgs(process.argv, '--multiInstance', true) || isDevEnv;

// on windows, we create the protocol handler via the installer
// because electron leaves registry traces upon uninstallation
if (isMac) {
    // Sets application version info that will be displayed in about app panel
    app.setAboutPanelOptions({ applicationVersion: `${clientVersion}-${version}`, version: buildNumber });
}

// Electron sets the default protocol
app.setAsDefaultProtocolClient('symphony');

/**
 * Main function that init the application
 */
const startApplication = async () => {
    await app.whenReady();
    createAppCacheFile();
    windowHandler.createApplication();

    if (config.isFirstTimeLaunch()) {
        logger.info('first time launch');
        await config.setUpFirstTimeLaunch();

        /**
         * Enables or disables auto launch base on user settings
         */
        await autoLaunchInstance.handleAutoLaunch();
    }

    /**
     * Sets chrome flags from global config
     */
    setChromeFlags();
};

// Handle multiple/single instances
if (!allowMultiInstance) {
    logger.info('main: Multiple instance not allowed requesting lock', { allowMultiInstance });
    const gotTheLock = app.requestSingleInstanceLock();

    // quit if another instance is already running, ignore for dev env or if app was started with multiInstance flag
    if (!gotTheLock) {
        logger.info('main: Got the lock hence closing the instance', { gotTheLock });
        app.quit();
    } else {
        logger.info('main: Creating the first instance of the application');
        app.on('second-instance', (_event, argv) => {
            // Someone tried to run a second instance, we should focus our window.
            const mainWindow = windowHandler.getMainWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
                if (isMac) {
                    return mainWindow.show();
                }
                if (mainWindow.isMinimized()) {
                    mainWindow.restore();
                }
                mainWindow.focus();
                protocolHandler.processArgv(argv);
            }
        });
        startApplication();
    }
} else {
    logger.info('main: Multiple instance allowed hence create application', { allowMultiInstance });
    startApplication();
}

/**
 * Is triggered when all the windows are closed
 * In which case we quit the app
 */
app.on('window-all-closed', () => app.quit());

/**
 * Creates a new empty cache file when the app is quit
 */
app.on('quit',  () => cleanUpAppCache());

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
        startApplication();
        return;
    }
    mainWindow.show();
});

/**
 * Validates and Sends protocol action
 *
 * This event is emitted only on macOS at this moment
 */
app.on('open-url', (_event, url) => protocolHandler.sendProtocol(url));
