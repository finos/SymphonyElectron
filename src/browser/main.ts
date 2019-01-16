import { app } from 'electron';

import { isDevEnv, isMac } from '../common/env';
import { logger } from '../common/logger';
import { getCommandLineArgs } from '../common/utils';
import { cleanUpAppCache, createAppCacheFile } from './app-cache-handler';
import { autoLaunchInstance } from './auto-launch-controller';
import { setChromeFlags } from './chrome-flags';
import { config } from './config-handler';
import './dialog-handler';
import './main-api-handler';
import { SpellChecker } from './spell-checker-handler';
import { ICustomBrowserWindow, windowHandler } from './window-handler';

const allowMultiInstance: string | boolean = getCommandLineArgs(process.argv, '--multiInstance', true) || isDevEnv;

/**
 * Main function that init the application
 */
const startApplication = async () => {
    await app.whenReady();
    const spellchecker = new SpellChecker();
    logger.info(`initialized spellchecker module with locale ${spellchecker.locale}`);
    createAppCacheFile();
    windowHandler.showLoadingScreen();
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
    logger.info('Multiple instance not allowed requesting lock', { allowMultiInstance });
    const gotTheLock = app.requestSingleInstanceLock();

    // quit if another instance is already running, ignore for dev env or if app was started with multiInstance flag
    if (!gotTheLock) {
        logger.info('Got the lock hence closing the instance', { gotTheLock });
        app.quit();
    } else {
        logger.info('Creating the first instance of the application');
        app.on('second-instance', (_event) => {
            // Someone tried to run a second instance, we should focus our window.
            const mainWindow = windowHandler.getMainWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
                if (isMac) return mainWindow.show();
                if (mainWindow.isMinimized()) {
                    mainWindow.restore();
                }
                mainWindow.focus();
                // TODO: Handle protocol action
            }
        });
        startApplication();
    }
} else {
    logger.info('Multiple instance allowed hence create application', { allowMultiInstance });
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

app.on('activate', () => {
    const mainWindow: ICustomBrowserWindow | null = windowHandler.getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) {
        startApplication();
    } else {
        mainWindow.show();
    }
});