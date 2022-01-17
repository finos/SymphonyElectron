import { enumerateValues, HKEY, RegistryValueType } from 'registry-js';

export const getCitrixMediaRedirectionStatus = ():
  | 'inactive'
  | 'supported'
  | 'unsupported' => {
  const values = enumerateValues(
    HKEY.HKEY_CURRENT_USER,
    'Software\\Citrix\\HDXMediaStream',
  );

  for (const value of values) {
    if (value.name === 'MSTeamsRedirectionSupport') {
      if (value.type === RegistryValueType.REG_DWORD && value.data === 1) {
        return 'supported';
      } else {
        return 'unsupported';
      }
    }
  }

  return 'inactive';
};
