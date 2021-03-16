import {
  app,
  Menu,
  MenuItemConstructorOptions,
  session,
  shell,
} from 'electron';

import { isLinux, isMac, isWindowsOS } from '../common/env';
import { i18n, LocaleType } from '../common/i18n';
import { logger } from '../common/logger';
import {
  analytics,
  AnalyticsActions,
  AnalyticsElements,
  MenuActionTypes,
} from './analytics-handler';
import { autoLaunchInstance as autoLaunch } from './auto-launch-controller';
import { CloudConfigDataTypes, config, IConfig } from './config-handler';
import { gpuRestartDialog, titleBarChangeDialog } from './dialog-handler';
import { exportCrashDumps, exportLogs } from './reports-handler';
import {
  registerConsoleMessages,
  unregisterConsoleMessages,
  updateAlwaysOnTop,
} from './window-actions';
import { ICustomBrowserWindow, windowHandler } from './window-handler';
import { reloadWindow, windowExists, zoomIn, zoomOut } from './window-utils';

export const menuSections = {
  about: 'about',
  edit: 'edit',
  view: 'view',
  window: 'window',
  help: 'help',
};

const windowsAccelerator = {
  ...{
    close: 'Ctrl+W',
    copy: 'Ctrl+C',
    cut: 'Ctrl+X',
    minimize: 'Ctrl+M',
    paste: 'Ctrl+V',
    pasteAndMatchStyle: 'Ctrl+Shift+V',
    redo: 'Ctrl+Y',
    resetZoom: 'Ctrl+0',
    selectAll: 'Ctrl+A',
    togglefullscreen: 'F11',
    undo: 'Ctrl+Z',
    zoomIn: 'Ctrl+=',
    zoomOut: 'Ctrl+-',
  },
};

const macAccelerator = {
  ...{
    zoomIn: 'CommandOrControl+Plus',
    zoomOut: 'CommandOrControl+-',
  },
};

let {
  minimizeOnClose,
  launchOnStartup,
  alwaysOnTop: isAlwaysOnTop,
  bringToFront,
  memoryRefresh,
  isCustomTitleBar,
  devToolsEnabled,
} = config.getConfigFields([
  'minimizeOnClose',
  'launchOnStartup',
  'alwaysOnTop',
  'bringToFront',
  'memoryRefresh',
  'isCustomTitleBar',
  'devToolsEnabled',
]) as IConfig;
let initialAnalyticsSent = false;

const menuItemsArray = Object.keys(menuSections)
  .map((key) => menuSections[key])
  .filter((value) => (isMac ? true : value !== menuSections.about));

export class AppMenu {
  private menu: Electron.Menu | undefined;
  private menuList: Electron.MenuItemConstructorOptions[];
  private locale: LocaleType;
  private cloudConfig: IConfig | {};

  private readonly menuItemConfigFields: string[];
  private disableGpu: boolean;
  private enableRendererLogs: boolean;

  constructor() {
    this.menuList = [];
    this.locale = i18n.getLocale();
    this.menuItemConfigFields = [
      'minimizeOnClose',
      'launchOnStartup',
      'alwaysOnTop',
      'bringToFront',
      'memoryRefresh',
      'isCustomTitleBar',
      'devToolsEnabled',
    ];
    this.cloudConfig = config.getFilteredCloudConfigFields(
      this.menuItemConfigFields,
    );
    this.disableGpu = config.getConfigFields(['disableGpu']).disableGpu;
    this.enableRendererLogs = config.getConfigFields([
      'enableRendererLogs',
    ]).enableRendererLogs;
    this.buildMenu();
    // send initial analytic
    if (!initialAnalyticsSent) {
      this.sendAnalytics(
        AnalyticsElements.MENU,
        MenuActionTypes.MINIMIZE_ON_CLOSE,
        minimizeOnClose === CloudConfigDataTypes.ENABLED,
      );
      this.sendAnalytics(
        AnalyticsElements.MENU,
        MenuActionTypes.AUTO_LAUNCH_ON_START_UP,
        launchOnStartup === CloudConfigDataTypes.ENABLED,
      );
      this.sendAnalytics(
        AnalyticsElements.MENU,
        MenuActionTypes.ALWAYS_ON_TOP,
        isAlwaysOnTop === CloudConfigDataTypes.ENABLED,
      );
      this.sendAnalytics(
        AnalyticsElements.MENU,
        MenuActionTypes.FLASH_NOTIFICATION_IN_TASK_BAR,
        bringToFront === CloudConfigDataTypes.ENABLED,
      );
      this.sendAnalytics(
        AnalyticsElements.MENU,
        MenuActionTypes.REFRESH_APP_IN_IDLE,
        memoryRefresh === CloudConfigDataTypes.ENABLED,
      );
      this.sendAnalytics(
        AnalyticsElements.MENU,
        MenuActionTypes.HAMBURGER_MENU,
        isMac || isLinux
          ? false
          : isCustomTitleBar === CloudConfigDataTypes.ENABLED,
      );
    }
    initialAnalyticsSent = true;
  }

  /**
   * Builds the menu items for all the menu
   */
  public buildMenu(): void {
    // updates the global variables
    this.updateGlobals();

    this.menuList = menuItemsArray.reduce(
      (map: Electron.MenuItemConstructorOptions, key: string) => {
        map[key] = this.buildMenuKey(key);
        return map;
      },
      this.menuList || {},
    );

    const template = Object.keys(this.menuList).map(
      (key) => this.menuList[key],
    );

    this.menu = Menu.buildFromTemplate(template);
    logger.info(`app-menu: built menu from the provided template`);
    Menu.setApplicationMenu(this.menu);
    logger.info(`app-menu: set application menu`);

    // Remove the default menu for window
    // as we use custom popup menu
    if (isWindowsOS) {
      const mainWindow = windowHandler.getMainWindow();
      if (mainWindow && windowExists(mainWindow)) {
        mainWindow.setMenuBarVisibility(false);
      }
    }
  }

  /**
   * Rebuilds the application menu on locale changes
   *
   * @param locale {LocaleType}
   */
  public update(locale: LocaleType): void {
    if (this.locale !== locale) {
      logger.info(`app-menu: updating the menu for locale ${locale}`);
      this.buildMenu();
      this.locale = locale;
    }
  }

  /**
   * Updates the global variables
   */
  public updateGlobals(): void {
    const configData = config.getConfigFields(
      this.menuItemConfigFields,
    ) as IConfig;
    minimizeOnClose = configData.minimizeOnClose;
    launchOnStartup = configData.launchOnStartup;
    isAlwaysOnTop = configData.alwaysOnTop;
    bringToFront = configData.bringToFront;
    memoryRefresh = configData.memoryRefresh;
    isCustomTitleBar = configData.isCustomTitleBar;
    devToolsEnabled = configData.devToolsEnabled;

    // fetch updated cloud config
    this.cloudConfig = config.getFilteredCloudConfigFields(
      this.menuItemConfigFields,
    );
  }

  /**
   * Displays popup application at the x,y coordinates
   *
   * @param opts {Electron.PopupOptions}
   */
  public popupMenu(opts: Electron.PopupOptions): void {
    if (!this.menu) {
      logger.error(`app-menu: tried popup menu, but failed, menu not defined`);
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
    logger.info(`app-menu: building about menu`);
    return {
      id: menuSections.about,
      label: app.getName(),
      submenu: [
        {
          label: i18n.t('About Symphony')(),
          click(_menuItem, focusedWindow) {
            const windowName = focusedWindow
              ? (focusedWindow as ICustomBrowserWindow).winName
              : '';
            windowHandler.createAboutAppWindow(windowName);
          },
        },
        this.buildSeparator(),
        { label: i18n.t('Services')(), role: 'services' },
        this.buildSeparator(),
        { label: i18n.t('Hide Symphony')(), role: 'hide' },
        { label: i18n.t('Hide Others')(), role: 'hideOthers' },
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
    logger.info(`app-menu: building edit menu`);
    const menu = {
      label: i18n.t('Edit')(),
      submenu: [
        this.assignRoleOrLabel({ role: 'undo', label: i18n.t('Undo')() }),
        this.assignRoleOrLabel({ role: 'redo', label: i18n.t('Redo')() }),
        this.buildSeparator(),
        this.assignRoleOrLabel({ role: 'cut', label: i18n.t('Cut')() }),
        this.assignRoleOrLabel({ role: 'copy', label: i18n.t('Copy')() }),
        this.assignRoleOrLabel({ role: 'paste', label: i18n.t('Paste')() }),
        this.assignRoleOrLabel({
          role: 'pasteAndMatchStyle',
          label: i18n.t('Paste and Match Style')(),
        }),
        this.assignRoleOrLabel({ role: 'delete', label: i18n.t('Delete')() }),
        this.assignRoleOrLabel({
          role: 'selectAll',
          label: i18n.t('Select All')(),
        }),
      ],
    };

    if (isMac) {
      menu.submenu.push(this.buildSeparator(), {
        label: i18n.t('Speech')(),
        submenu: [
          { label: i18n.t('Start Speaking')(), role: 'startSpeaking' },
          { label: i18n.t('Stop Speaking')(), role: 'stopSpeaking' },
        ],
      });
    }
    return menu;
  }

  /**
   * Builds menu items for view section
   */
  private buildViewMenu(): Electron.MenuItemConstructorOptions {
    logger.info(`app-menu: building view menu`);

    const zoomInAccelerator = isMac
      ? macAccelerator.zoomIn
      : isWindowsOS || isLinux
      ? windowsAccelerator.zoomIn
      : '';
    const zoomOutAccelerator = isMac
      ? macAccelerator.zoomOut
      : isWindowsOS || isLinux
      ? windowsAccelerator.zoomOut
      : '';
    return {
      label: i18n.t('View')(),
      submenu: [
        {
          accelerator: 'CmdOrCtrl+R',
          click: (_item, focusedWindow) =>
            focusedWindow
              ? reloadWindow(focusedWindow as ICustomBrowserWindow)
              : null,
          label: i18n.t('Reload')(),
        },
        this.buildSeparator(),
        this.assignRoleOrLabel({
          role: 'resetZoom',
          label: i18n.t('Actual Size')(),
        }),
        this.zoomMenuBuilder(zoomInAccelerator, 'Zoom In', zoomIn, 'zoomIn'),
        this.zoomMenuBuilder(
          zoomOutAccelerator,
          'Zoom Out',
          zoomOut,
          'zoomOut',
        ),
        this.buildSeparator(),
        this.assignRoleOrLabel({
          role: 'togglefullscreen',
          label: i18n.t('Toggle Full Screen')(),
        }),
      ],
    };
  }

  /**
   * Builds menu items for window section
   */
  private buildWindowMenu(): Electron.MenuItemConstructorOptions {
    logger.info(`app-menu: building window menu`);

    const {
      alwaysOnTop: isAlwaysOnTopCC,
      minimizeOnClose: minimizeOnCloseCC,
      launchOnStartup: launchOnStartupCC,
      bringToFront: bringToFrontCC,
      memoryRefresh: memoryRefreshCC,
      isCustomTitleBar: isCustomTitleBarCC,
    } = this.cloudConfig as IConfig;

    const submenu: MenuItemConstructorOptions[] = [
      this.assignRoleOrLabel({ role: 'minimize', label: i18n.t('Minimize')() }),
      this.assignRoleOrLabel({ role: 'close', label: i18n.t('Close')() }),
      this.buildSeparator(),
      {
        checked: launchOnStartup === CloudConfigDataTypes.ENABLED,
        click: async (item) => {
          if (item.checked) {
            autoLaunch.enableAutoLaunch();
          } else {
            autoLaunch.disableAutoLaunch();
          }
          launchOnStartup = item.checked
            ? CloudConfigDataTypes.ENABLED
            : CloudConfigDataTypes.NOT_SET;
          await config.updateUserConfig({ launchOnStartup });
          this.sendAnalytics(
            AnalyticsElements.MENU,
            MenuActionTypes.AUTO_LAUNCH_ON_START_UP,
            item.checked,
          );
        },
        label: i18n.t('Auto Launch On Startup')(),
        type: 'checkbox',
        visible: !isLinux,
        enabled:
          !launchOnStartupCC ||
          launchOnStartupCC === CloudConfigDataTypes.NOT_SET,
      },
      {
        checked: isAlwaysOnTop === CloudConfigDataTypes.ENABLED,
        click: async (item) => {
          isAlwaysOnTop = item.checked
            ? CloudConfigDataTypes.ENABLED
            : CloudConfigDataTypes.NOT_SET;
          await updateAlwaysOnTop(item.checked, true);
          this.sendAnalytics(
            AnalyticsElements.MENU,
            MenuActionTypes.ALWAYS_ON_TOP,
            item.checked,
          );
        },
        label: i18n.t('Always on Top')(),
        type: 'checkbox',
        visible: !isLinux,
        enabled:
          !isAlwaysOnTopCC || isAlwaysOnTopCC === CloudConfigDataTypes.NOT_SET,
      },
      {
        checked: minimizeOnClose === CloudConfigDataTypes.ENABLED,
        click: async (item) => {
          minimizeOnClose = item.checked
            ? CloudConfigDataTypes.ENABLED
            : CloudConfigDataTypes.NOT_SET;
          await config.updateUserConfig({ minimizeOnClose });
          this.sendAnalytics(
            AnalyticsElements.MENU,
            MenuActionTypes.MINIMIZE_ON_CLOSE,
            item.checked,
          );
        },
        label: i18n.t('Minimize on Close')(),
        type: 'checkbox',
        enabled:
          !minimizeOnCloseCC ||
          minimizeOnCloseCC === CloudConfigDataTypes.NOT_SET,
      },
      {
        checked: bringToFront === CloudConfigDataTypes.ENABLED,
        click: async (item) => {
          bringToFront = item.checked
            ? CloudConfigDataTypes.ENABLED
            : CloudConfigDataTypes.NOT_SET;
          await config.updateUserConfig({ bringToFront });
          this.sendAnalytics(
            AnalyticsElements.MENU,
            MenuActionTypes.FLASH_NOTIFICATION_IN_TASK_BAR,
            item.checked,
          );
        },
        label: isWindowsOS
          ? i18n.t('Flash Notification in Taskbar')()
          : i18n.t('Bring to Front on Notifications')(),
        type: 'checkbox',
        enabled:
          !bringToFrontCC || bringToFrontCC === CloudConfigDataTypes.NOT_SET,
      },
      this.buildSeparator(),
      {
        label:
          isCustomTitleBar === CloudConfigDataTypes.DISABLED ||
          isCustomTitleBar === CloudConfigDataTypes.NOT_SET
            ? i18n.t('Enable Hamburger menu')()
            : i18n.t('Disable Hamburger menu')(),
        visible: isWindowsOS,
        click: () => {
          titleBarChangeDialog(
            isCustomTitleBar === CloudConfigDataTypes.DISABLED
              ? CloudConfigDataTypes.ENABLED
              : CloudConfigDataTypes.DISABLED,
          );
          this.sendAnalytics(
            AnalyticsElements.MENU,
            MenuActionTypes.HAMBURGER_MENU,
            isCustomTitleBar === CloudConfigDataTypes.ENABLED,
          );
        },
        enabled:
          !isCustomTitleBarCC ||
          isCustomTitleBarCC === CloudConfigDataTypes.NOT_SET,
      },
      {
        checked: memoryRefresh === CloudConfigDataTypes.ENABLED,
        click: async (item) => {
          memoryRefresh = item.checked
            ? CloudConfigDataTypes.ENABLED
            : CloudConfigDataTypes.NOT_SET;
          await config.updateUserConfig({ memoryRefresh });
          this.sendAnalytics(
            AnalyticsElements.MENU,
            MenuActionTypes.REFRESH_APP_IN_IDLE,
            item.checked,
          );
        },
        label: i18n.t('Refresh app when idle')(),
        type: 'checkbox',
        enabled:
          !memoryRefreshCC || memoryRefreshCC === CloudConfigDataTypes.NOT_SET,
      },
      {
        click: async (_item, focusedWindow) => {
          if (focusedWindow && !focusedWindow.isDestroyed()) {
            const defaultSession = session.defaultSession;
            if (defaultSession) {
              await defaultSession.clearCache();
              reloadWindow(focusedWindow as ICustomBrowserWindow);
            }
          }
        },
        label: i18n.t('Clear cache and Reload')(),
      },
      this.buildSeparator(),
    ];

    if (isWindowsOS) {
      submenu.push({
        role: 'quit',
        visible: isWindowsOS,
        label: i18n.t('Quit Symphony')(),
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
    logger.info(`app-menu: building help menu`);
    let showLogsLabel: string = i18n.t('Show Logs in Explorer')();
    if (isMac) {
      showLogsLabel = i18n.t('Show Logs in Finder')();
    }
    if (isLinux) {
      showLogsLabel = i18n.t('Show Logs in File Manager')();
    }

    let showCrashesLabel: string = i18n.t('Show crash dump in Explorer')();
    if (isMac) {
      showCrashesLabel = i18n.t('Show crash dump in Finder')();
    }
    if (isLinux) {
      showCrashesLabel = i18n.t('Show crash dump in File Manager')();
    }
    const { devToolsEnabled: isDevToolsEnabledCC } = this
      .cloudConfig as IConfig;

    return {
      label: i18n.t('Help')(),
      role: 'help',
      submenu: [
        {
          click: () => shell.openExternal(i18n.t('Help Url')()),
          label: i18n.t('Symphony Help')(),
        },
        {
          click: () => shell.openExternal(i18n.t('Symphony Url')()),
          label: i18n.t('Learn More')(),
        },
        {
          label: i18n.t('Troubleshooting')(),
          submenu: [
            {
              click: async () => exportLogs(),
              label: showLogsLabel,
            },
            {
              click: () => exportCrashDumps(),
              label: showCrashesLabel,
            },
            {
              label: i18n.t('Toggle Developer Tools')(),
              accelerator: isMac ? 'Alt+Command+I' : 'Ctrl+Shift+I',
              visible:
                (typeof isDevToolsEnabledCC === 'boolean' &&
                  isDevToolsEnabledCC) ||
                devToolsEnabled,
              click(_item, focusedWindow) {
                if (!focusedWindow || !windowExists(focusedWindow)) {
                  return;
                }
                if (devToolsEnabled) {
                  focusedWindow.webContents.toggleDevTools();
                  return;
                }
              },
            },
            {
              label: this.disableGpu
                ? i18n.t('Enable GPU')()
                : i18n.t('Disable GPU')(),
              click: () => {
                gpuRestartDialog(!this.disableGpu);
              },
            },
            {
              label: i18n.t('Enable Renderer Logs')(),
              type: 'checkbox',
              checked: this.enableRendererLogs,
              click: async () => {
                if (this.enableRendererLogs) {
                  this.enableRendererLogs = false;
                  unregisterConsoleMessages();
                } else {
                  this.enableRendererLogs = true;
                  registerConsoleMessages();
                }
                const enableRendererLogs = this.enableRendererLogs;
                await config.updateUserConfig({ enableRendererLogs });
                logger.info(
                  'New value for enableRendererLogs: ' +
                    this.enableRendererLogs,
                );
              },
            },
          ],
        },
        {
          label: i18n.t('About Symphony')(),
          visible: isWindowsOS || isLinux,
          click(_menuItem, focusedWindow) {
            const windowName = focusedWindow
              ? (focusedWindow as ICustomBrowserWindow).winName
              : '';
            windowHandler.createAboutAppWindow(windowName);
          },
        },
      ],
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
  private assignRoleOrLabel({
    role,
    label,
  }: MenuItemConstructorOptions): MenuItemConstructorOptions {
    logger.info(
      `app-menu: assigning role & label respectively for ${role} & ${label}`,
    );
    if (isLinux) {
      return label ? { role, label } : { role };
    }

    if (isMac) {
      return label
        ? { role, label, accelerator: role ? macAccelerator[role] : '' }
        : { role, accelerator: role ? macAccelerator[role] : '' };
    }

    if (isWindowsOS) {
      return label
        ? { role, label, accelerator: role ? windowsAccelerator[role] : '' }
        : { role, accelerator: role ? windowsAccelerator[role] : '' };
    }

    return label ? { role, label } : { role };
  }

  /**
   * Sends analytics events
   *
   * @param element {AnalyticsElements}
   * @param type {MenuActionTypes}
   * @param result {Boolean}
   */
  private sendAnalytics(
    element: AnalyticsElements,
    type: MenuActionTypes,
    result: boolean,
  ): void {
    analytics.track({
      element,
      action_type: type,
      action_result: result
        ? AnalyticsActions.ENABLED
        : AnalyticsActions.DISABLED,
    });
  }

  /**
   * Build zoom menu for view section
   */
  private zoomMenuBuilder(
    accelerator: string,
    label: string,
    action: () => void,
    role: MenuItemConstructorOptions['role'],
  ): MenuItemConstructorOptions {
    if (windowHandler.isMana) {
      return {
        accelerator,
        label: i18n.t(label)(),
        click: (_item, focusedWindow) => (focusedWindow ? action() : null),
      };
    } else {
      return this.assignRoleOrLabel({ role, label: i18n.t(label)() });
    }
  }
}
