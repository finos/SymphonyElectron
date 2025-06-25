import { logger } from '../common/logger';
import { EChannelRegistry, RegistryStore } from './stores/registry-store';

enum RegistryValueType {
  REG_SZ = 'REG_SZ',
}

const CHANNEL_NEST_LOCATION = '\\SOFTWARE\\Policies\\Symphony\\Update';
const CHANNEL_KEY = 'channel';
const REGISTRY_TIMEOUT_MS = 500; // 5ms

export const retrieveWindowsRegistry = async (): Promise<string> => {
  const Registry = require('winreg');
  const registryLocalStore = RegistryStore;
  const fetchLogic = (err, channel) => {
    if (err || !channel) {
      logger.error('registry-handler: error occurred. Details: ', err);

      return '';
    } else {
      if (channel?.type === RegistryValueType.REG_SZ) {
        registryLocalStore.setRegistry({ currentChannel: channel.value });
        logger.info(
          'registry-handler: value retrieved successfully, send to Registry Store',
        );
        return channel.value;
      } else {
        logger.info(
          'registry-handler: the value was looked for did not exist or its VALUE_TYPE is incorrect',
        );
        return '';
      }
    }
  };

  const regKeyLocal = new Registry({
    hive: Registry.HKLM,
    key: CHANNEL_NEST_LOCATION,
  });

  const regKeyUser = new Registry({
    hive: Registry.HKCU,
    key: CHANNEL_NEST_LOCATION,
  });

  const registryPromise = new Promise<string>((resolve) => {
    regKeyUser.get(CHANNEL_KEY, (error, channel) => {
      if (
        error ||
        ![EChannelRegistry.BETA, EChannelRegistry.LATEST].includes(
          channel?.value,
        )
      ) {
        logger.error('registry-handler: error occurred. Details: ', error);

        regKeyLocal.get(CHANNEL_KEY, (err, localChannel) => {
          resolve(fetchLogic(err, localChannel));
        });
      } else if (channel.type === RegistryValueType.REG_SZ) {
        logger.info(
          'registry-handler: value retrieved successfully, send to Registry Store',
        );
        registryLocalStore.setRegistry({ currentChannel: channel.value });
        resolve(channel.value);
      }
    });
  });

  const timeoutPromise = new Promise<string>((resolve) => {
    setTimeout(() => {
      logger.warn(
        `registry-handler: Registry retrieval timed out after ${
          REGISTRY_TIMEOUT_MS / 1000
        } seconds.`,
      );
      resolve('');
    }, REGISTRY_TIMEOUT_MS);
  });

  return Promise.race([registryPromise, timeoutPromise]);
};
