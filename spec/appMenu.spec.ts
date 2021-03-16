import { AppMenu, menuSections } from '../src/app/app-menu';
import { autoLaunchInstance } from '../src/app/auto-launch-controller';
import { config } from '../src/app/config-handler';
import { exportCrashDumps, exportLogs } from '../src/app/reports-handler';
import { updateAlwaysOnTop } from '../src/app/window-actions';
import { zoomIn, zoomOut } from '../src/app/window-utils';
import * as envMock from '../src/common/env';
import { logger } from '../src/common/logger';
import { dialog, session, shell } from './__mocks__/electron';

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
      isMana: true,
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
    });

    describe('`buildHelpMenu`', () => {
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

      it('should call `Learn More` correctly', () => {
        const spy = jest.spyOn(shell, 'openExternal');
        const expectedValue = 'https://support.symphony.com';
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
        it('should call `toggleDevTools` when focusedWindow is not null', () => {
          const focusedWindow = {
            isDestroyed: jest.fn(() => false),
            reload: jest.fn(),
            webContents: {
              toggleDevTools: jest.fn(),
            },
          };
          const spy = jest.spyOn(focusedWindow.webContents, 'toggleDevTools');
          const menuItem = findHelpTroubleshootingMenuItem(
            'Toggle Developer Tools',
          );
          menuItem.click({}, focusedWindow);
          expect(spy).toBeCalled();
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
