import { app } from 'electron';

import getCmdLineArg from '../common/get-command-line-args';
import { isDevEnv } from '../common/mics';
import { cleanUpAppCache, createAppCacheFile } from './app-cache-handler';
import { autoLaunchInstance } from './auto-launch-controller';
import setChromeFlags from './chrome-flags';
import { config } from './config-handler';
import { windowHandler } from './window-handler';

const allowMultiInstance: string | boolean = getCmdLineArg(process.argv, '--multiInstance', true) || isDevEnv;
const singleInstanceLock: boolean = allowMultiInstance ? false : app.requestSingleInstanceLock();

if (!singleInstanceLock) {
    app.quit();
} else {
    main();
}

async function main() {
    await appReady();
    createAppCacheFile();
    windowHandler.showLoadingScreen();
    windowHandler.createApplication();

    if (config.isFirstTimeLaunch()) {
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

async function appReady(): Promise<any> {
    await new Promise((res) => app.once('ready', res));
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