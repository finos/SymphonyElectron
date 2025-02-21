import { IConfig } from '../app/config-handler';

export const ConfigFieldsDefaultValues: Partial<IConfig> = {
  isPodUrlEditable: true,
  forceAutoUpdate: false,
  enableBrowserLogin: false,
  browserLoginAutoConnect: false,
  latestAutoUpdateChannelEnabled: true,
  betaAutoUpdateChannelEnabled: true,
  browserLoginRetryTimeout: '5',
};
