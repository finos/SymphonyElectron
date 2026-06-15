import { isSafeAuthWhitelist, setChromeFlags } from '../src/app/chrome-flags';
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
    expect(spy).nthCalledWith(1, 'disable-background-timer-throttling', 'true');
    expect(spy).nthCalledWith(2, 'disable-d3d11', true);
    expect(spy).nthCalledWith(3, 'disable-gpu', true);
    expect(spy).nthCalledWith(4, 'disable-gpu-compositing', true);
    expect(spy).nthCalledWith(
      5,
      'enable-blink-features',
      'RTCInsertableStreams',
    );
    expect(spy).nthCalledWith(6, 'disable-features', 'ChromeRootStoreUsed');
    expect(spy).nthCalledWith(
      7,
      'auth-negotiate-delegate-whitelist',
      'whitelist',
    );
    expect(spy).nthCalledWith(8, 'auth-server-whitelist', 'url');
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
    expect(spy).nthCalledWith(1, 'disable-background-timer-throttling', 'true');
    expect(spy).nthCalledWith(
      2,
      'enable-blink-features',
      'RTCInsertableStreams',
    );
    expect(spy).nthCalledWith(3, 'disable-features', 'ChromeRootStoreUsed');
    expect(spy).nthCalledWith(
      4,
      'auth-negotiate-delegate-whitelist',
      'whitelist',
    );
    expect(spy).nthCalledWith(5, 'auth-server-whitelist', 'url');
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
    expect(spy).toHaveBeenCalledWith('disable-renderer-backgrounding', 'true');
  });

  it('should set `disable-renderer-backgrounding` chrome flag correctly when cloud config PMP setting is ENABLED', () => {
    config.getCloudConfigFields = jest.fn(() => {
      return {
        disableThrottling: 'ENABLED',
      };
    });
    const spy = jest.spyOn(app.commandLine, 'appendSwitch');
    setChromeFlags();
    expect(spy).toHaveBeenCalledWith('disable-renderer-backgrounding', 'true');
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
    expect(spy).toHaveBeenCalledWith('disable-renderer-backgrounding', 'true');
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
    expect(spy).toHaveBeenCalledWith('disable-renderer-backgrounding', 'true');
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
        'disable-background-timer-throttling',
        'true',
      );
      expect(spy).nthCalledWith(2, 'disable-d3d11', true);
      expect(spy).nthCalledWith(3, 'disable-gpu', true);
      expect(spy).nthCalledWith(4, 'disable-gpu-compositing', true);
      expect(spy).nthCalledWith(
        7,
        'auth-negotiate-delegate-whitelist',
        'whitelist',
      );
      expect(spy).nthCalledWith(8, 'auth-server-whitelist', 'url');
    });
  });

  describe('auth whitelist validation (H1 #3770918 residual)', () => {
    const authNegotiateFlag = 'auth-negotiate-delegate-whitelist';
    const authServerFlag = 'auth-server-whitelist';

    it('rejects bare `*` wildcard in authServerWhitelist', () => {
      config.getConfigFields = jest.fn(() => ({
        customFlags: {
          authServerWhitelist: '*',
          authNegotiateDelegateWhitelist: '',
        },
      }));
      const spy = jest.spyOn(app.commandLine, 'appendSwitch');
      setChromeFlags();
      expect(spy).not.toHaveBeenCalledWith(authServerFlag, '*');
      expect(spy).not.toHaveBeenCalledWith(
        authNegotiateFlag,
        expect.anything(),
      );
    });

    it('rejects `*` as an entry inside a comma-separated authServerWhitelist', () => {
      config.getConfigFields = jest.fn(() => ({
        customFlags: {
          authServerWhitelist: '*.symphony.com,*',
          authNegotiateDelegateWhitelist: '',
        },
      }));
      const spy = jest.spyOn(app.commandLine, 'appendSwitch');
      setChromeFlags();
      expect(spy).not.toHaveBeenCalledWith(
        authServerFlag,
        expect.stringContaining('*.symphony.com,*'),
      );
    });

    it('rejects bare `*` in authNegotiateDelegateWhitelist', () => {
      config.getConfigFields = jest.fn(() => ({
        customFlags: {
          authServerWhitelist: '',
          authNegotiateDelegateWhitelist: '*',
        },
      }));
      const spy = jest.spyOn(app.commandLine, 'appendSwitch');
      setChromeFlags();
      expect(spy).not.toHaveBeenCalledWith(authNegotiateFlag, '*');
    });

    it('accepts legitimate domain-scoped whitelist values', () => {
      config.getConfigFields = jest.fn(() => ({
        customFlags: {
          authServerWhitelist: '*.symphony.com,sso.corp.example',
          authNegotiateDelegateWhitelist: 'sso.corp.example',
        },
      }));
      const spy = jest.spyOn(app.commandLine, 'appendSwitch');
      setChromeFlags();
      expect(spy).toHaveBeenCalledWith(
        authServerFlag,
        '*.symphony.com,sso.corp.example',
      );
      expect(spy).toHaveBeenCalledWith(authNegotiateFlag, 'sso.corp.example');
    });
  });
});

describe('isSafeAuthWhitelist', () => {
  it('rejects empty/missing input', () => {
    expect(isSafeAuthWhitelist(undefined)).toBe(false);
    expect(isSafeAuthWhitelist(null)).toBe(false);
    expect(isSafeAuthWhitelist('')).toBe(false);
    expect(isSafeAuthWhitelist('   ')).toBe(false);
    expect(isSafeAuthWhitelist(123)).toBe(false);
  });

  it('rejects a bare `*` wildcard', () => {
    expect(isSafeAuthWhitelist('*')).toBe(false);
    expect(isSafeAuthWhitelist(' * ')).toBe(false);
  });

  it('rejects `*` as any comma-separated entry', () => {
    expect(isSafeAuthWhitelist('*.symphony.com,*')).toBe(false);
    expect(isSafeAuthWhitelist('*, sso.corp.example')).toBe(false);
  });

  it('accepts specific hostnames and subdomain wildcards', () => {
    expect(isSafeAuthWhitelist('sso.corp.example')).toBe(true);
    expect(isSafeAuthWhitelist('*.symphony.com')).toBe(true);
    expect(isSafeAuthWhitelist('*.symphony.com, sso.corp.example')).toBe(true);
  });
});
