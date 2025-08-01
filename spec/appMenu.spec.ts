import { AppMenu, menuSections } from '../src/app/app-menu';
import { autoLaunchInstance } from '../src/app/auto-launch-controller';
import { config } from '../src/app/config-handler';
import { miniViewHandler } from '../src/app/mini-view-handler';
import { exportCrashDumps, exportLogs } from '../src/app/reports-handler';
import { updateAlwaysOnTop } from '../src/app/window-actions';
import { windowHandler } from '../src/app/window-handler';
import { zoomIn, zoomOut } from '../src/app/window-utils';
import { apiName } from '../src/common/api-interface';
import * as envMock from '../src/common/env';
import { logger } from '../src/common/logger';
import { BrowserWindow, dialog, session, shell } from './__mocks__/electron';

const mock = new Map<string, any>();
mock.set('value', {
  linkText: 'test',
  linkAddress: 'test-abc',
  enabled: true,
});

jest.mock('../src/app/stores', () => {
  return {
    sdaMenuStore: {
      getHelpMenuSingleton: () => ({ getValue: () => mock.get('value') }),
    },
  };
});

jest.mock('../src/app/reports-handler', () => {
  return {
    exportLogs: jest.fn(),
    exportCrashDumps: jest.fn(),
  };
});

jest.mock('../src/common/env', () => {
  return {
    isWindowsOS: false,
    isLinux: false,
    isMac: true,
  };
});

jest.mock('../src/app/window-actions', () => {
  return {
    updateAlwaysOnTop: jest.fn(),
    activateMiniView: jest.fn(),
    deactivateMiniView: jest.fn(),
  };
});

jest.mock('../src/app/auto-launch-controller', () => {
  return {
    autoLaunchInstance: {
      disableAutoLaunch: jest.fn(),
      enableAutoLaunch: jest.fn(),
    },
  };
});

jest.mock('../src/app/auto-update-handler', () => {
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

jest.mock('../src/app/window-handler', () => {
  return {
    windowHandler: {
      createMoreInfoWindow: jest.fn(),
      getMainWindow: jest.fn(),
      getMainWebContents: jest.fn(),
      isMana: true,
      setIsMiniViewEnabled: jest.fn(),
      getIsMiniViewEnabled: jest.fn(),
      getIsMiniViewFeatureEnabled: jest.fn(),
      setIsMiniViewTransition: jest.fn(),
    },
  };
});

jest.mock('../src/common/logger', () => {
  return {
    logger: {
      error: jest.fn(),
      info: jest.fn(),
    },
  };
});

jest.mock('../src/app/window-utils', () => {
  return {
    windowExists: jest.fn(() => true),
    zoomIn: jest.fn(),
    zoomOut: jest.fn(),
    reloadWindow: jest.fn(),
    isValidHttpUrl: (url: string) => {
      const pattern = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
      return pattern.test(url);
    },
  };
});

jest.mock('../src/app/mini-view-handler', () => {
  return {
    miniViewHandler: {
      activateMiniView: jest.fn(),
      deactivateMiniView: jest.fn(),
    },
  };
});

describe('app menu', () => {
  let appMenu;
  const updateUserFnLabel = 'updateUserConfig';
  const item = {
    checked: true,
  };

  const findMenuItemBuildWindowMenu = (menuItemLabel: string) => {
    return appMenu.buildWindowMenu().submenu.find((menuItem) => {
      return menuItem.label === menuItemLabel;
    });
  };

  const findMenuItemBuildHelpMenu = (menuItemLabel: string) => {
    return appMenu.buildHelpMenu().submenu.find((menuItem) => {
      return menuItem.label === menuItemLabel;
    });
  };

  const findMenuItemBuildViewMenu = (menuItemLabel: string) => {
    return appMenu.buildViewMenu().submenu.find((menuItem) => {
      return menuItem.label === menuItemLabel;
    });
  };

  const findHelpTroubleshootingMenuItem = (value: string) => {
    const helpMenuItem = findMenuItemBuildHelpMenu('Troubleshooting');
    return helpMenuItem.submenu.find((menuItem) => {
      return menuItem.label === value;
    });
  };

  const env = envMock as any;

  beforeEach(() => {
    appMenu = new AppMenu();
    env.isWindowsOS = false;
    env.isLinux = false;
    env.isMac = true;
  });

  it('should call `update` correctly', () => {
    const spyFn = 'buildMenu';
    const spy = jest.spyOn(appMenu, spyFn);
    appMenu.locale = 'en-US';
    appMenu.update('ja-JP');
    expect(spy).toBeCalled();
  });

  describe('`popupMenu`', () => {
    it('should fail when `appMenu.menu` is null', () => {
      const spy = jest.spyOn(logger, 'error');
      const expectedValue =
        'app-menu: tried popup menu, but failed, menu not defined';
      appMenu.menu = null;
      appMenu.popupMenu();
      expect(spy).toBeCalledWith(expectedValue);
    });

    it('should call `menu.popup` correctly', () => {
      const menuMock = {
        popup: jest.fn(),
      };
      const expectedValue: Electron.PopupOptions = {
        x: 1,
        y: 1,
        positioningItem: 1,
        callback: () => null,
      };
      const spy = jest.spyOn(menuMock, 'popup');
      appMenu.menu = menuMock;
      appMenu.popupMenu(expectedValue);
      expect(spy).toBeCalledWith(expectedValue);
    });
  });

  describe('buildMenuKey', () => {
    it('should call `buildAboutMenu` correctly', () => {
      const spyFn = 'buildAboutMenu';
      const spy = jest.spyOn(appMenu, spyFn);
      appMenu.buildMenuKey(menuSections.about);
      expect(spy).toBeCalled();
    });

    it('should call `buildEditMenu` correctly', () => {
      const spyFn = 'buildEditMenu';
      const spy = jest.spyOn(appMenu, spyFn);
      appMenu.buildMenuKey(menuSections.edit);
      expect(spy).toBeCalled();
    });

    it('should call `buildEditMenu` correctly on WindowsOS', () => {
      env.isWindowsOS = true;
      env.isLinux = false;
      env.isMac = false;
      const spyFn = 'buildEditMenu';
      const spy = jest.spyOn(appMenu, spyFn);
      appMenu.buildMenuKey(menuSections.edit);
      expect(spy).toBeCalled();
    });

    it('should call `buildViewMenu` correctly', () => {
      const spyFn = 'buildViewMenu';
      const spy = jest.spyOn(appMenu, spyFn);
      appMenu.buildMenuKey(menuSections.view);
      expect(spy).toBeCalled();
    });

    it('should fail when key is incorrect', () => {
      const invalidKey = 'error';
      const expectedWarning = `app-menu: Invalid ${invalidKey}`;
      expect(() => appMenu.buildMenuKey(invalidKey)).toThrow(expectedWarning);
    });

    describe('buildWindowMenu', () => {
      it('should call `buildWindowMenu` correctly', () => {
        const spyFn = 'buildWindowMenu';
        const spy = jest.spyOn(appMenu, spyFn);
        appMenu.buildMenuKey(menuSections.window);
        expect(spy).toBeCalled();
      });

      describe('`Auto Launch On Startup`', () => {
        let autoLaunchMenuItem;

        beforeAll(() => {
          autoLaunchMenuItem = findMenuItemBuildWindowMenu(
            'Auto Launch On Startup',
          );
        });

        it('should disable `AutoLaunch` when click is triggered', async () => {
          const spyFn = 'disableAutoLaunch';
          const spyConfig = jest.spyOn(config, updateUserFnLabel);
          const expectedValue = { launchOnStartup: 'NOT_SET' };
          const spy = jest.spyOn(autoLaunchInstance, spyFn);
          const customItem = {
            checked: false,
          };
          await autoLaunchMenuItem.click(customItem);
          expect(spy).toBeCalled();
          expect(spyConfig).lastCalledWith(expectedValue);
        });

        it('should enable `AutoLaunch` when click is triggered', async () => {
          const spyFn = 'enableAutoLaunch';
          const spyConfig = jest.spyOn(config, updateUserFnLabel);
          const expectedValue = { launchOnStartup: 'ENABLED' };
          const spy = jest.spyOn(autoLaunchInstance, spyFn);
          await autoLaunchMenuItem.click(item);
          expect(spy).toBeCalled();
          expect(spyConfig).lastCalledWith(expectedValue);
        });
      });

      it('should update `alwaysOnTop` value when click is triggered', async () => {
        const menuItem = findMenuItemBuildWindowMenu('Always on Top');
        await menuItem.click(item);
        expect(updateAlwaysOnTop).toBeCalledWith(true, true);
      });

      it('should update `minimizeOnClose` value when click is triggered', async () => {
        const spyConfig = jest.spyOn(config, updateUserFnLabel);
        const expectedValue = { minimizeOnClose: 'ENABLED' };
        const menuItem = findMenuItemBuildWindowMenu('Minimize on Close');
        await menuItem.click(item);
        expect(spyConfig).lastCalledWith(expectedValue);
      });

      describe('`bringToFront`', () => {
        it('should update `bringToFront` value when click is triggered', async () => {
          const spyConfig = jest.spyOn(config, updateUserFnLabel);
          const expectedValue = { bringToFront: 'ENABLED' };
          const menuItem = findMenuItemBuildWindowMenu(
            'Bring to Front on Notifications',
          );
          await menuItem.click(item);
          expect(spyConfig).lastCalledWith(expectedValue);
        });

        it('should find `Flash Notification in Taskbar` when is WindowsOS', () => {
          const expectedValue = 'Flash Notification in Taskbar';
          env.isWindowsOS = true;
          env.isLinux = false;
          env.isMac = false;
          const menuItem = findMenuItemBuildWindowMenu(
            'Flash Notification in Taskbar',
          );
          expect(menuItem.label).toEqual(expectedValue);
        });
      });

      it('should call clear cache and reload correctly', () => {
        const focusedWindow = {
          isDestroyed: jest.fn(() => false),
          reload: jest.fn(),
        };
        const spySession = jest.spyOn(session.defaultSession, 'clearCache');
        const menuItem = findMenuItemBuildWindowMenu('Clear cache and Reload');
        menuItem.click(item, focusedWindow);
        expect(spySession).toBeCalled();
      });

      describe('Mini view functionality', () => {
        it('should activate mini view when "Mini View" is clicked', async () => {
          jest
            .spyOn(windowHandler, 'getIsMiniViewFeatureEnabled')
            .mockReturnValue(true);
          jest
            .spyOn(windowHandler, 'getIsMiniViewEnabled')
            .mockReturnValue(false);

          const menuItem = findMenuItemBuildWindowMenu('Mini View');
          await menuItem.click(item);
          expect(miniViewHandler.activateMiniView).toHaveBeenCalled();
        });

        it('should deactivate mini view when "Exit Mini View" is clicked', async () => {
          jest
            .spyOn(windowHandler, 'getIsMiniViewFeatureEnabled')
            .mockReturnValue(true);
          jest
            .spyOn(windowHandler, 'getIsMiniViewEnabled')
            .mockReturnValue(true);

          const menuItem = findMenuItemBuildWindowMenu('Exit Mini View');
          await menuItem.click(item);
          expect(miniViewHandler.deactivateMiniView).toHaveBeenCalled();
        });

        it('should not show mini view options when feature is disabled', () => {
          jest
            .spyOn(windowHandler, 'getIsMiniViewEnabled')
            .mockReturnValue(true);
          jest
            .spyOn(windowHandler, 'getIsMiniViewFeatureEnabled')
            .mockReturnValue(false);

          const exitMiniViewMenuItem =
            findMenuItemBuildWindowMenu('Exit Mini View');

          expect(exitMiniViewMenuItem.visible).toBe(false);
        });
      });
    });

    describe('`buildHelpMenu`', () => {
      afterEach(() => {
        jest.clearAllMocks();
      });

      it('should call `buildHelpMenu` correctly', () => {
        const spyFn = 'buildHelpMenu';
        const spy = jest.spyOn(appMenu, spyFn);
        appMenu.buildMenuKey(menuSections.help);
        expect(spy).toBeCalled();
      });

      it('should call `Symphony Help` correctly', () => {
        const spy = jest.spyOn(shell, 'openExternal');
        const expectedValue = 'https://support.symphony.com';
        const menuItem = findMenuItemBuildHelpMenu('Symphony Help');
        menuItem.click();
        expect(spy).toBeCalledWith(expectedValue);
      });

      it('should not call `Helpdesk Portals`', () => {
        const spy = jest.spyOn(shell, 'openExternal');
        const menuItem = findMenuItemBuildHelpMenu('test');
        menuItem.click();
        expect(spy).toBeCalledTimes(0);
      });

      it('should call `Helpdesk Portals` correctly', () => {
        mock.set('value', {
          linkText: 'test',
          linkAddress: 'https://symphony.com',
          enabled: true,
        });
        const spy = jest.spyOn(shell, 'openExternal');
        const expectedValue = 'https://symphony.com';
        const menuItem = findMenuItemBuildHelpMenu('test');
        menuItem.click();
        expect(spy).toBeCalledWith(expectedValue);
      });

      it('should prevent `Helpdesk Portals` to be called if URL is invalid', () => {
        mock.set('value', {
          linkText: 'test',
          linkAddress: 'ftp://symphony.com',
          enabled: true,
        });
        const spy = jest.spyOn(shell, 'openExternal');
        const menuItem = findMenuItemBuildHelpMenu('test');
        menuItem.click();
        expect(spy).toBeCalledTimes(0);
      });

      it('should call `Learn More` correctly', () => {
        const spy = jest.spyOn(shell, 'openExternal');
        const expectedValue = 'https://symphony.com/en-US';
        const menuItem = findMenuItemBuildHelpMenu('Learn More');
        menuItem.click();
        expect(spy).toBeCalledWith(expectedValue);
      });

      it('should call `Show Logs in Finder` correctly', async () => {
        const menuItem = findHelpTroubleshootingMenuItem('Show Logs in Finder');
        await menuItem.click();
        expect(exportLogs).toBeCalled();
      });

      it('should call `Show crash dump in Finder` correctly', () => {
        const menuItem = findHelpTroubleshootingMenuItem(
          'Show crash dump in Finder',
        );
        menuItem.click();
        expect(exportCrashDumps).toBeCalled();
      });

      describe(`Toggle Developer Tools`, () => {
        it('should toggle devtools on focused window - focused window is not main window', () => {
          const focusedWindowMock = {
            isDestroyed: jest.fn(() => false),
            reload: jest.fn(),
            webContents: {
              toggleDevTools: jest.fn(),
            },
          };

          const mainWebContentsMock = {
            toggleDevTools: jest.fn(),
          };

          jest
            .spyOn(BrowserWindow, 'getFocusedWindow')
            .mockReturnValue(focusedWindowMock);
          const focusedWindowDevtoolsSpy = jest.spyOn(
            focusedWindowMock.webContents,
            'toggleDevTools',
          );
          const mainWebContentsSpy = jest
            .spyOn(windowHandler, 'getMainWebContents')
            .mockReturnValue(mainWebContentsMock);
          const mainWebContentsDevToolsSpy = jest.spyOn(
            mainWebContentsMock,
            'toggleDevTools',
          );
          const menuItem = findHelpTroubleshootingMenuItem(
            'Toggle Developer Tools',
          );
          menuItem.click({}, undefined);
          expect(focusedWindowDevtoolsSpy).toBeCalled();
          expect(mainWebContentsSpy).not.toBeCalled();
          expect(mainWebContentsDevToolsSpy).not.toBeCalled();
        });

        it('should toggle devtools on focused window - focused window is main window', () => {
          const focusedWindowMock = {
            isDestroyed: jest.fn(() => false),
            reload: jest.fn(),
            webContents: {
              toggleDevTools: jest.fn(),
            },
            winName: apiName.mainWindowName,
          };

          const mainWebContentsMock = {
            toggleDevTools: jest.fn(),
            isDestroyed: jest.fn(() => false),
          };

          jest
            .spyOn(BrowserWindow, 'getFocusedWindow')
            .mockReturnValue(focusedWindowMock);
          const focusedWindowDevtoolsSpy = jest.spyOn(
            focusedWindowMock.webContents,
            'toggleDevTools',
          );
          const mainWebContentsSpy = jest
            .spyOn(windowHandler, 'getMainWebContents')
            .mockReturnValue(mainWebContentsMock);
          const mainWebContentsDevToolsSpy = jest.spyOn(
            mainWebContentsMock,
            'toggleDevTools',
          );
          const menuItem = findHelpTroubleshootingMenuItem(
            'Toggle Developer Tools',
          );
          menuItem.click({}, undefined);
          expect(focusedWindowDevtoolsSpy).not.toBeCalled();
          expect(mainWebContentsSpy).toBeCalled();
          expect(mainWebContentsDevToolsSpy).toBeCalled();
        });

        it('should not call `electron.dialog` when focusedWindow is null', () => {
          const spy = jest.spyOn(dialog, 'showMessageBox');
          const focusedWindow = null;
          const expectedValue = {
            type: 'warning',
            buttons: ['Ok'],
            title: 'Dev Tools disabled',
            message:
              'Dev Tools has been disabled. Please contact your system administrator',
          };
          const menuItem = findHelpTroubleshootingMenuItem(
            'Toggle Developer Tools',
          );
          menuItem.click({}, focusedWindow);
          expect(spy).not.toBeCalledWith(null, expectedValue);
        });
      });
    });

    describe('buildViewMenu', () => {
      it('should call zoomIn when click is triggered', () => {
        const focusedWindow = {
          isDestroyed: jest.fn(() => false),
          reload: jest.fn(),
        };
        const menuItem = findMenuItemBuildViewMenu('Zoom In');
        menuItem.click(item, focusedWindow);
        expect(zoomIn).toBeCalled();
      });

      it('should call zoomOut when click is triggered', () => {
        const focusedWindow = {
          isDestroyed: jest.fn(() => false),
          reload: jest.fn(),
        };
        const menuItem = findMenuItemBuildViewMenu('Zoom Out');
        menuItem.click(item, focusedWindow);
        expect(zoomOut).toBeCalled();
      });
    });
  });
});
