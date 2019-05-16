import { app } from 'electron';
import { logger } from '../common/logger';
import { getCommandLineArgs } from '../common/utils';
import { config, IConfig } from './config-handler';

/**
 * Sets chrome flags
 */
export const setChromeFlags = () => {
    logger.info(`chrome-flags: Checking if we need to set chrome flags!`);
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
        const val = configFlags[key];
        if (key && val) {
            logger.info(`chrome-flags: Setting chrome flag for ${key} with value ${val}!`);
            app.commandLine.appendSwitch(key, val);
        }
    }

    logger.info(`chrome-flags: Checking to see if we have any flags passsed from command line!`);
    const chromeFlagsFromCmd = getCommandLineArgs(process.argv, '--chrome-flags=', false);
    if (!chromeFlagsFromCmd) {
        logger.info(`chrome-flags: No flags passed from command line, returning`);
        return;
    }

    const chromeFlagsArgs = chromeFlagsFromCmd.substr(15);
    logger.info(`chrome-flags: Command line args passed as ${chromeFlagsArgs}`);
    if (!chromeFlagsArgs) {
        logger.info(`chrome-flags: Not a valid set of args passed through command line for setting chrome flags, returning`);
        return;
    }

    const flags = chromeFlagsArgs.split(',');
    logger.info(`chrome-flags: Flags we have are ${flags}`);
    if (!flags || !Array.isArray(flags)) {
        logger.info(`chrome-flags: Empty set of flags passed! returning`);
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
            logger.info(`chrome-flags: Setting chrome flag from command line for key ${chromeFlagKey} and value ${chromeFlagValue}`);
            app.commandLine.appendSwitch(chromeFlagKey, chromeFlagValue);
        }
    }
};
