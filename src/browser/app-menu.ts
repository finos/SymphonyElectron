import { app, Menu, session, shell } from 'electron';

import { isMac, isWindowsOS } from '../common/env';
import { i18n, LocaleType } from '../common/i18n';
import { logger } from '../common/logger';
import { autoLaunchInstance as autoLaunch } from './auto-launch-controller';
import { config, IConfig } from './config-handler';
import { exportCrashDumps, exportLogs } from './reports';
import { windowHandler } from './window-handler';
import { updateAlwaysOnTop } from './window-utils';

export const menuSections = {
    about: 'about',
    edit: 'edit',
    view: 'view',
    window: 'window',
    help: 'help', // tslint:disable-line
};

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
    memoryRefresh,
} = config.getConfigFields([
    'minimizeOnClose',
    'launchOnStartup',
    'alwaysOnTop',
    'bringToFront',
    'memoryRefresh',
]) as IConfig;

const menuItemsArray = Object.keys(menuSections)
    .map((key) => menuSections[ key ])
    .filter((value) => isMac ?
        true : value !== menuSections.about);

export class AppMenu {
    private menu: Electron.Menu | undefined;
    private menuList: Electron.MenuItemConstructorOptions[];
    private locale: LocaleType;

    constructor() {
        this.menuList = [];
        this.locale = i18n.getLocale();
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
        if (this.menu) {
            this.menu.popup(opts);
        } else {
            logger.error(`app-menu: tried popup menu, but failed menu not defined`);
        }
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
                    this.assignRoleOrLabel('undo', i18n.t('Undo')()),
                    this.assignRoleOrLabel('redo', i18n.t('Redo')()),
                    this.buildSeparator(),
                    this.assignRoleOrLabel('cut', i18n.t('Cut')()),
                    this.assignRoleOrLabel('copy', i18n.t('Copy')()),
                    this.assignRoleOrLabel('paste', i18n.t('Paste')()),
                    this.assignRoleOrLabel('pasteandmatchstyle', i18n.t('Paste and Match Style')()),
                    this.assignRoleOrLabel('delete', i18n.t('Delete')()),
                    this.assignRoleOrLabel('selectall', i18n.t('Select All')()),
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
                this.assignRoleOrLabel('resetzoom', i18n.t('Actual Size')()),
                this.assignRoleOrLabel('zoomin', i18n.t('Zoom In')()),
                this.assignRoleOrLabel('zoomout', i18n.t('Zoom Out')()),
                this.buildSeparator(),
                this.assignRoleOrLabel('togglefullscreen', i18n.t('Toggle Full Screen')()),
            ],
        };
    }

    /**
     * Builds menu items for window section
     */
    private buildWindowMenu(): Electron.MenuItemConstructorOptions {
        return {
            label: i18n.t('Window')(),
            role: 'window',
            submenu: [
                this.assignRoleOrLabel('minimize', i18n.t('Minimize')()),
                this.assignRoleOrLabel('close', i18n.t('Close')()),
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
                this.buildSeparator(),
                {
                    checked: memoryRefresh,
                    click: async (item) => {
                        memoryRefresh = item.checked;
                        await config.updateUserConfig({ memoryRefresh });
                    },
                    label: i18n.t('Refresh app when idle')(),
                    type: 'checkbox',
                },
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
            ],
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
                        click: () => windowHandler.createMoreInfoWindow(),
                        label: i18n.t('More Information')(),
                    } ],
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
    private assignRoleOrLabel(role: string, label: string) {
        if (isMac) {
            return label ? { role, label } : { role };
        }

        if (isWindowsOS) {
            return label ? { role, label, accelerator: windowsAccelerator[ role ] || '' }
                : { role, accelerator: windowsAccelerator[ role ] || '' };
        }

        return label ? { role, label } : { role };
    }
}
