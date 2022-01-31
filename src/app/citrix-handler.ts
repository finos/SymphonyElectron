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

  try {
    const { GetStringRegKey } = require('@vscode/windows-registry');
    const value = GetStringRegKey(
      'HKEY_CURRENT_USER',
      'Software\\Citrix\\HDXMediaStream',
      'MSTeamsRedirectionSupport',
    );
    if (
      value !== undefined &&
      value.length === 1 &&
      value.charCodeAt(0) === 1
    ) {
      return RedirectionStatus.SUPPORTED;
    } else {
      return RedirectionStatus.UNSUPPORTED;
    }
  } catch (e) {
    // If the key does not exist, the function throws
    return RedirectionStatus.INACTIVE;
  }
};
