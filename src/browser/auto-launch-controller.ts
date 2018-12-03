import AutoLaunch = require('auto-launch');
import { BrowserWindow, dialog } from 'electron';

import { isMac } from '../common/env';
import { i18n } from '../common/i18n';
import { logger } from '../common/logger';
import { config, IConfig } from './config-handler';

const { autoLaunchPath }: IConfig = config.getGlobalConfigFields([ 'autoLaunchPath' ]);

const props = isMac ? {
    mac: {
        useLaunchAgent: true,
    },
    name: 'Symphony',
    path: process.execPath,
} : {
    name: 'Symphony',
    path: autoLaunchPath
        ? autoLaunchPath.replace(/\//g, '\\')
        : null || process.execPath,
};

export interface IAutoLaunchOptions {
    name: string;
    path?: string;
    isHidden?: boolean;
    mac?: {
        useLaunchAgent?: boolean;
    };
}

class AutoLaunchController extends AutoLaunch {

    constructor(opts: IAutoLaunchOptions) {
        super(opts);
    }

    /**
     * Enable auto launch and displays error dialog on failure
     *
     * @return {Promise<void>}
     */
    public async enableAutoLaunch(): Promise<void> {
        logger.info(`Enabling auto launch!`);
        const focusedWindow = BrowserWindow.getFocusedWindow();
        await this.enable()
            .catch((err) => {
                const title = 'Error setting AutoLaunch configuration';
                logger.error(`auto-launch-controller: ${title}: failed to enable auto launch error: ${err}`);
                if (focusedWindow && !focusedWindow.isDestroyed()) {
                    dialog.showMessageBox(focusedWindow, {
                        message: i18n.t(title) + ': ' + err,
                        title: i18n.t(title),
                        type: 'error',
                    });
                }
            });
    }

    /**
     * Disable auto launch and displays error dialog on failure
     *
     * @return {Promise<void>}
     */
    public async disableAutoLaunch(): Promise<void> {
        logger.info(`Disabling auto launch!`);
        const focusedWindow = BrowserWindow.getFocusedWindow();
        await this.disable()
            .catch((err) => {
            const title = 'Error setting AutoLaunch configuration';
            logger.error(`auto-launch-controller: ${title}: failed to disable auto launch error: ${err}`);
            if (focusedWindow && !focusedWindow.isDestroyed()) {
                dialog.showMessageBox(focusedWindow, {
                    message: i18n.t(title) + ': ' + err,
                    title: i18n.t(title),
                    type: 'error',
                });
            }
        });
    }

    /**
     * Checks if auto launch is enabled
     *
     * @return {Boolean}
     */
    public async isAutoLaunchEnabled(): Promise<boolean> {
        return await this.isEnabled();
    }

    /**
     * Validates the user config and enables auto launch
     */
    public async handleAutoLaunch(): Promise<void> {
        const { launchOnStartup }: IConfig = config.getConfigFields([ 'launchOnStartup' ]);

        if (typeof launchOnStartup === 'boolean' && launchOnStartup) {
            if (await !this.isAutoLaunchEnabled()) {
                await this.enableAutoLaunch();
            }
        } else {
            if (await this.isAutoLaunchEnabled()) {
                await this.disableAutoLaunch();
            }
        }
    }
}

const autoLaunchInstance = new AutoLaunchController(props);

export {
    autoLaunchInstance,
};