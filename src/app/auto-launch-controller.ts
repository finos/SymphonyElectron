import AutoLaunch = require('auto-launch');
import { app, LoginItemSettings } from 'electron';

import { isMac } from '../common/env';
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

class AutoLaunchController {

    /**
     * Enable auto launch and displays error dialog on failure
     *
     * @return {Promise<void>}
     */
    public enableAutoLaunch(): void {
        app.setLoginItemSettings({ openAtLogin: true, path: props.path });
        logger.info(`auto-launch-controller: Enabled auto launch!`);
    }

    /**
     * Disable auto launch and displays error dialog on failure
     *
     * @return {Promise<void>}
     */
    public disableAutoLaunch(): void {
        app.setLoginItemSettings({ openAtLogin: false, path: props.path });
        logger.info(`auto-launch-controller: Disabled auto launch!`);
    }

    /**
     * Checks if auto launch is enabled
     *
     * @return {Boolean}
     */
    public isAutoLaunchEnabled(): LoginItemSettings {
        return app.getLoginItemSettings();
    }

    /**
     * Validates the user config and enables auto launch
     */
    public async handleAutoLaunch(): Promise<void> {
        const { launchOnStartup }: IConfig = config.getConfigFields([ 'launchOnStartup' ]);
        const { openAtLogin: isAutoLaunchEnabled }: LoginItemSettings = this.isAutoLaunchEnabled();

        if (isMac) {
            // TODO: Remove this method in the future
            await this.removeOldLaunchAgent();
        }

        if (typeof launchOnStartup === 'boolean' && launchOnStartup) {
            if (!isAutoLaunchEnabled) {
                this.enableAutoLaunch();
            }
            return;
        }
        if (isAutoLaunchEnabled) {
            this.disableAutoLaunch();
        }
    }

    /**
     * Removes old Symphony launch agent if exists
     *
     * @deprecated
     */
    private async removeOldLaunchAgent(): Promise<void> {
        const autoLaunch = new AutoLaunch(props);
        try {
            await autoLaunch.disable();
            logger.info(`auto-launch-controller: Old Symphony launch agent has been successfully removed`);
        } catch (e) {
            logger.error(`auto-launch-controller: Old Symphony launch agent failed to remove ${e}`);
        }
    }
}

const autoLaunchInstance = new AutoLaunchController();

export {
    autoLaunchInstance,
};
