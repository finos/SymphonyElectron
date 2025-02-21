import {
  showLoadFailure,
  showNetworkConnectivityError,
} from '../src/app/dialog-handler';
import { windowHandler } from '../src/app/window-handler';
import { BrowserWindow, dialog, ipcRenderer } from './__mocks__/electron';

jest.mock('../src/app/auto-update-handler', () => {
  return {
    updateAndRestart: jest.fn(),
  };
});

jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
  existsSync: jest.fn(() => true),
  unlinkSync: jest.fn(),
  readFileSync: jest.fn(() => '{ "configVersion": "4.0.0" }'),
  readdirSync: jest.fn(() => [
    'Cache',
    'GPUCache',
    'Symphony.config',
    'cloudConfig.config',
  ]),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  lstatSync: jest.fn(() => {
    return {
      isDirectory: jest.fn(() => true),
    };
  }),
}));

jest.mock('../src/app/window-handler', () => {
  return {
    windowHandler: {
      createBasicAuthWindow: jest.fn(),
    },
  };
});

jest.mock('../src/app/plist-handler', () => {
  return {};
});
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

jest.mock('../src/renderer/notification', () => {
  return {
    setupNotificationPosition: jest.fn(),
  };
});

jest.mock('electron-log');

describe('dialog handler', () => {
  const callbackMocked = jest.fn();
  const webContentsMocked = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks().resetModules();
  });

  describe('events', () => {
    it('should call login correctly', () => {
      const spy = jest.spyOn(windowHandler, 'createBasicAuthWindow');
      const requestMocked = {
        url: 'https://symphony.corporate.com/',
      };
      const authInfoMocked = {
        host: 'symphony.com',
      };
      ipcRenderer.send(
        'login',
        webContentsMocked,
        requestMocked,
        authInfoMocked,
        callbackMocked,
      );
      expect(spy).toBeCalledWith(
        webContentsMocked,
        'symphony.com',
        true,
        expect.any(Function),
        callbackMocked,
      );
    });

    describe('certificate-error', () => {
      let urlMocked;
      const errorMocked = 'check for server certificate revocation';
      const certificate = null;
      beforeEach(() => {
        jest.clearAllMocks().resetModules();
      });
      it('should return true when buttonId is 0', async (done) => {
        urlMocked = 'https://symphony.corporate.com/';
        BrowserWindow.fromWebContents = jest.fn(() => {
          return { isDestroyed: jest.fn(() => false) };
        });
        dialog.showMessageBox = jest.fn(() => {
          return { response: 0 };
        });
        await ipcRenderer.send(
          'certificate-error',
          webContentsMocked,
          urlMocked,
          errorMocked,
          certificate,
          callbackMocked,
        );
        expect(callbackMocked).toBeCalledWith(true);
        await ipcRenderer.send(
          'certificate-error',
          webContentsMocked,
          urlMocked,
          errorMocked,
          certificate,
          callbackMocked,
        );
        done(expect(callbackMocked).toBeCalledWith(true));
      });

      it('should return false when buttonId is 1', async (done) => {
        urlMocked = 'https://symphony2.corporate.com/';
        BrowserWindow.fromWebContents = jest.fn(() => {
          return { isDestroyed: jest.fn(() => false) };
        });
        dialog.showMessageBox = jest.fn(() => {
          return { response: 1 };
        });
        await ipcRenderer.send(
          'certificate-error',
          webContentsMocked,
          urlMocked,
          errorMocked,
          certificate,
          callbackMocked,
        );
        expect(callbackMocked).toBeCalledWith(false);
        await ipcRenderer.send(
          'certificate-error',
          webContentsMocked,
          urlMocked,
          errorMocked,
          certificate,
          callbackMocked,
        );
        done(expect(callbackMocked).toBeCalledWith(false));
      });
    });
  });

  it('should call `showLoadFailure` correctly', () => {
    const spyFn = 'showMessageBox';
    const spy = jest.spyOn(dialog, spyFn);
    const browserWindowMocked: any = { id: 123 };
    const urlMocked = 'test';
    const errorDescMocked = 'error';
    const errorCodeMocked = 404;
    const showDialogMocked = true;
    const expectedValue = {
      type: 'error',
      buttons: ['Reload', 'Ignore'],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
      title: 'Loading Error',
      message: `Error loading URL:\n${urlMocked}\n\n${errorDescMocked}\n\nError Code: ${errorCodeMocked}`,
    };
    showLoadFailure(
      browserWindowMocked,
      urlMocked,
      errorDescMocked,
      errorCodeMocked,
      callbackMocked,
      showDialogMocked,
    );
    expect(spy).toBeCalledWith({ id: 123 }, expectedValue);
  });

  it('should call `showNetworkConnectivityError` correctly', () => {
    const spyFn = 'showMessageBox';
    const spy = jest.spyOn(dialog, spyFn);
    const browserWindowMocked: any = { id: 123 };
    const urlMocked = 'test';
    const errorDescMocked =
      'Network connectivity has been lost. Check your internet connection.';
    const expectedValue = {
      type: 'error',
      buttons: ['Reload', 'Ignore'],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
      title: 'Loading Error',
      message: `Error loading URL:\n${urlMocked}\n\n${errorDescMocked}`,
    };
    showNetworkConnectivityError(
      browserWindowMocked,
      urlMocked,
      callbackMocked,
    );
    expect(spy).toBeCalledWith({ id: 123 }, expectedValue);
  });
});
