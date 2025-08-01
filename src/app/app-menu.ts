import {
  BaseWindow,
  BrowserWindow,
  Menu,
  MenuItemConstructorOptions,
  session,
  shell,
} from 'electron';

import { productDisplayName } from '../../package.json';
import { apiName } from '../common/api-interface';
import { isLinux, isMac, isWindowsOS } from '../common/env';
import { i18n, LocaleType } from '../common/i18n';
import { logger } from '../common/logger';
import { analytics } from './bi/analytics-handler';
import { CloudConfigDataTypes, config, IConfig } from './config-handler';
import { restartDialog, titleBarChangeDialog } from './dialog-handler';
import { exportCrashDumps, exportLogs } from './reports-handler';
import {
  registerConsoleMessages,
  unregisterConsoleMessages,
  updateAlwaysOnTop,
} from './window-actions';
import {
  ClientSwitchType,
  ICustomBrowserWindow,
  windowHandler,
} from './window-handler';
import {
  isValidHttpUrl,
  reloadWindow,
  resetZoomLevel,
  windowExists,
  zoomIn,
  zoomOut,
} from './window-utils';

import { autoLaunchInstance as autoLaunch } from './auto-launch-controller';
import { autoUpdate, AutoUpdateTrigger } from './auto-update-handler';
import {
  AnalyticsActions,
  AnalyticsElements,
  MenuActionTypes,
} from './bi/interface';
import { miniViewHandler } from './mini-view-handler';
import { sdaMenuStore } from './stores';

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
    miniView: 'Ctrl+Shift+M',
  },
};

const macAccelerator = {
  ...{
    zoomIn: 'CommandOrControl+Plus',
    zoomOut: 'CommandOrControl+-',
    resetZoom: 'CommandOrControl+0',
    pasteAndMatchStyle: 'Cmd+Shift+V',
    miniView: 'CommandOrControl+Shift+M',
  },
};

const menuItemConfigFields = [
  'minimizeOnClose',
  'launchOnStartup',
  'alwaysOnTop',
  'bringToFront',
  'memoryRefresh',
  'isCustomTitleBar',
  'devToolsEnabled',
  'isAutoUpdateEnabled',
  'enableBrowserLogin',
  'forceAutoUpdate',
  'betaAutoUpdateChannelEnabled',
  'latestAutoUpdateChannelEnabled',
];

let {
  minimizeOnClose,
  launchOnStartup,
  alwaysOnTop: isAlwaysOnTop,
  bringToFront,
  memoryRefresh,
  isCustomTitleBar,
  devToolsEnabled,
  isAutoUpdateEnabled,
  enableBrowserLogin,
  forceAutoUpdate,
  betaAutoUpdateChannelEnabled,
  latestAutoUpdateChannelEnabled,
} = config.getConfigFields(menuItemConfigFields) as IConfig;
const CORP_URL = 'https://corporate.symphony.com';
const SDA_CHANNELS_MENU_ID = 'sda-channels';
const C2_CHANNELS_MENU_ID = 'c2-channels';

enum Target {
  C2 = 'C2',
  SDA = 'SDA',
}

enum Channels {
  Daily = 'daily',
  Beta = 'beta',
  Stable = 'stable',
  Latest = 'latest',
  IV = 'iv',
}

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
  private helpMenuSingleton = sdaMenuStore.getHelpMenuSingleton();

  constructor() {
    this.menuList = [];
    this.locale = i18n.getLocale();
    this.menuItemConfigFields = menuItemConfigFields;
    this.cloudConfig = config.getFilteredCloudConfigFields(
      this.menuItemConfigFields,
    );
    this.disableGpu = config.getConfigFields(['disableGpu']).disableGpu;
    this.enableRendererLogs = config.getConfigFields([
      'enableRendererLogs',
    ]).enableRendererLogs;

    this.buildMenu();
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

    // Remove the default menu for window
    // as we use custom popup menu
    if (isWindowsOS) {
      const mainWindow = windowHandler.getMainWindow();
      if (mainWindow && windowExists(mainWindow)) {
        mainWindow.setMenuBarVisibility(false);
      }
    } else {
      logger.info(`app-menu: set application menu`);
      Menu.setApplicationMenu(this.menu);
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
    isAutoUpdateEnabled = configData.isAutoUpdateEnabled;
    enableBrowserLogin = configData.enableBrowserLogin;
    forceAutoUpdate = configData.forceAutoUpdate;
    betaAutoUpdateChannelEnabled = configData.betaAutoUpdateChannelEnabled;
    latestAutoUpdateChannelEnabled = configData.latestAutoUpdateChannelEnabled;
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
    const isCorp =
      (windowHandler.url &&
        windowHandler.url.startsWith('https://corporate.symphony.com')) ||
      false;
    return {
      id: menuSections.about,
      label: productDisplayName,
      submenu: [
        {
          label: i18n.t('About Symphony Messaging')(),
          click(_menuItem, focusedWindow) {
            const windowName = focusedWindow
              ? (focusedWindow as ICustomBrowserWindow).winName
              : '';
            windowHandler.createAboutAppWindow(windowName);
          },
        },
        this.buildSeparator(),
        {
          click: (_item) => {
            autoUpdate.checkUpdates(AutoUpdateTrigger.MANUAL);
          },
          visible:
            isMac &&
            !!(
              (isAutoUpdateEnabled || forceAutoUpdate) &&
              (betaAutoUpdateChannelEnabled ||
                latestAutoUpdateChannelEnabled ||
                isCorp)
            ) &&
            !!windowHandler.isMana,
          label: i18n.t('Check for updates')(),
        },
        this.buildSeparator(),
        { label: i18n.t('Services')(), role: 'services' },
        this.buildSeparator(),
        { label: i18n.t('Hide Symphony Messaging')(), role: 'hide' },
        { label: i18n.t('Hide Others')(), role: 'hideOthers' },
        { label: i18n.t('Show All')(), role: 'unhide' },
        this.buildSeparator(),
        { label: i18n.t('Quit Symphony Messaging')(), role: 'quit' },
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
          label: i18n.t('Paste as plain text')(),
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
    const resetZoomAccelerator = isMac
      ? macAccelerator.resetZoom
      : isWindowsOS || isLinux
      ? windowsAccelerator.resetZoom
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
        this.zoomMenuBuilder(
          resetZoomAccelerator,
          'Actual Size',
          resetZoomLevel,
          'resetZoom',
        ),
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

    const miniViewAccelerator = isMac
      ? macAccelerator.miniView
      : isWindowsOS || isLinux
      ? windowsAccelerator.miniView
      : '';

    const submenu: MenuItemConstructorOptions[] = [
      this.assignRoleOrLabel({ role: 'minimize', label: i18n.t('Minimize')() }),
      this.assignRoleOrLabel({ role: 'close', label: i18n.t('Close')() }),
      {
        click: async () => {
          if (windowHandler.getIsMiniViewEnabled()) {
            miniViewHandler.deactivateMiniView();
          } else {
            miniViewHandler.activateMiniView();
          }
        },
        accelerator: miniViewAccelerator,
        label: windowHandler.getIsMiniViewEnabled()
          ? i18n.t('Exit Mini View')()
          : i18n.t('Mini View')(),
        type: 'normal',
        visible: windowHandler.getIsMiniViewFeatureEnabled(),
      },
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
        type: 'checkbox',
        label: i18n.t('Browser login')(),
        checked: enableBrowserLogin,
        click: () => {
          restartDialog({ enableBrowserLogin: !enableBrowserLogin });
        },
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
        label: i18n.t('Quit Symphony Messaging')(),
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
    let showCrashesLabel: string = i18n.t('Show crash dump in Explorer')();

    if (isMac) {
      showLogsLabel = i18n.t('Show Logs in Finder')();
      showCrashesLabel = i18n.t('Show crash dump in Finder')();
    } else if (isLinux) {
      showLogsLabel = i18n.t('Show Logs in File Manager')();
      showCrashesLabel = i18n.t('Show crash dump in File Manager')();
    }

    const { devToolsEnabled: isDevToolsEnabledCC } = this
      .cloudConfig as IConfig;
    const isCorp =
      (windowHandler.url &&
        windowHandler.url.startsWith('https://corporate.symphony.com')) ||
      false;
    const updateChannel = this.getUpdateChannel();

    return {
      label: i18n.t('Help')(),
      role: 'help',
      submenu: [
        {
          click: () => shell.openExternal(i18n.t('Help Url')()),
          label: i18n.t('Symphony Help')(),
        },
        {
          click: () => this.onHelpUrlClick(),
          label: this.helpMenuSingleton.getValue()?.linkText,
          visible:
            !!this.helpMenuSingleton.getValue()?.linkAddress &&
            !!this.helpMenuSingleton.getValue()?.enabled,
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
              accelerator: 'Ctrl+Shift+D',
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
              click(_item, _window: BaseWindow | undefined) {
                if (devToolsEnabled) {
                  const focusedWindow = BrowserWindow.getFocusedWindow();
                  if (!focusedWindow || !windowExists(focusedWindow)) {
                    return;
                  }
                  if (
                    (focusedWindow as ICustomBrowserWindow).winName ===
                    apiName.mainWindowName
                  ) {
                    const mainWebContents = windowHandler.getMainWebContents();
                    if (mainWebContents && !mainWebContents.isDestroyed()) {
                      mainWebContents.toggleDevTools();
                    }
                  } else {
                    focusedWindow.webContents.toggleDevTools();
                  }
                  return;
                }
              },
            },
            {
              label: this.disableGpu
                ? i18n.t('Enable GPU')()
                : i18n.t('Disable GPU')(),
              click: () => {
                restartDialog({ disableGpu: !this.disableGpu });
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
          click: (_item) => {
            autoUpdate.checkUpdates(AutoUpdateTrigger.MANUAL);
          },
          visible:
            isWindowsOS &&
            !!(
              (isAutoUpdateEnabled || forceAutoUpdate) &&
              (betaAutoUpdateChannelEnabled ||
                latestAutoUpdateChannelEnabled ||
                isCorp)
            ) &&
            !!windowHandler.isMana,
          label: i18n.t('Check for updates')(),
        },
        {
          label: i18n.t('Client 2.0 channel')(),
          visible: isCorp,
          id: C2_CHANNELS_MENU_ID,
          submenu: [
            {
              click: (_item) => this.switchTo(Channels.Stable),
              visible: isCorp,
              type: 'checkbox',
              checked:
                windowHandler.url?.startsWith(CORP_URL) &&
                !windowHandler.url?.includes('daily'),
              id: `${Target.C2}-${Channels.Stable}`,
              label: i18n.t('Stable')(),
              accelerator: 'CmdorCtrl+1',
            },
            {
              click: (_item) => this.switchTo(Channels.Daily),
              visible: isCorp,
              type: 'checkbox',
              checked:
                windowHandler.url?.startsWith(CORP_URL) &&
                windowHandler.url.includes('daily'),
              id: `${Target.C2}-${Channels.Daily}`,
              label: i18n.t('Daily')(),
              accelerator: 'CmdorCtrl+2',
            },
          ],
        },
        {
          label: i18n.t('SDA update channel')(),
          id: SDA_CHANNELS_MENU_ID,
          visible: isCorp,
          submenu: [
            {
              id: `${Target.SDA}-${Channels.Stable}`,
              click: (_item) =>
                this.setUpdateChannelForMenuEntry(Target.SDA, Channels.Stable),
              visible: isCorp,
              type: 'checkbox',
              checked: updateChannel === Channels.Stable,
              label: i18n.t('Stable')(),
            },
            {
              id: `${Target.SDA}-${Channels.Latest}`,
              click: (_item) =>
                this.setUpdateChannelForMenuEntry(Target.SDA, Channels.Latest),
              visible: isCorp,
              type: 'checkbox',
              checked: updateChannel === Channels.Latest,
              label: i18n.t('Latest')(),
            },
            {
              id: `${Target.SDA}-${Channels.IV}`,
              click: (_item) =>
                this.setUpdateChannelForMenuEntry(Target.SDA, Channels.IV),
              visible: isCorp && isWindowsOS,
              type: 'checkbox',
              checked: updateChannel === Channels.IV,
              label: i18n.t('IV Dogfooding')(),
            },
            {
              id: `${Target.SDA}-${Channels.Beta}`,
              click: (_item) =>
                this.setUpdateChannelForMenuEntry(Target.SDA, Channels.Beta),
              visible: isCorp,
              type: 'checkbox',
              checked: updateChannel === Channels.Beta,
              label: i18n.t('Beta')(),
            },
            {
              id: `${Target.SDA}-${Channels.Daily}`,
              click: (_item) =>
                this.setUpdateChannelForMenuEntry(Target.SDA, Channels.Daily),
              visible: isCorp,
              type: 'checkbox',
              checked: updateChannel === Channels.Daily,
              label: i18n.t('Daily')(),
            },
          ],
        },
        {
          label: i18n.t('About Symphony Messaging')(),
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
    _role: MenuItemConstructorOptions['role'],
  ): MenuItemConstructorOptions {
    return {
      accelerator,
      label: i18n.t(label)(),
      click: (_item, focusedWindow) => (focusedWindow ? action() : null),
    };
  }

  /**
   * Returns auto-updage channel
   * @return {string} Auto-update channel
   */
  private getUpdateChannel() {
    const { autoUpdateChannel } = config.getConfigFields(['autoUpdateChannel']);
    return autoUpdateChannel;
  }

  /**
   * Updates auto-updage channel
   * @param autoUpdateChannel {string}
   */
  private async setUpdateChannelForMenuEntry(
    target: Target,
    autoUpdateChannel: Channels,
  ) {
    const menuId =
      target === Target.SDA ? SDA_CHANNELS_MENU_ID : C2_CHANNELS_MENU_ID;
    await config.updateUserConfig({ autoUpdateChannel });
    this.menu?.getMenuItemById(menuId)?.submenu?.items.map((item) => {
      if (item.id !== `${target}-${autoUpdateChannel}`) {
        item.checked = false;
      }
    });
    autoUpdate.checkUpdates(AutoUpdateTrigger.MANUAL);
  }

  /**
   * Allow user to switch C2 from stable to daily
   * @param channel Targeted C2 channel
   */
  private switchTo(channel: Channels) {
    let clientSwitchType;
    switch (channel) {
      case Channels.Daily:
        clientSwitchType = ClientSwitchType.STARTPAGE_CLIENT_2_0_DAILY;
        break;
      case Channels.Stable:
        clientSwitchType = ClientSwitchType.STARTPAGE_CLIENT_2_0;
        break;
      default:
        break;
    }
    if (clientSwitchType) {
      windowHandler.switchClient(clientSwitchType);
    }
  }

  private onHelpUrlClick = () => {
    logger.info('app-menu: Checking if help URL is a valid one');
    const isValidURL = isValidHttpUrl(
      this.helpMenuSingleton.getValue()?.linkAddress || '',
    );

    if (isValidURL) {
      logger.info(
        `app-menu: Verification suceed, valid URL, opening ${
          this.helpMenuSingleton.getValue()?.linkAddress
        }`,
      );
      shell.openExternal(this.helpMenuSingleton.getValue()?.linkAddress ?? '');
    }
    logger.info(
      `app-menu: Verification failure, invalid URL ${
        this.helpMenuSingleton.getValue()?.linkAddress
      }`,
    );
  };
}
