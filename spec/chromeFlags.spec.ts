import { setChromeFlags } from '../src/app/chrome-flags';
import { config } from '../src/app/config-handler';
import { isDevEnv, isLinux, isMac, isWindowsOS } from '../src/common/env';
import { app } from './__mocks__/electron';

jest.mock('../src/app/config-handler', () => {
  return {
    CloudConfigDataTypes: {
      NOT_SET: 'NOT_SET',
      ENABLED: 'ENABLED',
      DISABLED: 'DISABLED',
    },
    config: {
      getConfigFields: jest.fn(() => {
        return {
          customFlags: {
            authServerWhitelist: 'url',
            authNegotiateDelegateWhitelist: 'whitelist',
            disableThrottling: 'DISABLED',
          },
          disableGpu: true,
        };
      }),
      getCloudConfigFields: jest.fn(() => {
        return {
          disableThrottling: 'DISABLED',
        };
      }),
      getGlobalConfigFields: jest.fn(() => {
        return {
          disableThrottling: 'DISABLED',
        };
      }),
    },
  };
});

jest.mock('../src/common/utils', () => {
  return {
    getCommandLineArgs: jest.fn(),
    compareVersions: jest.fn(),
  };
});

jest.mock('electron-log');

describe('chrome flags', () => {
  beforeEach(() => {
    (isDevEnv as any) = false;
    (isMac as any) = true;
    (isWindowsOS as any) = false;
    (isLinux as any) = false;
    config.getConfigFields = jest.fn(() => {
      return {
        customFlags: {
          authServerWhitelist: 'url',
          authNegotiateDelegateWhitelist: 'whitelist',
        },
        disableGpu: true,
      };
    });
    jest.clearAllMocks();
  });

  it('should call `setChromeFlags` correctly', () => {
    const spy = jest.spyOn(app.commandLine, 'appendSwitch');
    setChromeFlags();
    expect(spy).nthCalledWith(
      1,
      'auth-negotiate-delegate-whitelist',
      'whitelist',
    );
    expect(spy).nthCalledWith(2, 'auth-server-whitelist', 'url');
    expect(spy).nthCalledWith(3, 'disable-background-timer-throttling', 'true');
    expect(spy).nthCalledWith(4, 'disable-d3d11', true);
    expect(spy).nthCalledWith(5, 'disable-gpu', true);
    expect(spy).nthCalledWith(6, 'disable-gpu-compositing', true);
  });

  it('should call `setChromeFlags` correctly when `disableGpu` is false', () => {
    config.getConfigFields = jest.fn(() => {
      return {
        customFlags: {
          authServerWhitelist: 'url',
          authNegotiateDelegateWhitelist: 'whitelist',
        },
      };
    });
    const spy = jest.spyOn(app.commandLine, 'appendSwitch');
    setChromeFlags();
    expect(spy).nthCalledWith(
      1,
      'auth-negotiate-delegate-whitelist',
      'whitelist',
    );
    expect(spy).nthCalledWith(2, 'auth-server-whitelist', 'url');
    expect(spy).nthCalledWith(3, 'disable-background-timer-throttling', 'true');
    expect(spy).not.nthCalledWith(4);
  });

  it('should set `disable-renderer-backgrounding` chrome flag correctly when cloud config is ENABLED', () => {
    config.getConfigFields = jest.fn(() => {
      return {
        customFlags: {
          authServerWhitelist: 'url',
          authNegotiateDelegateWhitelist: 'whitelist',
          disableGpu: false,
          disableThrottling: 'ENABLED',
        },
      };
    });
    const spy = jest.spyOn(app.commandLine, 'appendSwitch');
    setChromeFlags();
    expect(spy).nthCalledWith(6, 'disable-renderer-backgrounding', 'true');
    expect(spy).not.nthCalledWith(7);
  });

  it('should set `disable-renderer-backgrounding` chrome flag correctly when cloud config PMP setting is ENABLED', () => {
    config.getCloudConfigFields = jest.fn(() => {
      return {
        disableThrottling: 'ENABLED',
      };
    });
    const spy = jest.spyOn(app.commandLine, 'appendSwitch');
    setChromeFlags();
    expect(spy).nthCalledWith(8, 'disable-renderer-backgrounding', 'true');
    expect(spy).not.nthCalledWith(9);
  });

  it('should set `disable-renderer-backgrounding` chrome flag when any one is ENABLED ', () => {
    config.getConfigFields = jest.fn(() => {
      return {
        customFlags: {
          authServerWhitelist: 'url',
          authNegotiateDelegateWhitelist: 'whitelist',
          disableGpu: false,
          disableThrottling: 'DISABLED',
        },
      };
    });
    config.getCloudConfigFields = jest.fn(() => {
      return {
        disableThrottling: 'ENABLED',
      };
    });
    const spy = jest.spyOn(app.commandLine, 'appendSwitch');
    setChromeFlags();
    expect(spy).nthCalledWith(6, 'disable-renderer-backgrounding', 'true');
    expect(spy).not.nthCalledWith(7);
  });

  it('should set `disable-renderer-backgrounding` chrome flag when PMP is ENABLED', () => {
    config.getConfigFields = jest.fn(() => {
      return {
        customFlags: {
          authServerWhitelist: 'url',
          authNegotiateDelegateWhitelist: 'whitelist',
          disableGpu: false,
          disableThrottling: 'ENABLED',
        },
      };
    });
    config.getCloudConfigFields = jest.fn(() => {
      return {
        disableThrottling: 'DISABLED',
      };
    });
    const spy = jest.spyOn(app.commandLine, 'appendSwitch');
    setChromeFlags();
    expect(spy).nthCalledWith(6, 'disable-renderer-backgrounding', 'true');
    expect(spy).not.nthCalledWith(7);
  });

  describe('`isDevEnv`', () => {
    beforeEach(() => {
      (isDevEnv as any) = true;
    });

    it('should call `setChromeFlags` correctly', () => {
      const spy = jest.spyOn(app.commandLine, 'appendSwitch');
      setChromeFlags();
      expect(spy).nthCalledWith(
        1,
        'auth-negotiate-delegate-whitelist',
        'whitelist',
      );
      expect(spy).nthCalledWith(2, 'auth-server-whitelist', 'url');
      expect(spy).nthCalledWith(
        3,
        'disable-background-timer-throttling',
        'true',
      );
      expect(spy).nthCalledWith(4, 'disable-d3d11', true);
      expect(spy).nthCalledWith(5, 'disable-gpu', true);
      expect(spy).nthCalledWith(6, 'disable-gpu-compositing', true);
    });
  });
});
