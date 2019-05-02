import { app, dialog, Menu, MenuItemConstructorOptions, session, shell } from 'electron';

import { isMac, isWindowsOS } from '../common/env';
import { i18n, LocaleType } from '../common/i18n';
import { logger } from '../common/logger';
import { autoLaunchInstance as autoLaunch } from './auto-launch-controller';
import { config, IConfig } from './config-handler';
import { titleBarChangeDialog } from './dialog-handler';
import { exportCrashDumps, exportLogs } from './reports-handler';
import { updateAlwaysOnTop } from './window-actions';
import { ICustomBrowserWindow, windowHandler } from './window-handler';
import { windowExists } from './window-utils';

export const menuSections = {
    about: 'about',
    edit: 'edit',
    view: 'view',
    window: 'window',
    help: 'help', // tslint:disable-line
};

enum TitleBarStyles {
    CUSTOM,
    NATIVE,
}

const windowsAccelerator = Object.assign({
    close: 'Ctrl+W',
    copy: 'Ctrl+C',
    cut: 'Ctrl+X',
    minimize: 'Ctrl+M',
    paste: 'Ctrl+V',
    pasteandmatchstyle: 'Ctrl+Shift+V',
    redo: 'Ctrl+Y',
    resetzoom: 'Ctrl+0',
    selectall: 'Ctrl+A',
    togglefullscreen: 'F11',
    undo: 'Ctrl+Z',
    zoomin: 'Ctrl+Shift+Plus',
    zoomout: 'Ctrl+-',
});

let {
    minimizeOnClose,
    launchOnStartup,
    alwaysOnTop: isAlwaysOnTop,
    bringToFront,
} = config.getConfigFields([
    'minimizeOnClose',
    'launchOnStartup',
    'alwaysOnTop',
    'bringToFront',
]) as IConfig;

const menuItemsArray = Object.keys(menuSections)
    .map((key) => menuSections[ key ])
    .filter((value) => isMac ?
        true : value !== menuSections.about);

export class AppMenu {
    private menu: Electron.Menu | undefined;
    private menuList: Electron.MenuItemConstructorOptions[];
    private locale: LocaleType;
    private titleBarStyle: TitleBarStyles;

    constructor() {
        this.menuList = [];
        this.locale = i18n.getLocale();
        this.titleBarStyle = config.getConfigFields([ 'isCustomTitleBar' ]).isCustomTitleBar
            ? TitleBarStyles.CUSTOM
            : TitleBarStyles.NATIVE;
        this.buildMenu();
    }

    /**
     * Builds the menu items for all the menu
     */
    public buildMenu(): void {
        this.menuList = menuItemsArray.reduce((map: Electron.MenuItemConstructorOptions, key: string) => {
            map[ key ] = this.buildMenuKey(key);
            return map;
        }, this.menuList || {});

        const template = Object.keys(this.menuList)
            .map((key) => this.menuList[ key ]);

        this.menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(this.menu);
    }

    /**
     * Rebuilds the application menu on locale changes
     *
     * @param locale {LocaleType}
     */
    public update(locale: LocaleType): void {
        if (this.locale !== locale) {
            this.buildMenu();
            this.locale = locale;
        }
    }

    /**
     * Displays popup application at the x,y coordinates
     *
     * @param opts {Electron.PopupOptions}
     */
    public popupMenu(opts: Electron.PopupOptions): void {
        if (!this.menu) {
            logger.error(`app-menu: tried popup menu, but failed menu not defined`);
            return;
        }
        this.menu.popup(opts);
    }

    /**
     * Builds menu items based on key provided
     *
     * @param key {string}
     */
    public buildMenuKey(key: string): Electron.MenuItemConstructorOptions {
        switch (key) {
            case menuSections.about:
                return this.buildAboutMenu();
            case menuSections.edit:
                return this.buildEditMenu();
            case menuSections.view:
                return this.buildViewMenu();
            case menuSections.window:
                return this.buildWindowMenu();
            case menuSections.help:
                return this.buildHelpMenu();
            default:
                throw new Error(`app-menu: Invalid ${key}`);
        }
    }

    /**
     * Builds menu items for about symphony section
     */
    private buildAboutMenu(): Electron.MenuItemConstructorOptions {
        return {
            id: menuSections.about,
            label: app.getName(),
            submenu: [
                { label: i18n.t('About Symphony')(), role: 'about' },
                this.buildSeparator(),
                { label: i18n.t('Services')(), role: 'services' },
                this.buildSeparator(),
                { label: i18n.t('Hide Symphony')(), role: 'hide' },
                { label: i18n.t('Hide Others')(), role: 'hideothers' },
                { label: i18n.t('Show All')(), role: 'unhide' },
                this.buildSeparator(),
                { label: i18n.t('Quit Symphony')(), role: 'quit' },
            ],
        };
    }

    /**
     * Builds menu items for edit section
     */
    private buildEditMenu(): Electron.MenuItemConstructorOptions {
        const menu = {
            label: i18n.t('Edit')(),
            submenu:
                [
                    this.assignRoleOrLabel({ role: 'undo', label: i18n.t('Undo')() }),
                    this.assignRoleOrLabel({ role: 'redo', label: i18n.t('Redo')() }),
                    this.buildSeparator(),
                    this.assignRoleOrLabel({ role: 'cut', label: i18n.t('Cut')() }),
                    this.assignRoleOrLabel({ role: 'copy', label: i18n.t('Copy')() }),
                    this.assignRoleOrLabel({ role: 'paste', label: i18n.t('Paste')() }),
                    this.assignRoleOrLabel({ role: 'pasteandmatchstyle', label: i18n.t('Paste and Match Style')() }),
                    this.assignRoleOrLabel({ role: 'delete', label: i18n.t('Delete')() }),
                    this.assignRoleOrLabel({ role: 'selectall', label: i18n.t('Select All')() }),
                ],
        };

        if (isMac) {
            menu.submenu.push(this.buildSeparator(), {
                label: i18n.t('Speech')(),
                submenu: [
                    { label: i18n.t('Start Speaking')(), role: 'startspeaking' },
                    { label: i18n.t('Stop Speaking')(), role: 'stopspeaking' },
                ],
            });
        }
        return menu;
    }

    /**
     * Builds menu items for view section
     */
    private buildViewMenu(): Electron.MenuItemConstructorOptions {
        return {
            label: i18n.t('View')(),
            submenu: [ {
                accelerator: 'CmdOrCtrl+R',
                click: (_item, focusedWindow) => focusedWindow ? focusedWindow.reload() : null,
                label: i18n.t('Reload')(),
            },
                this.buildSeparator(),
                this.assignRoleOrLabel({ role: 'resetzoom', label: i18n.t('Actual Size')() }),
                this.assignRoleOrLabel({ role: 'zoomin', label: i18n.t('Zoom In')() }),
                this.assignRoleOrLabel({ role: 'zoomout', label: i18n.t('Zoom Out')() }),
                this.buildSeparator(),
                this.assignRoleOrLabel({ role: 'togglefullscreen', label: i18n.t('Toggle Full Screen')() }),
            ],
        };
    }

    /**
     * Builds menu items for window section
     */
    private buildWindowMenu(): Electron.MenuItemConstructorOptions {
        const hamburgerMenuItem = isWindowsOS
            ? {
                label: this.titleBarStyle === TitleBarStyles.NATIVE
                    ? i18n.t('Enable Hamburger menu')()
                    : i18n.t('Disable Hamburger menu')(),
                click: () => {
                    const isNativeStyle = this.titleBarStyle === TitleBarStyles.NATIVE;

                    this.titleBarStyle = isNativeStyle ? TitleBarStyles.NATIVE : TitleBarStyles.CUSTOM;
                    titleBarChangeDialog(isNativeStyle);
                },
            }
            : this.buildSeparator();

        const submenu: MenuItemConstructorOptions[] = [
            this.assignRoleOrLabel({ role: 'minimize', label: i18n.t('Minimize')() }),
            this.assignRoleOrLabel({ role: 'close', label: i18n.t('Close')() }),
            this.buildSeparator(),
            {
                checked: launchOnStartup,
                click: async (item) => {
                    if (item.checked) {
                        await autoLaunch.enableAutoLaunch();
                    } else {
                        await autoLaunch.disableAutoLaunch();
                    }
                    launchOnStartup = item.checked;
                    await config.updateUserConfig({ launchOnStartup });
                },
                label: i18n.t('Auto Launch On Startup')(),
                type: 'checkbox',
            },
            {
                checked: isAlwaysOnTop,
                click: async (item) => {
                    isAlwaysOnTop = item.checked;
                    updateAlwaysOnTop(item.checked, true);
                    await config.updateUserConfig({ alwaysOnTop: item.checked });
                },
                label: i18n.t('Always on Top')(),
                type: 'checkbox',
            },
            {
                checked: minimizeOnClose,
                click: async (item) => {
                    minimizeOnClose = item.checked;
                    await config.updateUserConfig({ minimizeOnClose });
                },
                label: i18n.t('Minimize on Close')(),
                type: 'checkbox',
            },
            {
                checked: bringToFront,
                click: async (item) => {
                    bringToFront = item.checked;
                    await config.updateUserConfig({ bringToFront });
                },
                label: isWindowsOS
                    ? i18n.t('Flash Notification in Taskbar')()
                    : i18n.t('Bring to Front on Notifications')(),
                type: 'checkbox',
            },
            hamburgerMenuItem,
            this.buildSeparator(),
            {
                click: (_item, focusedWindow) => {
                    if (focusedWindow && !focusedWindow.isDestroyed()) {
                        const defaultSession = session.defaultSession;
                        if (defaultSession) {
                            defaultSession.clearCache(() => {
                                focusedWindow.reload();
                            });
                        }
                    }
                },
                label: i18n.t('Clear cache and Reload')(),
            },
        ];

        if (isWindowsOS) {
            submenu.push({
                label: i18n.t('About Symphony')(),
                click(_menuItem, focusedWindow) {
                    const windowName = focusedWindow ? (focusedWindow as ICustomBrowserWindow).winName : '';
                    windowHandler.createAboutAppWindow(windowName);
                },
            });
        }

        return {
            label: i18n.t('Window')(),
            role: 'window',
            submenu,
        };
    }

    /**
     * Builds menu items for help section
     */
    private buildHelpMenu(): Electron.MenuItemConstructorOptions {
        return {
            label: i18n.t('Help')(),
            role: 'help',
            submenu:
                [ {
                    click: () => shell.openExternal(i18n.t('Help Url')()),
                    label: i18n.t('Symphony Help')(),
                }, {
                    click: () => shell.openExternal(i18n.t('Symphony Url')()),
                    label: i18n.t('Learn More')(),
                }, {
                    label: i18n.t('Troubleshooting')(),
                    submenu: [ {
                        click: async () => exportLogs(),
                        label: isMac ? i18n.t('Show Logs in Finder')() : i18n.t('Show Logs in Explorer')(),
                    }, {
                        click: () => exportCrashDumps(),
                        label: isMac ? i18n.t('Show crash dump in Finder')() : i18n.t('Show crash dump in Explorer')(),
                    }, {
                        label: i18n.t('Toggle Developer Tools')(),
                        accelerator: isMac ? 'Alt+Command+I' : 'Ctrl+Shift+I',
                        click(_item, focusedWindow) {
                            const devToolsEnabled = config.getGlobalConfigFields([ 'devToolsEnabled' ]);
                            if (!focusedWindow || !windowExists(focusedWindow)) {
                                return;
                            }
                            if (devToolsEnabled) {
                                focusedWindow.webContents.toggleDevTools();
                                return;
                            }
                            dialog.showMessageBox(focusedWindow, {
                                type: 'warning',
                                buttons: [ 'Ok' ],
                                title: i18n.t('Dev Tools disabled')(),
                                message: i18n.t('Dev Tools has been disabled. Please contact your system administrator')(),
                            });
                        },
                    },{
                            click: () => windowHandler.createMoreInfoWindow(),
                            label: i18n.t('More Information')(),
                    }],
                } ],
        };
    }

    /**
     * Builds menu item separator
     */
    private buildSeparator(): Electron.MenuItemConstructorOptions {
        return { type: 'separator' };
    }

    /**
     * Sets respective accelerators w.r.t roles for the menu template
     *
     * @param role {String} The action of the menu item
     * @param label {String} Menu item name
     * @return {Object}
     * @return {Object}.role The action of the menu item
     * @return {Object}.accelerator keyboard shortcuts and modifiers
     */
    private assignRoleOrLabel({ role, label }: MenuItemConstructorOptions): MenuItemConstructorOptions {
        if (isMac) {
            return label ? { role, label } : { role };
        }

        if (isWindowsOS) {
            return label ? { role, label, accelerator: role ? windowsAccelerator[ role ] : '' }
                : { role, accelerator: role ? windowsAccelerator[ role ] : '' };
        }

        return label ? { role, label } : { role };
    }
}
