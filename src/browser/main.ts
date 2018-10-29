import { app } from 'electron';

import { isDevEnv } from '../common/env';
import { logger } from '../common/logger';
import { getCommandLineArgs } from '../common/utils';
import { cleanUpAppCache, createAppCacheFile } from './app-cache-handler';
import { autoLaunchInstance } from './auto-launch-controller';
import setChromeFlags from './chrome-flags';
import { config } from './config-handler';
import { windowHandler } from './window-handler';

const allowMultiInstance: string | boolean = getCommandLineArgs(process.argv, '--multiInstance', true) || isDevEnv;
const singleInstanceLock: boolean = allowMultiInstance ? true : app.requestSingleInstanceLock();

if (!singleInstanceLock) {
    app.quit();
} else {
    main();
}

/**
 * Main function that init the application
 */
async function main() {
    await app.whenReady();
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