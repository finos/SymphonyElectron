import { enumerateValues, HKEY, RegistryValueType } from 'registry-js';
import { isWindowsOS } from '../common/env';

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

export const getCitrixMediaRedirectionStatus = (): RedirectionStatus => {
  if (!isWindowsOS) {
    // Citrix virtual environments are not supported on non-Windows OSes
    return RedirectionStatus.INACTIVE;
  }

  const values = enumerateValues(
    HKEY.HKEY_CURRENT_USER,
    'Software\\Citrix\\HDXMediaStream',
  );

  for (const value of values) {
    if (value.name === 'MSTeamsRedirectionSupport') {
      if (value.type === RegistryValueType.REG_DWORD && value.data === 1) {
        return RedirectionStatus.SUPPORTED;
      } else {
        return RedirectionStatus.UNSUPPORTED;
      }
    }
  }

  return RedirectionStatus.INACTIVE;
};
