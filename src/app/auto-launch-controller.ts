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
        logger.info(`Enabling auto launch!`);
        app.setLoginItemSettings({ openAtLogin: true, path: props.path });
    }

    /**
     * Disable auto launch and displays error dialog on failure
     *
     * @return {Promise<void>}
     */
    public disableAutoLaunch(): void {
        logger.info(`Disabling auto launch!`);
        app.setLoginItemSettings({ openAtLogin: false, path: props.path });
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

        console.log(this.isAutoLaunchEnabled());

        if (typeof launchOnStartup === 'boolean' && launchOnStartup) {
            if (!isAutoLaunchEnabled) {
                this.enableAutoLaunch();
            }
            return;
        }
        console.log(`Auto launch enabled!! ${isAutoLaunchEnabled}`)
        if (isAutoLaunchEnabled) {
            this.disableAutoLaunch();
        }
    }
}

const autoLaunchInstance = new AutoLaunchController();

export {
    autoLaunchInstance,
};
