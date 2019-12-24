import * as path from 'path';
import { Application, BasicAppSettings } from 'spectron';

export enum Timeouts {
    halfSec = 500,
    oneSec = 1000,
    fiveSec = 5000,
}

/**
 * Returns the electron executable path
 */
export const getElectronPath = (): string => {
    let electronPath = path.join(__dirname, '..', '..', '..', 'node_modules', '.bin', 'electron');
    if (process.platform === 'win32') {
        electronPath += '.cmd';
    }
    return electronPath;
};

/**
 * Returns the demo application html path
 */
export const getDemoFilePath = (): string => {
    return `file://${path.join(__dirname, '..', '..', '..', '/src/demo/index.html')}`;
};

/**
 * Returns app init file
 */
export const getArgs = (): string[] => {
    return [ path.join(__dirname, '..', '..', '/src/app/init.js') ];
};

/**
 * Stops the application
 * @param application
 */
export const stopApplication = async (application): Promise<Application | undefined> => {
    if (!application || !application.isRunning()) {
        return;
    }
    return await application.stop();
};

/**
 * Starts and returns the application instance
 * @param shouldLoadDemoApp {Boolean}
 * @param options {BasicAppSettings}
 */
export const startApplication = async (
    shouldLoadDemoApp: boolean = false,
    options: BasicAppSettings = {
        path: getElectronPath(),
        args: getArgs(),
    },
): Promise<Application> => {
    // loads demo page correctly
    if (shouldLoadDemoApp && options.args) {
        options.args.push(`. --url=file://${getDemoFilePath()}`);
    }
    const application = new Application(options);
    await application.start();
    return application;
};

/**
 * Sleep function for tests that needs to wait
 * @param ms
 */
export const sleep = (ms) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};
