import { AppMenu, menuSections } from '../src/app/app-menu';
import { autoLaunchInstance } from '../src/app/auto-launch-controller';
import { config } from '../src/app/config-handler';
import { exportCrashDumps, exportLogs } from '../src/app/reports-handler';
import { updateAlwaysOnTop } from '../src/app/window-actions';
import { windowHandler } from '../src/app/window-handler';
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
        config: {
            getConfigFields: jest.fn(() => {
                return {
                    minimizeOnClose: true,
                    launchOnStartup: true,
                    alwaysOnTop: true,
                    isAlwaysOnTop: true,
                    bringToFront: true,
                    memoryRefresh: true,
                };
            }),
            getGlobalConfigFields: jest.fn(() => {
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
            const expectedValue = 'app-menu: tried popup menu, but failed menu not defined';
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
                    autoLaunchMenuItem = findMenuItemBuildWindowMenu('Auto Launch On Startup');
                });

                it('should disable `AutoLaunch` when click is triggered', async () => {
                    const spyFn = 'disableAutoLaunch';
                    const spyConfig = jest.spyOn(config, updateUserFnLabel);
                    const expectedValue = { launchOnStartup: false };
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
                    const expectedValue = { launchOnStartup: true };
                    const spy = jest.spyOn(autoLaunchInstance, spyFn);
                    await autoLaunchMenuItem.click(item);
                    expect(spy).toBeCalled();
                    expect(spyConfig).lastCalledWith(expectedValue);
                });
            });

                it('should update `alwaysOnTop` value when click is triggered', async () => {
                    const spyConfig = jest.spyOn(config, updateUserFnLabel);
                    const expectedValue = { alwaysOnTop: true };
                    const menuItem = findMenuItemBuildWindowMenu('Always on Top');
                    await menuItem.click(item);
                    expect(updateAlwaysOnTop).toBeCalledWith(true, true);
                    expect(spyConfig).lastCalledWith(expectedValue);
                });

                it('should update `minimizeOnClose` value when click is triggered', async () => {
                    const spyConfig = jest.spyOn(config, updateUserFnLabel);
                    const expectedValue = { minimizeOnClose: true };
                    const menuItem = findMenuItemBuildWindowMenu('Minimize on Close');
                    await menuItem.click(item);
                    expect(spyConfig).lastCalledWith(expectedValue);
                });

                describe('`bringToFront`', () => {
                    it('should update `bringToFront` value when click is triggered', async () => {
                        const spyConfig = jest.spyOn(config, updateUserFnLabel);
                        const expectedValue = { bringToFront: true };
                        const menuItem = findMenuItemBuildWindowMenu('Bring to Front on Notifications');
                        await menuItem.click(item);
                        expect(spyConfig).lastCalledWith(expectedValue);
                    });

                    it('should find `Flash Notification in Taskbar` when is WindowsOS', () => {
                        const expectedValue = 'Flash Notification in Taskbar';
                        env.isWindowsOS = true;
                        env.isMac = false;
                        const menuItem = findMenuItemBuildWindowMenu('Flash Notification in Taskbar');
                        expect(menuItem.label).toEqual(expectedValue);
                    });
                });

                it('should update `memoryRefresh` value when click is triggered', async () => {
                    const spyConfig = jest.spyOn(config, updateUserFnLabel);
                    const expectedValue = { memoryRefresh: true };
                    const menuItem = findMenuItemBuildWindowMenu('Refresh app when idle');
                    await menuItem.click(item);
                    expect(spyConfig).lastCalledWith(expectedValue);
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
                const menuItem = findHelpTroubleshootingMenuItem('Show crash dump in Finder');
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
                    const menuItem = findHelpTroubleshootingMenuItem('Toggle Developer Tools');
                    menuItem.click({}, focusedWindow);
                    expect(spy).toBeCalled();
                });

                it('should call `electron.dialog` when focusedWindow is null', () => {
                    const spy = jest.spyOn(dialog, 'showMessageBox');
                    const focusedWindow = null;
                    const expectedValue = {
                        type: 'warning',
                        buttons: ['Ok'],
                        title: 'Dev Tools disabled',
                        message: 'Dev Tools has been disabled. Please contact your system administrator',
                    };
                    const menuItem = findHelpTroubleshootingMenuItem('Toggle Developer Tools');
                    menuItem.click({}, focusedWindow);
                    expect(spy).lastCalledWith(null, expectedValue);
                });
            });
            it('should call `createMoreInfoWindow` when click in `More Information` menu', () => {
                const spyFn = 'createMoreInfoWindow';
                const spy = jest.spyOn(windowHandler, spyFn);
                const menuItem = findHelpTroubleshootingMenuItem('More Information');
                menuItem.click();
                expect(spy).toBeCalled();
            });
        });
    });
});
