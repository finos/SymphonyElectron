import { isWindowsOS } from '../common/env';
import { logger } from '../common/logger';

export enum RedirectionStatus {
  /**
   * Citrix virtual environment is not active
   */
  INACTIVE = 'inactive',

  /**
   * Citrix virtual environment is active and media redirection is supported
   */
  SUPPORTED = 'supported',

  /**
   * Citrix virtual environment is active but media redirection is not supported
   */
  UNSUPPORTED = 'unsupported',
}

export enum RegistryValueType {
  REG_DWORD = 'REG_DWORD',
}

const CITRIX_REGISTRY_KEY = '\\Software\\Citrix\\HDXMediaStream';
const CITRIX_REGISTRY_KEY_NAME = 'MSTeamsRedirSupport';

export const getCitrixMediaRedirectionStatus = async (): Promise<RedirectionStatus> => {
  if (!isWindowsOS) {
    // Citrix virtual environments are not supported on non-Windows OSes
    return RedirectionStatus.INACTIVE;
  }
  const Registry = require('winreg');

  const regKey = new Registry({
    hive: Registry.HKCU,
    key: CITRIX_REGISTRY_KEY,
  });

  return new Promise((resolve, _reject) => {
    regKey.get(CITRIX_REGISTRY_KEY_NAME, (err, redirectionSupportItem) => {
      if (err) {
        logger.info('citrix-handler: error occurred. Details: ', err);
        resolve(RedirectionStatus.INACTIVE);
      } else {
        if (!redirectionSupportItem) {
          resolve(RedirectionStatus.INACTIVE);
        }
        if (redirectionSupportItem.type === 'REG_DWORD') {
          const redirectionSupportValue = parseInt(
            redirectionSupportItem.value,
            16,
          );
          if (redirectionSupportValue === 1) {
            resolve(RedirectionStatus.SUPPORTED);
          } else {
            resolve(RedirectionStatus.UNSUPPORTED);
          }
        } else {
          resolve(RedirectionStatus.UNSUPPORTED);
        }
      }
    });
  });
};
