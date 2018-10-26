import AutoLaunch = require('auto-launch');

import { isMac } from '../common/env';
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
     * Enable auto launch
     *
     * @return {Promise<void>}
     */
    public async enableAutoLaunch(): Promise<void> {
        // log.send(logLevels.INFO, `Enabling auto launch!`);
        return await this.enable();
    }

    /**
     * Disable auto launch
     *
     * @return {Promise<void>}
     */
    public async disableAutoLaunch(): Promise<void> {
        // log.send(logLevels.INFO, `Disabling auto launch!`);
        return await this.disable();
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