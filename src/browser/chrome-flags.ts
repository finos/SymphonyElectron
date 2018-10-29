import { app } from 'electron';

import { isDevEnv } from '../common/env';
import { getCommandLineArgs } from '../common/utils';
import { config, IConfig } from './config-handler';

/**
 * Sets chrome flags
 */
export default function setChromeFlags() {
    const { customFlags } = config.getGlobalConfigFields([ 'customFlags' ]) as IConfig;

    const configFlags: object = {
        'auth-negotiate-delegate-whitelist': customFlags.authServerWhitelist,
        'auth-server-whitelist': customFlags.authNegotiateDelegateWhitelist,
        'disable-background-timer-throttling': 'true',
        'disable-d3d11': customFlags.disableGpu || null,
        'disable-gpu': customFlags.disableGpu || null,
        'disable-gpu-compositing': customFlags.disableGpu || null,
    };

    for (const key in configFlags) {
        if (!Object.prototype.hasOwnProperty.call(configFlags, key)) {
            continue;
        }
        if (key && configFlags[key]) {
            app.commandLine.appendSwitch(key, configFlags[key]);
        }
    }

    if (isDevEnv) {
        const chromeFlagsFromCmd = getCommandLineArgs(process.argv, '--chrome-flags=', false);
        if (!chromeFlagsFromCmd) {
            return;
        }

        const chromeFlagsArgs = chromeFlagsFromCmd.substr(15);
        if (!chromeFlagsArgs) {
            return;
        }

        const flags = chromeFlagsArgs.split(',');
        if (!flags || !Array.isArray(flags)) {
            return;
        }

        for (const key in flags) {

            if (!Object.prototype.hasOwnProperty.call(flags, key)) {
                continue;
            }

            if (!flags[key]) {
                return;
            }

            const flagArray = flags[key].split(':');

            if (flagArray && Array.isArray(flagArray) && flagArray.length > 0) {
                const chromeFlagKey = flagArray[0];
                const chromeFlagValue = flagArray[1];
                app.commandLine.appendSwitch(chromeFlagKey, chromeFlagValue);
            }
        }
    }
}