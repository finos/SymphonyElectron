import { app, LoginItemSettings } from 'electron';

import { isMac } from '../common/env';
import { logger } from '../common/logger';
import { CloudConfigDataTypes, config, IConfig } from './config-handler';

const { autoLaunchPath }: IConfig = config.getConfigFields([ 'autoLaunchPath' ]);

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

        if (launchOnStartup === CloudConfigDataTypes.ENABLED) {
            if (!isAutoLaunchEnabled) {
                this.enableAutoLaunch();
            }
            return;
        }
        if (isAutoLaunchEnabled) {
            this.disableAutoLaunch();
        }
    }

}

const autoLaunchInstance = new AutoLaunchController();

export {
    autoLaunchInstance,
};
