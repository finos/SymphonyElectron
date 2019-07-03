import { powerSaveBlocker } from 'electron';
import { logger } from '../common/logger';
import { config, IConfig } from './config-handler';

export const handlePerformanceSettings = () => {
    const { customFlags } = config.getGlobalConfigFields([ 'customFlags' ]) as IConfig;

    if (customFlags.disableThrottling) {
        logger.info(`perf-handler: Disabling power throttling!`);
        powerSaveBlocker.start('prevent-display-sleep');
        return;
    }

    logger.info(`perf-handler: Power throttling enabled as config is not set to override power throttling!`);
};
