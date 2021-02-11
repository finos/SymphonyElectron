import { powerSaveBlocker } from 'electron';
import { logger } from '../common/logger';
import { CloudConfigDataTypes, config, IConfig } from './config-handler';

export const handlePerformanceSettings = () => {
  const { customFlags } = config.getCloudConfigFields([
    'customFlags',
  ]) as IConfig;
  const { disableThrottling } = config.getCloudConfigFields([
    'disableThrottling',
  ]) as any;

  if (
    (customFlags &&
      customFlags.disableThrottling === CloudConfigDataTypes.ENABLED) ||
    disableThrottling === CloudConfigDataTypes.ENABLED
  ) {
    logger.info(`perf-handler: Disabling power throttling!`);
    powerSaveBlocker.start('prevent-display-sleep');
    return;
  }

  logger.info(
    `perf-handler: Power throttling enabled as config is not set to override power throttling!`,
  );
};
