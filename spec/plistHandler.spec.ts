import { getAllUserDefaults } from '../src/app/plist-handler';

jest.mock('../src/app/config-handler', () => {
  return {
    ConfigFieldsDefaultValues: {},
    CloudConfigDataTypes: {
      NOT_SET: 'NOT_SET',
      ENABLED: 'ENABLED',
      DISABLED: 'DISABLED',
    },
    config: {
      getConfigFields: jest.fn(() => {
        return {
          minimizeOnClose: 'ENABLED',
          launchOnStartup: 'ENABLED',
          alwaysOnTop: 'ENABLED',
          isAlwaysOnTop: 'ENABLED',
          bringToFront: 'ENABLED',
          devToolsEnabled: true,
        };
      }),
      getGlobalConfigFields: jest.fn(() => {
        return {
          devToolsEnabled: true,
        };
      }),
      getFilteredCloudConfigFields: jest.fn(() => {
        return {
          devToolsEnabled: true,
        };
      }),
      getCloudConfigFields: jest.fn(() => {
        return {
          devToolsEnabled: true,
        };
      }),
      updateUserConfig: jest.fn(),
    },
  };
});

describe('Plist Handler', () => {
  it('should return config object', () => {
    expect(getAllUserDefaults()).toStrictEqual({
      alwaysOnTop: undefined,
      autoLaunchPath: undefined,
      autoUpdateChannel: undefined,
      autoUpdateCheckInterval: undefined,
      autoUpdateUrl: undefined,
      betaAutoUpdateChannelEnabled: undefined,
      bringToFront: undefined,
      browserLoginAutoConnect: undefined,
      browserLoginRetryTimeout: undefined,
      customFlags: {
        authNegotiateDelegateWhitelist: undefined,
        authServerWhitelist: undefined,
        disableThrottling: undefined,
      },
      contextIsolation: undefined,
      contextOriginUrl: undefined,
      ctWhitelist: undefined,
      devToolsEnabled: undefined,
      disableGpu: undefined,
      enableBrowserLogin: undefined,
      enableRendererLogs: undefined,
      forceAutoUpdate: undefined,
      isAutoUpdateEnabled: undefined,
      isCustomTitleBar: undefined,
      isPodUrlEditable: undefined,
      launchOnStartup: undefined,
      memoryRefresh: undefined,
      memoryThreshold: undefined,
      minimizeOnClose: undefined,
      notificationSettings: {
        display: undefined,
        position: undefined,
      },
      overrideUserAgent: undefined,
      permissions: {
        fullscreen: undefined,
        geolocation: undefined,
        media: undefined,
        midiSysex: undefined,
        notifications: undefined,
        openExternal: undefined,
        pointerLock: undefined,
      },
      podWhitelist: undefined,
      url: undefined,
      userDataPath: undefined,
      whitelistUrl: undefined,
      chromeFlags: undefined,
      latestAutoUpdateChannelEnabled: undefined,
    });
  });
});
