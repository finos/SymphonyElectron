import { activityDetection } from '../src/app/activity-detection';
import * as c9PipeHandler from '../src/app/c9-pipe-handler';
import { downloadHandler } from '../src/app/download-handler';
import '../src/app/main-api-handler';
import { protocolHandler } from '../src/app/protocol-handler';
import { screenSnippet } from '../src/app/screen-snippet-handler';
import * as windowActions from '../src/app/window-actions';
import { windowHandler } from '../src/app/window-handler';
import * as utils from '../src/app/window-utils';
import { apiCmds, apiName } from '../src/common/api-interface';
import { logger } from '../src/common/logger';
import { BrowserWindow, ipcMain } from './__mocks__/electron';

jest.mock('electron-log');

jest.mock('../src/app/protocol-handler', () => {
  return {
    protocolHandler: {
      setPreloadWebContents: jest.fn(),
    },
  };
});

jest.mock('../src/app/auto-update-handler', () => {
  return {
    updateAndRestart: jest.fn(),
  };
});

jest.mock('../src/app/screen-snippet-handler', () => {
  return {
    screenSnippet: {
      capture: jest.fn(),
    },
  };
});

jest.mock('../src/app/window-actions', () => {
  return {
    activate: jest.fn(),
    handleKeyPress: jest.fn(),
  };
});

jest.mock('../src/app/window-handler', () => {
  return {
    windowHandler: {
      closeAllWindows: jest.fn(),
      closeWindow: jest.fn(),
      createNotificationSettingsWindow: jest.fn(),
      createScreenPickerWindow: jest.fn(),
      createScreenSharingIndicatorWindow: jest.fn(),
      isOnline: false,
      updateVersionInfo: jest.fn(),
      isMana: false,
      getMainWebContents: jest.fn(),
      appMenu: {
        buildMenu: jest.fn(),
      },
      getMainWindow: jest.fn(),
    },
  };
});

jest.mock('../src/app/window-utils', () => {
  return {
    downloadManagerAction: jest.fn(),
    getWindowByName: jest.fn(),
    isValidWindow: jest.fn(() => true),
    isValidView: jest.fn(),
    sanitize: jest.fn(),
    setDataUrl: jest.fn(),
    showBadgeCount: jest.fn(),
    showPopupMenu: jest.fn(),
    updateLocale: jest.fn(),
    windowExists: jest.fn(() => true),
  };
});

jest.mock('../src/common/logger', () => {
  return {
    logger: {
      setLoggerWindow: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    },
  };
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
          bringToFront: 'ENABLED',
        };
      }),
      getFilteredCloudConfigFields: jest.fn(() => {
        return {
          devToolsEnabled: true,
        };
      }),
      getUserConfigFields: jest.fn(() => {
        return {
          url: 'https://symphony.com',
        };
      }),
      getGlobalConfigFields: jest.fn(() => {
        return {
          url: 'https://symphony.com',
        };
      }),
    },
  };
});

jest.mock('../src/app/activity-detection', () => {
  return {
    activityDetection: {
      setWindowAndThreshold: jest.fn(),
    },
  };
});

jest.mock('../src/app/download-handler', () => {
  return {
    downloadHandler: {
      setWindow: jest.fn(),
      openFile: jest.fn(),
      showInFinder: jest.fn(),
      clearDownloadedItems: jest.fn(),
    },
  };
});

jest.mock('../src/app/notifications/notification-helper', () => {
  return {
    notificationHelper: {
      showNotification: jest.fn(),
      closeNotification: jest.fn(),
    },
  };
});

describe('main api handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (utils.isValidWindow as any) = jest.fn(() => true);
  });

  describe('symphony-api events', () => {
    it('should call `isOnline` correctly', () => {
      const value = {
        cmd: apiCmds.isOnline,
        isOnline: true,
      };
      ipcMain.send(apiName.symphonyApi, value);
      expect(windowHandler.isOnline).toBe(true);
    });

    it('should call `setBadgeCount` correctly', () => {
      const spy = jest.spyOn(utils, 'showBadgeCount');
      const value = {
        cmd: apiCmds.setBadgeCount,
        count: 3,
      };
      const expectedValue = 3;
      ipcMain.send(apiName.symphonyApi, value);
      expect(spy).toBeCalledWith(expectedValue);
    });

    it('should fail when `isValidWindow` is false', () => {
      (utils.isValidWindow as any) = jest.fn(() => false);
      const spy = jest.spyOn(utils, 'showBadgeCount');
      const value = {
        cmd: apiCmds.setBadgeCount,
        count: 3,
      };
      ipcMain.send(apiName.symphonyApi, value);
      expect(spy).not.toBeCalled();
    });

    it('should fail when `arg` is false', () => {
      const value = null;
      const spy = jest.spyOn(utils, 'showBadgeCount');
      ipcMain.send(apiName.symphonyApi, value);
      expect(spy).not.toBeCalled();
    });

    it('should call `registerProtocolHandler` correctly', () => {
      const spy = jest.spyOn(protocolHandler, 'setPreloadWebContents');
      const value = {
        cmd: apiCmds.registerProtocolHandler,
      };
      const expectedValue = {
        send: expect.any(Function),
      };
      ipcMain.send(apiName.symphonyApi, value);
      expect(spy).toBeCalledWith(expectedValue);
    });

    it('should call `badgeDataUrl` correctly', () => {
      const spy = jest.spyOn(utils, 'setDataUrl');
      const value = {
        cmd: apiCmds.badgeDataUrl,
        dataUrl: 'https://symphony.com',
        count: 3,
      };
      const expectedValue = ['https://symphony.com', 3];
      ipcMain.send(apiName.symphonyApi, value);
      expect(spy).toBeCalledWith(...expectedValue);
    });

    it('should call `activate` correctly', () => {
      const spy = jest.spyOn(windowActions, 'activate');
      const value = {
        cmd: apiCmds.activate,
        windowName: 'notification',
      };
      const expectedValue = 'notification';
      ipcMain.send(apiName.symphonyApi, value);
      expect(spy).toBeCalledWith(expectedValue);
    });

    it('should call `registerLogger` correctly', () => {
      const spy = jest.spyOn(logger, 'setLoggerWindow');
      const value = {
        cmd: apiCmds.registerLogger,
      };
      const expectedValue = {
        send: expect.any(Function),
      };
      ipcMain.send(apiName.symphonyApi, value);
      expect(spy).toBeCalledWith(expectedValue);
    });

    it('should call `registerActivityDetection` correctly', () => {
      const spy = jest.spyOn(activityDetection, 'setWindowAndThreshold');
      const value = {
        cmd: apiCmds.registerActivityDetection,
        period: 3,
      };
      const expectedValue = [{ send: expect.any(Function) }, 3];
      ipcMain.send(apiName.symphonyApi, value);
      expect(spy).toBeCalledWith(...expectedValue);
    });

    it('should call `registerDownloadHandler` correctly', () => {
      const spy = jest.spyOn(downloadHandler, 'setWindow');
      const value = {
        cmd: apiCmds.registerDownloadHandler,
      };
      const expectedValue = [{ send: expect.any(Function) }];
      ipcMain.send(apiName.symphonyApi, value);
      expect(spy).toBeCalledWith(...expectedValue);
    });

    it('should call `openFile` correctly', () => {
      const spy = jest.spyOn(downloadHandler, 'openFile');
      const value = {
        cmd: apiCmds.openDownloadedItem,
        id: '12345678',
      };
      const expectedValue = '12345678';
      ipcMain.send(apiName.symphonyApi, value);
      expect(spy).toBeCalledWith(expectedValue);
    });

    it('should not call `openFile` if id is not a string', () => {
      const spy = jest.spyOn(downloadHandler, 'openFile');
      const value = {
        cmd: apiCmds.openDownloadedItem,
        id: 10,
      };
      ipcMain.send(apiName.symphonyApi, value);
      expect(spy).not.toBeCalled();
    });

    it('should call `showFile` correctly', () => {
      const spy = jest.spyOn(downloadHandler, 'showInFinder');
      const value = {
        cmd: apiCmds.showDownloadedItem,
        id: `12345678`,
      };
      const expectedValue = '12345678';
      ipcMain.send(apiName.symphonyApi, value);
      expect(spy).toBeCalledWith(expectedValue);
    });

    it('should not call `showFile` if id is not a string', () => {
      const spy = jest.spyOn(downloadHandler, 'showInFinder');
      const value = {
        cmd: apiCmds.showDownloadedItem,
        id: 10,
      };
      ipcMain.send(apiName.symphonyApi, value);
      expect(spy).not.toBeCalled();
    });

    it('should call `clearItems` correctly', () => {
      const spy = jest.spyOn(downloadHandler, 'clearDownloadedItems');
      const value = {
        cmd: apiCmds.clearDownloadedItems,
      };
      ipcMain.send(apiName.symphonyApi, value);
      expect(spy).toBeCalled();
    });

    it('should call `showNotificationSettings` correctly', () => {
      const spy = jest.spyOn(windowHandler, 'createNotificationSettingsWindow');
      const value = {
        cmd: apiCmds.showNotificationSettings,
        windowName: 'notification-settings',
        theme: 'light',
      };
      ipcMain.send(apiName.symphonyApi, value);
      expect(spy).toBeCalledWith('notification-settings', 'light');
    });

    it('should call `sanitize` correctly', () => {
      const spy = jest.spyOn(utils, 'sanitize');
      const value = {
        cmd: apiCmds.sanitize,
        windowName: 'main',
      };
      const expectedValue = 'main';
      ipcMain.send(apiName.symphonyApi, value);
      expect(spy).toBeCalledWith(expectedValue);
    });

    it('should call `bringToFront` correctly', () => {
      const spy = jest.spyOn(windowActions, 'activate');
      const value = {
        cmd: apiCmds.bringToFront,
        reason: 'notification',
        windowName: 'notification',
      };
      const expectedValue = ['notification', false];
      ipcMain.send(apiName.symphonyApi, value);
      expect(spy).toBeCalledWith(...expectedValue);
    });

    it('should call `openScreenPickerWindow` correctly', () => {
      const spy = jest.spyOn(windowHandler, 'createScreenPickerWindow');
      const value = {
        cmd: apiCmds.openScreenPickerWindow,
        sources: [],
        id: 3,
      };
      const expectedValue = [{ send: expect.any(Function) }, [], 3];
      ipcMain.send(apiName.symphonyApi, value);
      expect(spy).toBeCalledWith(...expectedValue);
    });

    it('should call `popupMenu` correctly', () => {
      const fromWebContentsMocked = {
        isDestroyed: jest.fn(),
        winName: apiName.mainWindowName,
      };
      const spy = jest.spyOn(utils, 'showPopupMenu');
      const value = {
        cmd: apiCmds.popupMenu,
      };
      const expectedValue = { window: fromWebContentsMocked };
      jest.spyOn(BrowserWindow, 'fromWebContents').mockImplementation(() => {
        return fromWebContentsMocked;
      });
      ipcMain.send(apiName.symphonyApi, value);
      expect(spy).toBeCalledWith(expectedValue);
    });

    it('should call `setLocale` correctly', () => {
      const spy = jest.spyOn(utils, 'updateLocale');
      const value = {
        cmd: apiCmds.setLocale,
        locale: 'en-US',
      };
      const expectedValue = 'en-US';
      ipcMain.send(apiName.symphonyApi, value);
      expect(spy).toBeCalledWith(expectedValue);
    });

    it('should call `keyPress` correctly', () => {
      const spy = jest.spyOn(windowActions, 'handleKeyPress');
      const value = {
        cmd: apiCmds.keyPress,
        keyCode: 3,
      };
      const expectedValue = 3;
      ipcMain.send(apiName.symphonyApi, value);
      expect(spy).toBeCalledWith(expectedValue);
    });

    it('should call `openScreenSnippet` correctly', () => {
      const spy = jest.spyOn(screenSnippet, 'capture');
      jest.spyOn(BrowserWindow, 'getFocusedWindow').mockImplementation(() => {
        return {
          winName: 'main',
        };
      });
      const value = {
        cmd: apiCmds.openScreenSnippet,
      };
      const expectedValue = { send: expect.any(Function) };
      ipcMain.send(apiName.symphonyApi, value);
      expect(spy).toBeCalledWith(expectedValue, undefined);
    });

    it('should call `openScreenSnippet` with hideOnCapture correctly', () => {
      const spy = jest.spyOn(screenSnippet, 'capture');
      jest.spyOn(BrowserWindow, 'getFocusedWindow').mockImplementation(() => {
        return {
          winName: 'main',
        };
      });
      const value = {
        cmd: apiCmds.openScreenSnippet,
        hideOnCapture: true,
      };
      const expectedValue = { send: expect.any(Function) };
      ipcMain.send(apiName.symphonyApi, value);
      expect(spy).toBeCalledWith(expectedValue, true);
    });

    it('should call `closeWindow` correctly', () => {
      const spy = jest.spyOn(windowHandler, 'closeWindow');
      const value = {
        cmd: apiCmds.closeWindow,
        windowType: 2,
        winKey: 'main',
      };
      const expectedValue = [2, 'main'];
      ipcMain.send(apiName.symphonyApi, value);
      expect(spy).toBeCalledWith(...expectedValue);
    });

    it('should call `openScreenSharingIndicator` correctly', () => {
      const spy = jest.spyOn(
        windowHandler,
        'createScreenSharingIndicatorWindow',
      );
      const value = {
        cmd: apiCmds.openScreenSharingIndicator,
        displayId: 'main',
        id: 3,
        streamId: '3',
      };
      const expectedValue = [{ send: expect.any(Function) }, 'main', 3, '3'];
      ipcMain.send(apiName.symphonyApi, value);
      expect(spy).toBeCalledWith(...expectedValue);
    });

    it('should call `downloadManagerAction` correctly', () => {
      const spy = jest.spyOn(utils, 'downloadManagerAction');
      const value = {
        cmd: apiCmds.downloadManagerAction,
        type: 2,
        path: '/Users/symphony/SymphonyElectron/src/app/main-api-handler.ts',
      };
      const expectedValue = [
        2,
        '/Users/symphony/SymphonyElectron/src/app/main-api-handler.ts',
      ];
      ipcMain.send(apiName.symphonyApi, value);
      expect(spy).toBeCalledWith(...expectedValue);
    });

    it('should call `setIsMana` correctly', () => {
      const value = {
        cmd: apiCmds.setIsMana,
        isMana: true,
      };
      expect(windowHandler.isMana).toBe(false);
      ipcMain.send(apiName.symphonyApi, value);
      expect(windowHandler.isMana).toBe(true);
    });
    it('should call build menu when ismana set to true', () => {
      const value = {
        cmd: apiCmds.setIsMana,
        isMana: true,
      };
      ipcMain.send(apiName.symphonyApi, value);
      if (windowHandler.appMenu) {
        expect(windowHandler.appMenu.buildMenu).toBeCalled();
      }
    });

    it('should not call build menu when ismana set to false', () => {
      const value = {
        cmd: apiCmds.setIsMana,
        isMana: false,
      };
      ipcMain.send(apiName.symphonyApi, value);
      if (windowHandler.appMenu) {
        expect(windowHandler.appMenu.buildMenu).not.toBeCalled();
      }
    });

    it('should call closeAllWindows on windowHandler correctly', () => {
      const spy = jest.spyOn(windowHandler, 'closeAllWindows');
      const value = {
        cmd: apiCmds.closeAllWrapperWindows,
      };
      ipcMain.send(apiName.symphonyApi, value);
      expect(spy).toBeCalled();
    });

    it('should call `getNativeWindowHandle` correctly', () => {
      const windows = {
        main: {
          getNativeWindowHandle: jest.fn(),
        },
        popout1: {
          getNativeWindowHandle: jest.fn(),
        },
        popout2: {
          getNativeWindowHandle: jest.fn(),
        },
      };
      jest
        .spyOn(utils, 'getWindowByName')
        .mockImplementation((windowName: string) => {
          return windows[windowName];
        });

      ipcMain.send(apiName.symphonyApi, {
        cmd: apiCmds.getNativeWindowHandle,
        windowName: 'main',
      });
      expect(windows.main.getNativeWindowHandle).toBeCalledTimes(1);

      ipcMain.send(apiName.symphonyApi, {
        cmd: apiCmds.getNativeWindowHandle,
        windowName: 'popout1',
      });
      expect(windows.popout1.getNativeWindowHandle).toBeCalledTimes(1);
      expect(windows.popout2.getNativeWindowHandle).toBeCalledTimes(0);
    });

    it('should call `connectC9Pipe` correctly', () => {
      const spy = jest.spyOn(c9PipeHandler, 'connectC9Pipe');
      const value = {
        cmd: apiCmds.connectCloud9Pipe,
        pipe: 'pipe-name',
      };
      const expectedValue = [{ send: expect.any(Function) }, 'pipe-name'];
      ipcMain.send(apiName.symphonyApi, value);
      expect(spy).toBeCalledWith(...expectedValue);
    });
  });
});
