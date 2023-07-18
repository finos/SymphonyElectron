import { logger } from '../common/logger';
import { RegistryStore } from './stores/registry-store';

enum RegistryValueType {
  REG_SZ = 'REG_SZ',
}

const CHANNEL_NEST_LOCATION = '\\SOFTWARE\\Policies\\Symphony\\Update';
const CHANNEL_KEY = 'channel';

export const retrieveWindowsRegistry = async (): Promise<string> => {
  const Registry = require('winreg');
  const registryLocalStore = RegistryStore;
  const fetchLogic = (err, channel) => {
    if (err) {
      logger.info('registry-handler: error occurred. Details: ', err);

      return 'An error has occurred';
    } else {
      if (channel.type === RegistryValueType.REG_SZ) {
        registryLocalStore.setRegistry({ currentChannel: channel.value });
        logger.info(
          'registry-handler: value retrieved successfully, send to Registry Store',
        );

        return channel.value;
      } else {
        logger.info(
          'registry-handler: the value was looked for did not exist or its VALUE_TYPE is incorrect',
        );

        return 'Key Value doesnt exist';
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

  return regKeyUser.get(CHANNEL_KEY, (error, channel) => {
    if (error && !channel) {
      regKeyLocal.get(CHANNEL_KEY, (err, localChannel) => {
        return fetchLogic(err, localChannel);
      });
    } else if (channel.type === RegistryValueType.REG_SZ) {
      registryLocalStore.setRegistry({ currentChannel: channel.value });
      logger.info(
        'registry-handler: value retrieved successfully, send to Registry Store',
      );

      return channel;
    }
  });
};
