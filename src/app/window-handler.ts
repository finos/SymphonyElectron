import { ExecException, execFile } from 'child_process';
import {
  app,
  BrowserView,
  BrowserWindow,
  BrowserWindowConstructorOptions,
  crashReporter,
  DesktopCapturerSource,
  dialog,
  Event,
  ipcMain,
  nativeTheme,
  RenderProcessGoneDetails,
  screen,
  shell,
  WebContents,
} from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { format, parse } from 'url';

import { apiName, Themes, WindowTypes } from '../common/api-interface';
import { isDevEnv, isLinux, isMac, isWindowsOS } from '../common/env';
import { i18n, LocaleType } from '../common/i18n';
import { ScreenShotAnnotation } from '../common/ipcEvent';
import { logger } from '../common/logger';
import {
  calculatePercentage,
  getCommandLineArgs,
  getGuid,
  throttle,
} from '../common/utils';
import { notification } from '../renderer/notification';
import { cleanAppCacheOnCrash } from './app-cache-handler';
import { AppMenu } from './app-menu';
import { closeC9Pipe } from './c9-pipe-handler';
import { handleChildWindow } from './child-window-handler';
import {
  CloudConfigDataTypes,
  config,
  IConfig,
  IGlobalConfig,
} from './config-handler';
import crashHandler from './crash-handler';
import LocalMenuShortcuts from './local-menu-shortcuts';
import { mainEvents } from './main-event-handler';
import { presenceStatus } from './presence-status-handler';
import { exportLogs } from './reports-handler';
import { SpellChecker } from './spell-check-handler';
import { winStore } from './stores';
import { checkIfBuildExpired } from './ttl-handler';
import { versionHandler } from './version-handler';
import {
  handlePermissionRequests,
  monitorWindowActions,
  onConsoleMessages,
} from './window-actions';
import {
  createComponentWindow,
  didVerifyAndRestoreWindow,
  getBounds,
  getWindowByName,
  handleCertificateProxyVerification,
  handleDownloadManager,
  initSysTray,
  injectStyles,
  isSymphonyReachable,
  loadBrowserViews,
  monitorNetworkInterception,
  preventWindowNavigation,
  reloadWindow,
  viewExists,
  windowExists,
} from './window-utils';

const windowSize: string | null = getCommandLineArgs(
  process.argv,
  '--window-size',
  false,
);

export enum ClientSwitchType {
  CLIENT_2_0 = 'CLIENT_2_0',
  CLIENT_2_0_DAILY = 'CLIENT_2_0_DAILY',
  STARTPAGE_CLIENT_2_0 = 'START_PAGE_CLIENT_2_0',
  STARTPAGE_CLIENT_2_0_DAILY = 'START_PAGE_CLIENT_2_0_DAILY',
}

export const DEFAULT_WELCOME_SCREEN_WIDTH: number = 542;
export const DEFAULT_WELCOME_SCREEN_HEIGHT: number = 333;

const MAIN_WEB_CONTENTS_EVENTS = ['enter-full-screen', 'leave-full-screen'];
const SHORTCUT_KEY_THROTTLE = 1000; // 1sec

export interface ICustomBrowserWindowConstructorOpts
  extends Electron.BrowserWindowConstructorOptions {
  winKey: string;
}

export interface ICustomBrowserWindow extends Electron.BrowserWindow {
  winName: string;
  notificationData?: object;
  origin?: string;
}

export interface ICustomBrowserView extends Electron.BrowserView {
  winName: string;
  notificationData?: object;
  origin?: string;
}

// Default window width & height
export const DEFAULT_WIDTH: number = 900;
export const DEFAULT_HEIGHT: number = 900;
export const TITLE_BAR_HEIGHT: number = 32;
export const IS_SAND_BOXED: boolean = true;
export const IS_NODE_INTEGRATION_ENABLED: boolean = false;
export const AUX_CLICK = 'Auxclick';
// Timeout on restarting SDA in case it's stuck
const LISTEN_TIMEOUT: number = 25 * 1000;

export class WindowHandler {
  /**
   * Verifies if the url is valid and
   * forcefully appends https if not present
   *
   * @param configURL {string}
   */
  private static getValidUrl(configURL: string): string {
    const parsedUrl = parse(configURL);

    if (!parsedUrl.protocol || parsedUrl.protocol !== 'https') {
      parsedUrl.protocol = 'https:';
      parsedUrl.slashes = true;
    }
    return format(parsedUrl);
  }
  public mainView: ICustomBrowserView | null = null;
  public titleBarView: ICustomBrowserView | null = null;
  public welcomeScreenWindow: BrowserWindow | null = null;
  public mainWebContents: WebContents | undefined;
  public appMenu: AppMenu | null = null;
  public isAutoReload: boolean = false;
  public isOnline: boolean = true;
  public url: string | undefined;
  public startUrl!: string;
  public isMana: boolean = false;
  public willQuitApp: boolean = false;
  public spellchecker: SpellChecker | undefined;
  public isCustomTitleBar: boolean = isWindowsOS;
  public isWebPageLoading: boolean = true;
  public isLoggedIn: boolean = false;
  public isAutoUpdating: boolean = false;
  public screenShareIndicatorFrameUtil: string;
  private contextIsolation: boolean = true;
  private backgroundThrottling: boolean = false;
  private windowOpts: ICustomBrowserWindowConstructorOpts =
    {} as ICustomBrowserWindowConstructorOpts;
  private globalConfig: IGlobalConfig = {} as IGlobalConfig;
  private config: IConfig = {} as IConfig;
  // Window reference
  private windows: object = {};
  private userConfig: IConfig = {} as IConfig;
  private loadFailError: string | undefined;
  private mainWindow: ICustomBrowserWindow | null = null;
  private aboutAppWindow: Electron.BrowserWindow | null = null;
  private screenPickerWindow: Electron.BrowserWindow | null = null;
  private screenPickerPlaceholderWindow: Electron.BrowserWindow | null = null;
  private screenSharingIndicatorWindow: Electron.BrowserWindow | null = null;
  private screenSharingFrameWindow: Electron.BrowserWindow | null = null;
  private basicAuthWindow: Electron.BrowserWindow | null = null;
  private notificationSettingsWindow: Electron.BrowserWindow | null = null;
  private snippingToolWindow: Electron.BrowserWindow | null = null;
  private finishedLoading: boolean = false;
  private readonly opts: Electron.BrowserViewConstructorOptions | undefined;
  private hideOnCapture: boolean = false;
  private currentWindow?: string = undefined;
  private isPodConfigured: boolean = false;
  private shouldShowWelcomeScreen: boolean = true;
  private didShowWelcomeScreen: boolean = false;

  constructor(opts?: Electron.BrowserViewConstructorOptions) {
    this.opts = opts;
    this.screenShareIndicatorFrameUtil = '';
    if (isWindowsOS) {
      this.screenShareIndicatorFrameUtil = isDevEnv
        ? path.join(
            __dirname,
            '../../../node_modules/screen-share-indicator-frame/ScreenShareIndicatorFrame.exe',
          )
        : path.join(
            path.dirname(app.getPath('exe')),
            'ScreenShareIndicatorFrame.exe',
          );
    } else if (isMac) {
      this.screenShareIndicatorFrameUtil = isDevEnv
        ? path.join(
            __dirname,
            '../../../node_modules/screen-share-indicator-frame/SymphonyScreenShareIndicator',
          )
        : path.join(
            path.dirname(app.getPath('exe')),
            '../node_modules/screen-share-indicator-frame/SymphonyScreenShareIndicator',
          );
    }
    this.listenForLoad();
  }

  /**
   * Starting point of the app
   */
  public async createApplication() {
    // Use these variables only on initial setup
    this.config = config.getConfigFields([
      'isCustomTitleBar',
      'mainWinPos',
      'minimizeOnClose',
      'notificationSettings',
      'alwaysOnTop',
      'locale',
      'customFlags',
      'clientSwitch',
      'enableRendererLogs',
      'enableBrowserLogin',
      'browserLoginAutoConnect',
    ]);
    logger.info(
      `window-handler: main windows initialized with following config data`,
      this.config,
    );
    this.globalConfig = config.getGlobalConfigFields([
      'url',
      'contextIsolation',
      'contextOriginUrl',
      'overrideUserAgent',
    ]);
    this.userConfig = config.getUserConfigFields(['url']);
    const { customFlags } = this.config;
    const { disableThrottling } = config.getCloudConfigFields([
      'disableThrottling',
    ]) as any;
    if (this.globalConfig.contextIsolation !== undefined) {
      this.contextIsolation = this.globalConfig.contextIsolation;
    }
    this.backgroundThrottling =
      customFlags.disableThrottling !== CloudConfigDataTypes.ENABLED ||
      disableThrottling !== CloudConfigDataTypes.ENABLED;
    this.isCustomTitleBar =
      isWindowsOS &&
      this.config.isCustomTitleBar === CloudConfigDataTypes.ENABLED;
    // Get url to load from cmd line or from global config file
    const urlFromCmd = getCommandLineArgs(process.argv, '--url=', false);
    this.isPodConfigured = !config.isFirstTimeLaunch();
    this.didShowWelcomeScreen = false;
    this.shouldShowWelcomeScreen =
      config.isFirstTimeLaunch() || !!this.config.enableBrowserLogin;

    this.windowOpts = {
      ...this.getWindowOpts(
        {
          alwaysOnTop:
            this.config.alwaysOnTop === CloudConfigDataTypes.ENABLED || false,
          frame: !this.isCustomTitleBar,
          minHeight: 300,
          minWidth: 300,
          title: 'Symphony',
          show: false,
        },
        {
          preload: path.join(__dirname, '../renderer/_preload-main.js'),
        },
      ),
      ...this.opts,
    };
    const locale: LocaleType = (this.config.locale ||
      app.getLocale()) as LocaleType;
    i18n.setLocale(locale);

    logger.info(`window handler: env details`, {
      contextIsolation: this.contextIsolation,
      isDevEnv,
      isMac,
      isWindowsOS,
      isLinux,
    });
    this.spellchecker = new SpellChecker();
    logger.info(
      `window-handler: initialized spellchecker module with locale ${this.spellchecker.locale}`,
    );

    logger.info(
      'window-handler: createApplication mainWinPos: ' +
        JSON.stringify(this.config.mainWinPos),
    );

    const { isFullScreen, isMaximized } = this.config.mainWinPos
      ? this.config.mainWinPos
      : { isFullScreen: false, isMaximized: false };

    this.url = WindowHandler.getValidUrl(
      this.userConfig.url ? this.userConfig.url : this.globalConfig.url,
    );
    logger.info(`window-handler: setting url ${this.url} from config file!`);

    // set window opts with additional config
    this.mainWindow = new BrowserWindow({
      ...this.windowOpts,
      ...getBounds(this.config.mainWinPos, DEFAULT_WIDTH, DEFAULT_HEIGHT),
    }) as ICustomBrowserWindow;
    const localMenuShortcuts = new LocalMenuShortcuts();
    localMenuShortcuts.buildShortcutMenu();

    logger.info('window-handler: windowSize: ' + JSON.stringify(windowSize));
    if (windowSize) {
      const args = windowSize.split('=');
      const sizes = args[1].split(',');
      logger.info('window-handler: windowSize: args: ' + JSON.stringify(args));
      logger.info(
        'window-handler: windowSize: sizes: ' + JSON.stringify(sizes),
      );
      if (this.mainWindow && windowExists(this.mainWindow)) {
        this.mainWindow.setSize(Number(sizes[0]), Number(sizes[1]));
      }
    }

    // Hide electron's default menu bar for Windows
    if (isWindowsOS && this.mainWindow && windowExists(this.mainWindow)) {
      this.mainWindow.setMenuBarVisibility(false);
    }

    logger.info(
      'window-handler: this.mainWindow.getBounds: ' +
        JSON.stringify(this.mainWindow.getBounds()),
    );

    this.mainWindow.winName = apiName.mainWindowName;

    if (urlFromCmd) {
      const commandLineUrl = urlFromCmd.substr(6);
      logger.info(
        `window-handler: trying to set url ${commandLineUrl} from command line.`,
      );
      const { podWhitelist } = config.getConfigFields(['podWhitelist']);
      logger.info(`window-handler: checking pod whitelist.`);
      if (podWhitelist.length > 0) {
        logger.info(
          `window-handler: pod whitelist is not empty ${podWhitelist}`,
        );
        if (podWhitelist.includes(commandLineUrl)) {
          logger.info(
            `window-handler: url from command line is whitelisted in the config file.`,
          );
          logger.info(
            `window-handler: setting ${commandLineUrl} from the command line as the main window url.`,
          );
          this.url = commandLineUrl;
        } else {
          logger.info(
            `window-handler: url ${commandLineUrl} from command line is NOT WHITELISTED in the config file.`,
          );
        }
      } else {
        logger.info(
          `window-handler: setting ${commandLineUrl} from the command line as the main window url since pod whitelist is empty.`,
        );
        this.url = commandLineUrl;
      }
    }

    // start the application maximized - for automation tests
    const isMaximizedFlag = getCommandLineArgs(
      process.argv,
      '--maximized',
      true,
    );

    if (isFullScreen) {
      logger.info(`window-handler: window is in full screen!`);
      this.mainWindow.setFullScreen(true);
    }

    this.startUrl = this.url;
    cleanAppCacheOnCrash(this.mainWindow);
    // loads the main window with url from config/cmd line
    logger.info(`Loading main window with url ${this.url}`);
    const userAgent = this.getUserAgent(this.mainWindow.webContents);

    // Displays welcome screen instead of starting the main application
    if (this.shouldShowWelcomeScreen) {
      this.url = format({
        pathname: require.resolve('../renderer/welcome.html'),
        protocol: 'file',
        query: {
          componentName: 'welcome',
          locale: i18n.getLocale(),
          title: i18n.t('WelcomeText', 'Welcome')(),
        },
        slashes: true,
      });
    }

    if (
      this.config.isCustomTitleBar === CloudConfigDataTypes.ENABLED &&
      isWindowsOS &&
      this.mainWindow &&
      windowExists(this.mainWindow)
    ) {
      this.mainWebContents = await loadBrowserViews(this.mainWindow);
      this.mainWebContents.loadURL(this.url, { userAgent });
    } else {
      this.mainWindow.loadURL(this.url, { userAgent });
      this.mainWebContents = this.mainWindow.webContents;
    }

    // SDA-3844 - workaround as local shortcuts not working
    const throttledExportLogs = throttle(() => {
      exportLogs();
    }, SHORTCUT_KEY_THROTTLE);
    const switchToClient2 = throttle(() => {
      const clientSwitchType =
        this.url && this.url.includes('bff')
          ? ClientSwitchType.CLIENT_2_0
          : ClientSwitchType.STARTPAGE_CLIENT_2_0;
      windowHandler.switchClient(clientSwitchType);
    }, SHORTCUT_KEY_THROTTLE);
    const switchToDaily = throttle(() => {
      const clientSwitchType =
        this.url && this.url.includes('bff')
          ? ClientSwitchType.CLIENT_2_0_DAILY
          : ClientSwitchType.STARTPAGE_CLIENT_2_0_DAILY;
      windowHandler.switchClient(clientSwitchType);
    }, SHORTCUT_KEY_THROTTLE);
    this.mainWebContents.on('before-input-event', (event, input) => {
      if (input.control && input.shift && input.key.toLowerCase() === 'd') {
        event.preventDefault();
        throttledExportLogs();
      }
      const isCtrlOrMeta = isMac ? input.meta : input.control;
      if (this.url && this.url.startsWith('https://corporate.symphony.com')) {
        if (isCtrlOrMeta) {
          switch (input.key) {
            case '1':
              switchToClient2();
              break;
            case '2':
              switchToDaily();
              break;
          }
        }
      }
    });
    if (isMaximized || isMaximizedFlag) {
      this.mainWindow.maximize();
      logger.info(
        `window-handler: window is maximized!`,
        isMaximized,
        isMaximizedFlag,
      );
      mainEvents.publish('maximize');
    }
    this.mainWindow.show();
    initSysTray();
    if (isMac) {
      nativeTheme.on('updated', () => {
        presenceStatus.updateSystemTrayPresence();
      });
    }

    // check for build expiry in case of test builds
    this.checkExpiry(this.mainWindow);
    // update version info from server
    this.updateVersionInfo();
    // need this for postMessage origin
    this.mainWindow.origin = this.globalConfig.contextOriginUrl || this.url;

    // Event needed to hide native menu bar on Windows 10 as we use custom menu bar
    this.mainWebContents.once('did-start-loading', () => {
      logger.info(
        `window-handler: main window web contents started loading for url ${this.mainView?.webContents.getURL()}!`,
      );
      this.finishedLoading = false;
      this.listenForLoad();
      // monitors network connection and
      // displays error banner on failure
      monitorNetworkInterception(
        this.url || this.userConfig.url || this.globalConfig.url,
      );
    });

    const logEvents = [
      'did-fail-provisional-load',
      'did-frame-finish-load',
      'did-start-loading',
      'did-stop-loading',
      'will-redirect',
      'did-navigate',
      'did-navigate-in-page',
      'preload-error',
    ];

    logEvents.forEach((windowEvent: any) => {
      this.mainWindow?.webContents.on(windowEvent, () => {
        logger.info(
          `window-handler: Main Window Event Occurred: ${windowEvent}`,
        );
      });
    });

    this.mainWindow.once('ready-to-show', (event: Event) => {
      logger.info(`window-handler: Main Window ready to show: ${event}`);
    });

    this.mainWebContents.on(
      'did-fail-load',
      (_, errorCode: number, errorDescription: string) => {
        logger.error(
          `window-handler: Fail loading - Error code: ${errorCode}. Error desscription: ${errorDescription}`,
        );
      },
    );

    this.mainWebContents.on('did-finish-load', async () => {
      // reset to false when the client reloads
      this.isMana = false;
      logger.info(`window-handler: main window web contents finished loading!`);
      // Make sure there is no lingering C9 pipe connection
      closeC9Pipe();
      // early exit if the window has already been destroyed
      if (!this.mainWebContents || this.mainWebContents.isDestroyed()) {
        logger.info(
          `window-handler: main window web contents destroyed already! exiting`,
        );
        return;
      }
      this.finishedLoading = true;
      this.url = this.mainWebContents?.getURL();
      if (this.url?.indexOf('about:blank') === 0) {
        logger.info(
          `Looks like about:blank got loaded which may lead to blank screen`,
        );
        logger.info(`Reloading the app to check if it resolves the issue`);
        const url = this.userConfig.url || this.globalConfig.url;
        const userAgent = this.getUserAgent(this.mainWebContents);
        await this.mainWebContents?.loadURL(url, { userAgent });
        return;
      }

      logger.info('window-handler: did-finish-load, url: ' + this.url);

      if (this.mainWebContents && !this.mainWebContents.isDestroyed()) {
        // Load welcome screen
        if (this.shouldShowWelcomeScreen && !this.didShowWelcomeScreen) {
          const defaultUrl = 'my.symphony.com';
          const podUrl = this.userConfig.url
            ? this.userConfig.url
            : !this.globalConfig.url.includes(defaultUrl) &&
              this.globalConfig.url;
          this.mainWebContents.send('page-load-welcome', {
            locale: i18n.getLocale(),
            resources: i18n.loadedResources,
          });
          this.mainWebContents.send('welcome', {
            url: podUrl,
            message: '',
            urlValid: !!userConfigUrl,
            isPodConfigured: this.isPodConfigured && !!userConfigUrl,
            isBrowserLoginEnabled: this.config.enableBrowserLogin,
            browserLoginAutoConnect: this.config.browserLoginAutoConnect,
          });
          this.didShowWelcomeScreen = true;
          this.mainWebContents.focus();
        }

        // Injects custom title bar and snack bar css into the webContents
        await injectStyles(this.mainWebContents, this.isCustomTitleBar);
        this.mainWebContents.send('page-load', {
          isWindowsOS,
          locale: i18n.getLocale(),
          resources: i18n.loadedResources,
          isMainWindow: true,
        });

        this.appMenu = new AppMenu();

        const { permissions } = config.getConfigFields(['permissions']);
        this.mainWebContents.send('is-screen-share-enabled', permissions.media);

        // Subscribe events for main view - snack bar
        mainEvents.subscribeMultipleEvents(
          MAIN_WEB_CONTENTS_EVENTS,
          this.mainWebContents,
        );
      }
    });

    this.mainWebContents.on(
      'did-fail-load',
      (_event, errorCode, errorDesc, validatedURL) => {
        logger.error(
          `window-handler: Failed to load ${validatedURL}, with an error: ${errorCode}::${errorDesc}`,
        );
        this.loadFailError = errorDesc;
      },
    );

    this.mainWebContents.on('did-stop-loading', async () => {
      if (this.mainWindow && windowExists(this.mainWindow)) {
        this.mainWebContents?.send('page-load-failed', {
          locale: i18n.getLocale(),
          resources: i18n.loadedResources,
        });
        const href = await this.mainWebContents?.executeJavaScript(
          'document.location.href',
        );
        try {
          if (
            href === 'data:text/html,chromewebdata' ||
            href === 'chrome-error://chromewebdata/'
          ) {
            if (this.mainWindow && windowExists(this.mainWindow)) {
              this.mainWebContents?.insertCSS(
                fs
                  .readFileSync(
                    path.join(
                      __dirname,
                      '..',
                      '/renderer/styles/network-error.css',
                    ),
                    'utf8',
                  )
                  .toString(),
              );
              this.mainWebContents?.send('network-error', {
                error: this.loadFailError,
              });
              isSymphonyReachable(
                this.mainWindow,
                this.url || this.userConfig.url || this.globalConfig.url,
              );
            }
          }
        } catch (error) {
          logger.error(
            `window-handler: Could not read document.location`,
            error,
          );
        }
      }
    });

    this.mainWebContents.on(
      'render-process-gone',
      async (_event: Event, details: RenderProcessGoneDetails) => {
        if (details.reason === 'killed') {
          logger.info(`window-handler: main window crashed (killed)!`);
          return;
        }
        logger.info(
          `window-handler: main window crashed! Details:  ${JSON.stringify(
            details,
            null,
            2,
          )}`,
        );
        const { response } = await dialog.showMessageBox({
          type: 'error',
          title: i18n.t('Renderer Process Crashed')(),
          message: i18n.t(
            'Oops! Looks like we have had a crash. Please reload or close this window.',
          )(),
          buttons: ['Reload', 'Close'],
        });
        if (!this.mainWindow || !windowExists(this.mainWindow)) {
          return;
        }
        response === 0 ? this.mainWindow.reload() : this.mainWindow.close();
      },
    );

    // When uninstalling Symphony, the installer needs to tell the app to close down
    // The dedault way of doing this, is to send the 'close' event to the app, but
    // since we intercept and ignore the 'close' event if the user have turned on the
    // option "minimize on close", we use an alternative way of signalling that the
    // application should terminate. The installer sends the 'session-end' message
    // instead of the 'close' message, and when we receive it, we quit the app.
    this.mainWindow.on('session-end', () => {
      logger.info(`window-handler: session-end received`);
      app.quit();
    });

    // Handle main window close
    this.mainWindow.on('close', (event) => {
      if (!this.mainWindow || !windowExists(this.mainWindow)) {
        return;
      }

      if (this.willQuitApp) {
        logger.info(`window-handler: app is quitting, destroying all windows!`);
        if (
          this.mainWindow &&
          !this.mainWebContents?.isDestroyed() &&
          this.mainWebContents?.isDevToolsOpened()
        ) {
          this.mainWebContents?.closeDevTools();
        }
        return this.destroyAllWindows();
      }

      const { minimizeOnClose } = config.getConfigFields(['minimizeOnClose']);
      if (
        minimizeOnClose === CloudConfigDataTypes.ENABLED &&
        !this.isAutoUpdating
      ) {
        event.preventDefault();
        this.mainWindow.minimize();
        return;
      }

      if (isMac && !this.isAutoUpdating) {
        event.preventDefault();
        this.mainWindow.hide();
        return;
      }

      app.quit();
    });

    this.mainWindow.once('closed', () => {
      logger.info(
        `window-handler: main window closed, destroying all windows!`,
      );
      if (isWindowsOS || isMac) {
        this.closeScreenSharingIndicator();
      }
      this.closeAllWindows();
      this.destroyAllWindows();
    });

    crashReporter.start({
      submitURL: '',
      uploadToServer: false,
      ignoreSystemCrashHandler: false,
    });

    crashHandler.handleRendererCrash(this.mainWindow);

    // Reloads the Symphony
    ipcMain.on('reload-symphony', () => {
      this.reloadSymphony();
    });

    // Certificate verification proxy
    this.mainWebContents.session.setCertificateVerifyProc(
      handleCertificateProxyVerification,
    );

    // Validate window navigation
    preventWindowNavigation(this.mainWindow, false);

    // Handle media/other permissions
    handlePermissionRequests(this.mainWebContents);

    // Start monitoring window actions
    monitorWindowActions(this.mainWindow);

    // Download manager
    this.mainWebContents.session.on('will-download', handleDownloadManager);

    // store window ref
    this.addWindow(this.windowOpts.winKey, this.mainWindow);

    // Handle pop-outs window
    handleChildWindow(this.mainWebContents);

    if (this.config.enableRendererLogs) {
      this.mainWebContents.on('console-message', onConsoleMessages);
    }

    return this.mainWindow;
  }

  /**
   * Handles the use case of showing
   * welcome screen for first time installs
   */
  public showWelcomeScreen() {
    if (!this.url) {
      return;
    }
    const opts: ICustomBrowserWindowConstructorOpts = this.getWindowOpts(
      {
        width: DEFAULT_WELCOME_SCREEN_WIDTH,
        height: DEFAULT_WELCOME_SCREEN_HEIGHT,
        frame: !this.isCustomTitleBar,
        alwaysOnTop: isMac,
        resizable: false,
        minimizable: true,
        fullscreenable: false,
      },
      {
        devTools: isDevEnv,
      },
    );

    this.welcomeScreenWindow = createComponentWindow('welcome', opts);
    (this.welcomeScreenWindow as ICustomBrowserWindow).winName =
      apiName.welcomeScreenName;

    if (
      this.config.isCustomTitleBar === CloudConfigDataTypes.ENABLED &&
      isWindowsOS
    ) {
      const titleBarView = new BrowserView({
        webPreferences: {
          sandbox: IS_SAND_BOXED,
          nodeIntegration: IS_NODE_INTEGRATION_ENABLED,
          preload: path.join(__dirname, '../renderer/_preload-component.js'),
          devTools: isDevEnv,
          disableBlinkFeatures: AUX_CLICK,
        },
      }) as ICustomBrowserView;
      const componentName = 'windows-title-bar';
      const titleBarWindowUrl = format({
        pathname: require.resolve(`../renderer/${componentName}.html`),
        protocol: 'file',
        query: {
          componentName,
          locale: i18n.getLocale(),
          title: i18n.t('WelcomeText', 'Welcome')(),
        },
        slashes: true,
      });

      titleBarView.webContents.once('did-finish-load', async () => {
        if (!titleBarView || titleBarView.webContents.isDestroyed()) {
          return;
        }
        titleBarView?.webContents.send('page-load', {
          isWindowsOS,
          locale: i18n.getLocale(),
          resource: i18n.loadedResources,
          isMainWindow: true,
        });
        // disables action buttons in title bar
        titleBarView.webContents.send('disable-action-button');
      });
      titleBarView.webContents.loadURL(titleBarWindowUrl);
      titleBarView.setBounds({
        x: 0,
        y: 0,
        height: TITLE_BAR_HEIGHT,
        width: DEFAULT_WELCOME_SCREEN_WIDTH,
      });
      this.welcomeScreenWindow.setBrowserView(titleBarView);
    }

    this.welcomeScreenWindow.webContents.on('did-finish-load', () => {
      if (!this.welcomeScreenWindow || this.welcomeScreenWindow.isDestroyed()) {
        return;
      }
      logger.info(`finished loading welcome screen.`);
      this.welcomeScreenWindow.webContents.send('page-load-welcome', {
        locale: i18n.getLocale(),
        resource: i18n.loadedResources,
      });

      const userConfigUrl =
        this.userConfig.url &&
        this.userConfig.url.indexOf('/login/sso/initsso') > -1
          ? this.userConfig.url.slice(
              0,
              this.userConfig.url.indexOf('/login/sso/initsso'),
            )
          : this.userConfig.url;
      this.welcomeScreenWindow.webContents.send('welcome', {
        url: userConfigUrl || this.startUrl,
        message: '',
        urlValid: !!userConfigUrl,
      });
      this.appMenu = new AppMenu();
      this.addWindow(opts.winKey, this.welcomeScreenWindow);
      this.mainWindow = this.welcomeScreenWindow as ICustomBrowserWindow;
    });

    this.welcomeScreenWindow.once('closed', () => {
      this.removeWindow(opts.winKey);
      this.welcomeScreenWindow = null;
    });
  }

  /**
   * Gets the main window
   */
  public getMainWindow(): ICustomBrowserWindow | null {
    return this.mainWindow;
  }

  /**
   * Gets the main browser webContents
   */
  public getMainWebContents(): WebContents | undefined {
    return this.mainWebContents;
  }

  /**
   * Gets the main browser view
   */
  public getMainView(): ICustomBrowserView | null {
    return this.mainView;
  }

  /**
   * Gets all the window that we have created
   *
   * @return {Electron.BrowserWindow}
   *
   */
  public getAllWindows(): object {
    return this.windows;
  }

  /**
   * Gets the main window opts
   *
   * @return ICustomBrowserWindowConstructorOpts
   */
  public getMainWindowOpts(): ICustomBrowserWindowConstructorOpts {
    return this.windowOpts;
  }

  /**
   * Sets the title bar view
   *
   * @param mainView
   */
  public setMainView(mainView: ICustomBrowserView): void {
    this.mainView = mainView;
  }

  /**
   * Sets the title bar view
   *
   * @param titleBarView
   */
  public setTitleBarView(titleBarView: ICustomBrowserView): void {
    this.titleBarView = titleBarView;
  }

  /**
   * Sets whether the application is Auto Updating
   *
   * @param isAutoUpdating
   */
  public setIsAutoUpdating(isAutoUpdating: boolean): void {
    this.isAutoUpdating = isAutoUpdating;
  }

  /**
   * Closes the window from an event emitted by the render processes
   *
   * @param windowType {WindowTypes}
   * @param winKey {string} - Unique ID assigned to the window
   */
  public closeWindow(windowType: WindowTypes, winKey?: string): void {
    logger.info(
      `window-handler: closing window type ${windowType} with key ${winKey}!`,
    );
    switch (windowType) {
      case 'screen-picker':
        if (this.screenPickerWindow && windowExists(this.screenPickerWindow)) {
          this.screenPickerWindow.close();
        }
        break;
      case 'screen-sharing-indicator':
        if (
          this.screenPickerPlaceholderWindow &&
          windowExists(this.screenPickerPlaceholderWindow)
        ) {
          this.screenPickerPlaceholderWindow.close();
        }
        if (winKey) {
          const browserWindow = this.windows[winKey];

          if (browserWindow && windowExists(browserWindow)) {
            browserWindow.destroy();
          }
        }
        if (isWindowsOS || isMac) {
          const timeoutValue = 300;
          setTimeout(() => this.closeScreenSharingIndicator(), timeoutValue);
        } else {
          if (
            this.screenSharingFrameWindow &&
            windowExists(this.screenSharingFrameWindow)
          ) {
            this.screenSharingFrameWindow.close();
          }
        }
        break;
      case 'notification-settings':
        if (
          this.notificationSettingsWindow &&
          windowExists(this.notificationSettingsWindow)
        ) {
          this.notificationSettingsWindow.close();
        }
        break;
      default:
        break;
    }
  }

  /**
   * Finds all the child window and closes it
   */
  public closeAllWindows(): void {
    const browserWindows = BrowserWindow.getAllWindows();
    if (browserWindows && browserWindows.length) {
      browserWindows.forEach((win) => {
        const browserWindow = win as ICustomBrowserWindow;
        if (browserWindow && windowExists(browserWindow)) {
          // Closes only child windows
          if (browserWindow.winName !== apiName.mainWindowName) {
            if (browserWindow.closable) {
              browserWindow.close();
            } else {
              browserWindow.destroy();
            }
          }
        }
      });
    }
    notification.cleanUp();
  }

  /**
   * Sets is auto reload when the application
   * is auto reloaded for optimizing memory
   *
   * @param shouldAutoReload {boolean}
   */
  public setIsAutoReload(shouldAutoReload: boolean): void {
    this.isAutoReload = shouldAutoReload;
  }

  /**
   * Checks if the window and a key has a window
   *
   * @param window {Electron.BrowserWindow}
   */
  public hasWindow(window: Electron.BrowserWindow): boolean {
    for (const key in this.windows) {
      if (this.windows[key] === window) {
        return true;
      }
    }
    return this.aboutAppWindow === window;
  }

  /**
   * Checks if the window and a key has a window
   *
   * @param webContents {WeContents}
   */
  public hasView(webContents: WebContents): boolean {
    return (
      webContents === this.mainView?.webContents ||
      webContents === this.titleBarView?.webContents
    );
  }

  /**
   * Move window to the same screen as main window or provided parent window
   */
  public moveWindow(
    windowToMove: BrowserWindow,
    fixedYPosition?: number,
    parentWindow?: BrowserWindow,
  ) {
    if (this.mainWindow && windowExists(this.mainWindow)) {
      let display = screen.getDisplayMatching(this.mainWindow.getBounds());
      if (parentWindow && windowExists(parentWindow)) {
        display = screen.getDisplayMatching(parentWindow.getBounds());
      }

      logger.info(
        'window-handler: moveWindow, display: ' +
          JSON.stringify(display.workArea),
      );
      logger.info(
        'window-handler: moveWindow, windowToMove: ' +
          JSON.stringify(windowToMove.getBounds()),
      );

      if (display.workArea.width < windowToMove.getBounds().width) {
        windowToMove.setSize(
          display.workArea.width,
          windowToMove.getBounds().height,
        );
      }

      if (display.workArea.height < windowToMove.getBounds().height) {
        windowToMove.setSize(
          windowToMove.getBounds().width,
          display.workArea.height,
        );
      }

      let positionX = Math.trunc(
        display.workArea.x +
          display.workArea.width / 2 -
          windowToMove.getBounds().width / 2,
      );
      if (positionX < display.workArea.x) {
        positionX = display.workArea.x;
      }

      let positionY;
      if (fixedYPosition) {
        positionY = Math.trunc(display.workArea.y + fixedYPosition);
      } else {
        // Center the window in y-axis
        positionY = Math.trunc(
          display.workArea.y +
            display.workArea.height / 2 -
            windowToMove.getBounds().height / 2,
        );
      }

      if (positionY < display.workArea.y) {
        positionY = display.workArea.y;
      }

      logger.info('window-handler: moveWindow, positionX: ' + positionX);
      logger.info('window-handler: moveWindow, positionY: ' + positionY);

      windowToMove.setPosition(positionX, positionY);
      // Because of a bug for windows10 we need to call setPosition twice
      windowToMove.setPosition(positionX, positionY);
    }
  }

  /**
   * Creates a about app window
   */
  public createAboutAppWindow(windowName: string): void {
    // This prevents creating multiple instances of the
    // about window
    if (didVerifyAndRestoreWindow(this.aboutAppWindow)) {
      return;
    }

    const selectedParentWindow = getWindowByName(windowName);

    const opts: BrowserWindowConstructorOptions = this.getWindowOpts(
      {
        width: 404,
        height: 497,
        modal: true,
        frame: isWindowsOS,
        alwaysOnTop: isMac,
        resizable: false,
        fullscreenable: false,
        backgroundColor: '#27292c',
      },
      {
        devTools: isDevEnv,
      },
    );

    const closeAboutApp = () => {
      if (
        this.aboutAppWindow &&
        windowExists(this.aboutAppWindow as BrowserWindow)
      ) {
        this.aboutAppWindow.close();
        this.aboutAppWindow = null;
      }
    };

    if (
      this.mainWindow &&
      windowExists(this.mainWindow) &&
      this.mainWindow.isAlwaysOnTop()
    ) {
      opts.alwaysOnTop = true;
    }

    if (selectedParentWindow) {
      opts.parent = selectedParentWindow;
    }

    this.aboutAppWindow = createComponentWindow('about-app', opts);
    this.moveWindow(this.aboutAppWindow);
    this.aboutAppWindow.setVisibleOnAllWorkspaces(true);

    this.aboutAppWindow.once('close', () => {
      ipcMain.removeListener('close-about-app', closeAboutApp);
    });

    ipcMain.once('close-about-app', closeAboutApp);

    this.aboutAppWindow.webContents.once('did-finish-load', async () => {
      let client = '';
      if (this.url && this.url.startsWith('https://corporate.symphony.com')) {
        client = this.url.includes('daily') ? '- Daily' : '';
      }
      const ABOUT_SYMPHONY_NAMESPACE = 'AboutSymphony';
      const versionLocalised = i18n.t('Version', ABOUT_SYMPHONY_NAMESPACE)();
      const { hostname } = parse(this.url || this.globalConfig.url);
      const userConfig = config.userConfig;
      const globalConfig = config.globalConfig;
      const cloudConfig = config.cloudConfig;
      const filteredConfig = config.filteredCloudConfig;
      const finalConfig = {
        ...globalConfig,
        ...userConfig,
        ...filteredConfig,
      };
      const aboutInfo = {
        userConfig,
        globalConfig,
        cloudConfig,
        finalConfig,
        hostname,
        versionLocalised,
        ...versionHandler.versionInfo,
        client,
      };
      if (this.aboutAppWindow && windowExists(this.aboutAppWindow)) {
        this.aboutAppWindow.webContents.send('about-app-data', aboutInfo);
      }
    });
  }

  /**
   * Creates the snipping tool window
   */
  public createSnippingToolWindow(
    snipImage: string,
    snipDimensions: {
      height: number;
      width: number;
    },
    currentWindow?: string,
    hideOnCapture?: boolean,
  ): void {
    // Prevents creating multiple instances
    if (didVerifyAndRestoreWindow(this.snippingToolWindow)) {
      logger.error('window-handler: Could not open snipping tool window');
      return;
    }

    this.hideOnCapture = !!hideOnCapture;

    logger.info(
      'window-handler: createSnippingToolWindow: Receiving snippet props: ' +
        JSON.stringify({
          snipImage,
          snipDimensions,
        }),
    );

    const allDisplays = screen.getAllDisplays();
    logger.info(
      'window-handler: createSnippingToolWindow: User has these displays: ' +
        JSON.stringify(allDisplays),
    );

    if (!this.mainWindow) {
      logger.error('window-handler: Could not get main window');
      return;
    }

    const OS_PADDING = 25;
    const MIN_TOOL_HEIGHT = 312;
    const MIN_TOOL_WIDTH = 420;
    const BUTTON_BAR_TOP_HEIGHT = 48;
    const BUTTON_BAR_BOTTOM_HEIGHT = 72;
    const BUTTON_BARS_HEIGHT = BUTTON_BAR_TOP_HEIGHT + BUTTON_BAR_BOTTOM_HEIGHT;

    const focusedWindow = BrowserWindow.getFocusedWindow();
    const display = screen.getDisplayMatching(
      focusedWindow ? focusedWindow.getBounds() : this.mainWindow.getBounds(),
    );
    const workAreaSize = display.workAreaSize;
    // Snipping tool height shouldn't be greater than min of screen width and height (screen orientation can be portrait or landscape)
    const minSize = Math.min(workAreaSize.width, workAreaSize.height);
    const maxToolHeight = Math.floor(calculatePercentage(minSize, 90));
    const maxToolWidth = Math.floor(calculatePercentage(minSize, 90));
    const availableAnnotateAreaHeight = maxToolHeight - BUTTON_BARS_HEIGHT;
    const availableAnnotateAreaWidth = maxToolWidth;
    const scaleFactor = display.scaleFactor;
    const scaledImageDimensions = {
      height: Math.floor(snipDimensions.height / scaleFactor),
      width: Math.floor(snipDimensions.width / scaleFactor),
    };
    logger.info(
      'window-handler: createSnippingToolWindow: Image will open with scaled dimensions: ' +
        JSON.stringify(scaledImageDimensions),
    );

    const annotateAreaHeight =
      scaledImageDimensions.height > availableAnnotateAreaHeight
        ? availableAnnotateAreaHeight
        : scaledImageDimensions.height;
    const annotateAreaWidth =
      scaledImageDimensions.width > availableAnnotateAreaWidth
        ? availableAnnotateAreaWidth
        : scaledImageDimensions.width;

    let toolHeight: number;
    let toolWidth: number;

    if (scaledImageDimensions.height + BUTTON_BARS_HEIGHT >= maxToolHeight) {
      toolHeight = maxToolHeight + OS_PADDING;
    } else if (
      scaledImageDimensions.height + BUTTON_BARS_HEIGHT <=
      MIN_TOOL_HEIGHT
    ) {
      toolHeight = MIN_TOOL_HEIGHT + OS_PADDING;
    } else {
      toolHeight =
        scaledImageDimensions.height + BUTTON_BARS_HEIGHT + OS_PADDING;
    }

    if (scaledImageDimensions.width >= maxToolWidth) {
      toolWidth = maxToolWidth;
    } else if (scaledImageDimensions.width <= MIN_TOOL_WIDTH) {
      toolWidth = MIN_TOOL_WIDTH;
    } else {
      toolWidth = scaledImageDimensions.width;
    }

    this.currentWindow = currentWindow || '';
    const parentWindow = getWindowByName(this.currentWindow);
    const opts: ICustomBrowserWindowConstructorOpts = this.getWindowOpts(
      {
        width: toolWidth,
        height: toolHeight,
        modal: isWindowsOS,
        alwaysOnTop: this.hideOnCapture,
        resizable: false,
        fullscreenable: false,
      },
      {
        devTools: true,
      },
    );

    if (
      this.mainWindow &&
      windowExists(this.mainWindow) &&
      this.mainWindow.isAlwaysOnTop()
    ) {
      opts.alwaysOnTop = true;
    }

    const areWindowsRestoredPostHide =
      (winStore.windowsRestored && this.hideOnCapture) || !this.hideOnCapture;

    if (isWindowsOS || (isMac && areWindowsRestoredPostHide)) {
      opts.parent = parentWindow;
      opts.modal = true;
    }

    this.snippingToolWindow = createComponentWindow('snipping-tool', opts);
    this.moveWindow(this.snippingToolWindow, undefined, parentWindow);
    this.snippingToolWindow.setVisibleOnAllWorkspaces(true);

    this.snippingToolWindow.webContents.once('did-finish-load', async () => {
      const snippingToolInfo = {
        snipImage,
        annotateAreaHeight,
        annotateAreaWidth,
        snippetImageHeight: scaledImageDimensions.height,
        snippetImageWidth: scaledImageDimensions.width,
      };
      if (this.snippingToolWindow && windowExists(this.snippingToolWindow)) {
        this.snippingToolWindow.webContents.setZoomFactor(1);
        const windowBounds = this.snippingToolWindow.getBounds();
        logger.info(
          'window-handler: Opening snipping tool window on display: ' +
            JSON.stringify(display),
        );
        logger.info(
          'window-handler: Opening snipping tool window with size: ' +
            JSON.stringify({
              toolHeight,
              toolWidth,
            }),
        );
        logger.info(
          'window-handler: Opening snipping tool content with metadata: ' +
            JSON.stringify(snippingToolInfo),
        );
        logger.info(
          'window-handler: Actual window size: ' + JSON.stringify(windowBounds),
        );
        if (
          windowBounds.height !== toolHeight ||
          windowBounds.width !== toolWidth
        ) {
          logger.info(
            'window-handler: Could not create window with correct size, resizing with setBounds and centering with center',
          );
          this.snippingToolWindow.setBounds({
            height: toolHeight,
            width: toolWidth,
          });
          this.snippingToolWindow.center();
          logger.info(
            'window-handler: window bounds after resizing: ' +
              JSON.stringify(this.snippingToolWindow.getBounds()),
          );
        }
        this.snippingToolWindow.webContents.send(
          'snipping-tool-data',
          snippingToolInfo,
        );
      }
    });
    this.snippingToolWindow.once('close', () => {
      logger.info(
        'window-handler: createSnippingToolWindow: Closing snipping window, attempting to delete temp snip image',
      );
      ipcMain.removeAllListeners(ScreenShotAnnotation.COPY_TO_CLIPBOARD);
      ipcMain.removeAllListeners(ScreenShotAnnotation.SAVE_AS);
      this.snippingToolWindow?.close();
      this.deleteFile(snipImage);
      this.removeWindow(opts.winKey);
      this.screenPickerWindow = null;
    });
  }

  /**
   * Closes the snipping tool window
   */
  public closeSnippingToolWindow() {
    if (this.snippingToolWindow && windowExists(this.snippingToolWindow)) {
      this.snippingToolWindow.close();
      this.snippingToolWindow = null;
    }
  }

  /**
   * Draw red frame on shared screen application
   *
   */
  public drawScreenShareIndicatorFrame(source) {
    const displays = screen.getAllDisplays();
    logger.info('window-utils: displays.length: ' + displays.length);
    for (let i = 0, len = displays.length; i < len; i++) {
      logger.info(
        'window-utils: display[' + i + ']: ' + JSON.stringify(displays[i]),
      );
    }

    if (source != null) {
      logger.info('window-handler: drawScreenShareIndicatorFrame');

      if (isWindowsOS || isMac) {
        const type = source.id.split(':')[0];
        if (type === 'window') {
          const hwnd = source.id.split(':')[1];
          this.execCmd(this.screenShareIndicatorFrameUtil, [hwnd]);
        } else if (isMac && type === 'screen') {
          const dispId = source.id.split(':')[1];
          this.execCmd(this.screenShareIndicatorFrameUtil, [dispId]);
        } else if (isWindowsOS && type === 'screen') {
          logger.info(
            'window-handler: source.display_id: ' + source.display_id,
          );
          if (source.display_id !== '') {
            this.execCmd(this.screenShareIndicatorFrameUtil, [
              source.display_id,
            ]);
          } else {
            const dispId = source.id.split(':')[1];
            const clampedDispId = Math.min(dispId, displays.length - 1);
            const keyId = 'id';
            logger.info('window-utils: dispId: ' + dispId);
            logger.info('window-utils: clampedDispId: ' + clampedDispId);
            logger.info(
              'window-utils: displays [' +
                clampedDispId +
                '] [id]: ' +
                displays[clampedDispId][keyId],
            );
            this.execCmd(this.screenShareIndicatorFrameUtil, [
              displays[clampedDispId][keyId].toString(),
            ]);
          }
        }
      }
    }
  }

  /**
   * Creates a screen picker window
   *
   * @param window
   * @param sources
   * @param id
   */
  public createScreenPickerWindow(
    window: WebContents,
    sources: DesktopCapturerSource[],
    id: number,
  ): void {
    if (this.screenPickerWindow && windowExists(this.screenPickerWindow)) {
      this.screenPickerWindow.close();
    }

    const opts: ICustomBrowserWindowConstructorOpts = this.getWindowOpts(
      {
        alwaysOnTop: true,
        autoHideMenuBar: true,
        frame: false,
        modal: false,
        height: isMac ? 519 : 523,
        width: 580,
        show: false,
        fullscreenable: false,
      },
      {
        devTools: isDevEnv,
      },
    );

    this.screenPickerWindow = createComponentWindow('screen-picker', opts);
    this.moveWindow(this.screenPickerWindow);
    this.screenPickerWindow.webContents.once('did-finish-load', () => {
      if (!this.screenPickerWindow || !windowExists(this.screenPickerWindow)) {
        return;
      }

      this.screenPickerWindow.webContents.setZoomFactor(1);
      this.screenPickerWindow.webContents.setVisualZoomLevelLimits(1, 1);

      this.screenPickerWindow.webContents.send('screen-picker-data', {
        sources,
        id,
      });
      this.addWindow(opts.winKey, this.screenPickerWindow);
    });

    const screenSourceSelect = (_event, source) => {
      if (source != null) {
        logger.info(`window-handler: screen-source-select`, source, id);

        this.closeScreenSharingIndicator();
        const timeoutValue = 300;
        setTimeout(() => {
          this.drawScreenShareIndicatorFrame(source);
          if (isMac) {
            const windows = BrowserWindow.getAllWindows();
            windows.map((window: BrowserWindow) => {
              if (window.getMediaSourceId() === source.id) {
                window.show();
              }
            });
          }
        }, timeoutValue);
      }
    };

    ipcMain.on('screen-source-select', screenSourceSelect);

    ipcMain.once('screen-source-selected', (_event, source) => {
      logger.info(`window-handler: screen-source-selected`, source, id);
      if (source == null) {
        this.closeScreenSharingIndicator();
        if (
          this.screenPickerPlaceholderWindow &&
          windowExists(this.screenPickerPlaceholderWindow)
        ) {
          this.screenPickerPlaceholderWindow.close();
          this.screenPickerPlaceholderWindow = null;
        }
      } else {
        // SDA-3646 hack for macOS: whenever we try to close the penultimate window (here screensharing screen picker), Electron activates the last Electron window
        // This behaviour was observed while trying to upgrade from Electron 14 to Electron 17
        // Here the hack to solve that issue is to create a new invisible BrowserWindow.
        this.screenPickerPlaceholderWindow = new BrowserWindow({
          title: 'Screen sharing - Symphony',
          width: 0,
          height: 0,
          transparent: true,
          frame: false,
          x: 0,
          y: 0,
          resizable: false,
          movable: false,
          fullscreenable: false,
        });
        this.screenPickerPlaceholderWindow.show();
      }

      window.send('start-share' + id, source);
      if (this.screenPickerWindow && windowExists(this.screenPickerWindow)) {
        // SDA-3635 hack
        setTimeout(() => this.screenPickerWindow?.close(), 500);
      }
    });
    this.screenPickerWindow.once('closed', () => {
      ipcMain.removeListener('screen-source-select', screenSourceSelect);
      this.removeWindow(opts.winKey);
      this.screenPickerWindow = null;
      if (isWindowsOS) {
        if (
          this.screenPickerPlaceholderWindow &&
          windowExists(this.screenPickerPlaceholderWindow)
        ) {
          this.screenPickerPlaceholderWindow.close();
          this.screenPickerPlaceholderWindow = null;
        }
      }
    });
  }

  /**
   * Closes a screen picker window if it exists
   *
   */
  public closeScreenPickerWindow() {
    if (this.screenPickerWindow && windowExists(this.screenPickerWindow)) {
      this.screenPickerWindow.close();
    }
  }

  /**
   * Closes screen sharing indicator
   *
   */
  public async closeScreenSharingIndicator() {
    this.execCmd(this.screenShareIndicatorFrameUtil, []);
  }

  /**
   * Creates a Basic auth window whenever the network
   * requires authentications
   *
   * Invoked by app.on('login')
   *
   * @param window
   * @param hostname
   * @param isMultipleTries
   * @param clearSettings
   * @param callback
   */
  public createBasicAuthWindow(
    window: ICustomBrowserWindow,
    hostname: string,
    isMultipleTries: boolean,
    clearSettings,
    callback,
  ): void {
    if (this.basicAuthWindow && windowExists(this.basicAuthWindow)) {
      this.basicAuthWindow.close();
    }

    const opts = this.getWindowOpts(
      {
        width: 360,
        height: isMac ? 270 : 295,
        alwaysOnTop: isMac,
        skipTaskbar: true,
        resizable: false,
        show: false,
        modal: true,
        frame: false,
        fullscreenable: false,
        acceptFirstMouse: true,
      },
      {
        sandbox: IS_SAND_BOXED,
        nodeIntegration: IS_NODE_INTEGRATION_ENABLED,
        devTools: true,
      },
    );
    opts.parent = window;
    this.basicAuthWindow = createComponentWindow('basic-auth', opts);
    this.moveWindow(this.basicAuthWindow);
    this.basicAuthWindow.setVisibleOnAllWorkspaces(true);
    this.basicAuthWindow.webContents.once('did-finish-load', () => {
      if (!this.basicAuthWindow || !windowExists(this.basicAuthWindow)) {
        return;
      }
      this.basicAuthWindow.webContents.send('basic-auth-data', {
        hostname,
        isValidCredentials: isMultipleTries,
      });
    });

    const closeBasicAuth = (_event, shouldClearSettings = true) => {
      if (shouldClearSettings) {
        clearSettings();
      }
      if (this.basicAuthWindow && windowExists(this.basicAuthWindow)) {
        this.basicAuthWindow.close();
      }
    };

    const login = (_event, arg) => {
      const { username, password } = arg;
      callback(username, password);
      closeBasicAuth(null, false);
    };

    this.basicAuthWindow.once('close', () => {
      this.basicAuthWindow = null;
      ipcMain.removeListener('basic-auth-closed', closeBasicAuth);
      ipcMain.removeListener('basic-auth-login', login);
    });

    ipcMain.once('basic-auth-closed', closeBasicAuth);
    ipcMain.once('basic-auth-login', login);
  }

  /**
   * Creates and displays notification settings window
   *
   * @param windowName
   */
  public createNotificationSettingsWindow(
    windowName: string,
    theme: Themes,
  ): void {
    const opts = this.getWindowOpts(
      {
        width: 540,
        height: 455,
        show: false,
        modal: true,
        minimizable: false,
        maximizable: false,
        fullscreenable: false,
        autoHideMenuBar: true,
      },
      {
        devTools: isDevEnv,
      },
    );
    // This prevents creating multiple instances of the
    // notification configuration window
    if (didVerifyAndRestoreWindow(this.notificationSettingsWindow)) {
      return;
    }
    const selectedParentWindow = getWindowByName(windowName);

    if (selectedParentWindow) {
      opts.parent = selectedParentWindow;
    }

    this.notificationSettingsWindow = createComponentWindow(
      'notification-settings',
      opts,
    );
    this.moveWindow(this.notificationSettingsWindow);
    this.notificationSettingsWindow.setVisibleOnAllWorkspaces(true);
    this.notificationSettingsWindow.webContents.on('did-finish-load', () => {
      if (
        this.notificationSettingsWindow &&
        windowExists(this.notificationSettingsWindow)
      ) {
        let screens: Electron.Display[] = [];
        if (app.isReady()) {
          screens = screen.getAllDisplays();
        }
        const { position, display } = config.getConfigFields([
          'notificationSettings',
        ]).notificationSettings;
        this.notificationSettingsWindow.webContents.send(
          'notification-settings-data',
          { screens, position, display, theme },
        );
      }
    });

    this.addWindow(opts.winKey, this.notificationSettingsWindow);

    ipcMain.once('notification-settings-update', async (_event, args) => {
      const { display, position } = args;
      try {
        await config.updateUserConfig({
          notificationSettings: { display, position },
        });
      } catch (e) {
        logger.error(
          `NotificationSettings: Could not update user config file error`,
          e,
        );
      }
      if (
        this.notificationSettingsWindow &&
        windowExists(this.notificationSettingsWindow)
      ) {
        this.notificationSettingsWindow.close();
      }
      // Update latest notification settings from config
      notification.updateNotificationSettings();
    });

    this.notificationSettingsWindow.once('closed', () => {
      this.removeWindow(opts.winKey);
      this.notificationSettingsWindow = null;
    });
  }

  /**
   * Creates a screen sharing indicator whenever uses start
   * sharing the screen
   *
   * @param screenSharingWebContents {WeContents}
   * @param displayId {string} - current display id
   * @param id {number} - postMessage request id
   * @param streamId {string} - MediaStream id
   */
  public createScreenSharingIndicatorWindow(
    screenSharingWebContents: WebContents,
    displayId: string,
    id: number,
    streamId: string,
  ): void {
    const indicatorScreen =
      (displayId &&
        screen
          .getAllDisplays()
          .filter((d) => displayId.includes(d.id.toString()))[0]) ||
      screen.getPrimaryDisplay();

    const topPositionOfIndicatorScreen = 16;

    const screenRect = indicatorScreen.workArea;
    // Set stream id as winKey to link stream to the window
    let opts = {
      ...this.getWindowOpts(
        {
          width: 592,
          height: 48,
          show: false,
          modal: false,
          frame: false,
          focusable: true,
          transparent: true,
          skipTaskbar: true,
          autoHideMenuBar: true,
          resizable: false,
          alwaysOnTop: true,
          fullscreenable: false,
          titleBarStyle: 'customButtonsOnHover',
          minimizable: false,
          maximizable: false,
          title: 'Screen Sharing Indicator - Symphony',
          closable: false,
        },
        {
          devTools: isDevEnv,
        },
      ),
      ...{ winKey: streamId },
    };
    if (opts.width && opts.height) {
      opts = {
        ...opts,
        ...{
          x: screenRect.x + Math.round((screenRect.width - opts.width) / 2),
          y: screenRect.y + topPositionOfIndicatorScreen,
        },
      };
    }

    logger.info(
      'window-handler: createScreenSharingIndicatorWindow, displayId: ' +
        displayId,
    );
    if (displayId !== '') {
      if (isLinux) {
        const displays = screen.getAllDisplays();
        displays.forEach((element) => {
          logger.info(
            'window-handler: element.id.toString(): ' + element.id.toString(),
          );
          if (displayId === element.id.toString()) {
            logger.info(`window-handler: element:`, element);
            this.createScreenSharingFrameWindow(
              'screen-sharing-frame',
              element.workArea.width,
              element.workArea.height,
              element.workArea.x,
              element.workArea.y,
            );
          }
        });
      }
    }

    this.screenSharingIndicatorWindow = createComponentWindow(
      'screen-sharing-indicator',
      opts,
    );
    this.moveWindow(
      this.screenSharingIndicatorWindow,
      topPositionOfIndicatorScreen,
    );
    this.screenSharingIndicatorWindow.setVisibleOnAllWorkspaces(true);
    this.screenSharingIndicatorWindow.setSkipTaskbar(true);
    this.screenSharingIndicatorWindow.setAlwaysOnTop(true, 'screen-saver');
    this.screenSharingIndicatorWindow.webContents.once(
      'did-finish-load',
      () => {
        if (
          !this.screenSharingIndicatorWindow ||
          !windowExists(this.screenSharingIndicatorWindow)
        ) {
          return;
        }
        this.screenSharingIndicatorWindow.webContents.setZoomFactor(1);
        this.screenSharingIndicatorWindow.webContents.setVisualZoomLevelLimits(
          1,
          1,
        );
        this.screenSharingIndicatorWindow.webContents.send(
          'screen-sharing-indicator-data',
          { id, streamId },
        );
      },
    );
    const stopScreenSharing = (_event, indicatorId) => {
      if (id === indicatorId) {
        screenSharingWebContents.send('screen-sharing-stopped', id);
      }
    };

    this.addWindow(opts.winKey, this.screenSharingIndicatorWindow);

    this.screenSharingIndicatorWindow.once('close', () => {
      this.removeWindow(streamId);
      ipcMain.removeListener('stop-screen-sharing', stopScreenSharing);
    });

    ipcMain.once('stop-screen-sharing', stopScreenSharing);
  }

  /**
   * Creates a screen-sharing frame around the shared area
   */
  public createScreenSharingFrameWindow(
    windowName: string,
    frameWidth: number,
    frameHeight: number,
    framePositionX: number,
    framePositionY: number,
  ): void {
    // This prevents creating multiple instances of the
    // about window
    if (didVerifyAndRestoreWindow(this.screenSharingFrameWindow)) {
      return;
    }

    const selectedParentWindow = getWindowByName(windowName);

    const opts: BrowserWindowConstructorOptions = this.getWindowOpts(
      {
        width: frameWidth,
        height: frameHeight,
        frame: false,
        transparent: true,
        skipTaskbar: true,
        alwaysOnTop: true,
      },
      {
        devTools: isDevEnv,
      },
    );

    if (
      this.mainWindow &&
      windowExists(this.mainWindow) &&
      this.mainWindow.isAlwaysOnTop()
    ) {
      opts.alwaysOnTop = true;
    }

    if (isWindowsOS && selectedParentWindow) {
      opts.parent = selectedParentWindow;
    }

    this.screenSharingFrameWindow = createComponentWindow(
      'screen-sharing-frame',
      opts,
    );

    const area = this.screenSharingFrameWindow.getBounds();
    area.x = framePositionX;
    area.y = framePositionY;
    this.screenSharingFrameWindow.setBounds(area);

    this.screenSharingFrameWindow.setIgnoreMouseEvents(true);
    this.screenSharingFrameWindow.setVisibleOnAllWorkspaces(true);
  }

  /**
   * Update version info on the about app window and more info window
   */
  public async updateVersionInfo() {
    await versionHandler.getClientVersion(true, this.url);
    this.setAboutPanel();
  }

  /**
   * Opens an external url in the system's default browser
   *
   * @param urlToOpen
   */
  public openUrlInDefaultBrowser(urlToOpen) {
    if (urlToOpen) {
      shell.openExternal(urlToOpen);
      logger.info(
        `window-handler: opened url ${urlToOpen} in the default browser!`,
      );
    }
  }

  /**
   * Stores information of all the window we have created
   *
   * @param key {string}
   * @param browserWindow {Electron.BrowserWindow}
   */
  public addWindow(key: string, browserWindow: Electron.BrowserWindow): void {
    this.windows[key] = browserWindow;
  }

  /**
   * Removes the window reference
   *
   * @param key {string}
   */
  public removeWindow(key: string): void {
    delete this.windows[key];
  }

  /**
   * Executes the given command via a child process
   *
   * @param util {string}
   * @param utilArgs {ReadonlyArray<string>}
   */
  public execCmd(util: string, utilArgs: ReadonlyArray<string>): Promise<void> {
    logger.info(`window handler: execCmd: util: ${util} utilArgs: ${utilArgs}`);
    return new Promise<void>((resolve, reject) => {
      return execFile(util, utilArgs, (error: ExecException | null) => {
        if (error) {
          logger.info(`window handler: execCmd: error: ${error}`);
        }
        if (error && error.killed) {
          // processs was killed, just resolve with no data.
          return reject(error);
        }
        resolve();
      });
    });
  }

  /**
   * Deletes a locally stored file
   * @param filePath Path for the file to delete
   */
  public deleteFile(filePath: string) {
    fs.unlink(filePath, (removeErr) => {
      logger.info(
        `window-handler: cleaning up temp snippet file: ${filePath}!`,
      );
      if (removeErr) {
        logger.info(
          `window-handler: error removing temp snippet file, is probably already removed: ${filePath}, err: ${removeErr}`,
        );
      }
    });
  }

  /**
   * Reloads symphony in case of network failures
   */
  public async reloadSymphony() {
    if (this.mainWebContents && !this.mainWebContents.isDestroyed()) {
      // If the client is fully loaded, upon network interruption, load that
      if (this.isLoggedIn) {
        logger.info(
          `window-utils: user has logged in, getting back to Symphony app`,
        );
        const userAgent = this.getUserAgent(this.mainWebContents);
        await this.mainWebContents.loadURL(
          this.url || this.userConfig.url || this.globalConfig.url,
          { userAgent },
        );
        return;
      }
      // If not, revert to loading the starting pod url
      logger.info(
        `window-utils: user hasn't logged in yet, loading login page again`,
      );
      const userAgent = this.getUserAgent(this.mainWebContents);
      await this.mainWebContents.loadURL(
        this.userConfig.url || this.globalConfig.url,
        {
          userAgent,
        },
      );
    }
  }

  /**
   * Force app resizing while unmaximizing
   * @returns void
   */
  public forceUnmaximize() {
    if (this.titleBarView) {
      {
        if (
          !this.mainView ||
          !viewExists(this.mainView) ||
          !this.mainWindow ||
          !windowExists(this.mainWindow)
        ) {
          return;
        }
        const [width, height] = this.mainWindow?.getSize();
        this.mainView.setBounds({
          width,
          height: height - TITLE_BAR_HEIGHT,
          x: 0,
          y: TITLE_BAR_HEIGHT,
        });
        this.titleBarView.setBounds({
          width,
          height: TITLE_BAR_HEIGHT,
          x: 0,
          y: 0,
        });
        mainEvents.publish('unmaximize');
        // Workaround as electron does not resize devtools automatically
        if (this.mainView.webContents.isDevToolsOpened()) {
          this.mainView.webContents.toggleDevTools();
          this.mainView.webContents.toggleDevTools();
        }
      }
    }
  }

  /**
   * Verifies and toggle devtool based on global config settings
   * else displays a dialog
   */
  public onRegisterDevtools(): void {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (!focusedWindow || !windowExists(focusedWindow)) {
      return;
    }
    const { devToolsEnabled } = config.getConfigFields(['devToolsEnabled']);
    if (devToolsEnabled) {
      if (
        this.mainWindow &&
        windowExists(this.mainWindow) &&
        focusedWindow === this.mainWindow
      ) {
        if (this.mainView && viewExists(this.mainView)) {
          this.mainWebContents?.toggleDevTools();
          return;
        }
      }
      focusedWindow.webContents.toggleDevTools();
      return;
    }
    focusedWindow.webContents.closeDevTools();
    logger.info(
      `window-handler: dev tools disabled by admin, not opening it for the user!`,
    );
  }

  /**
   * Switch between clients 1.5, 2.0 and 2.0 daily
   * @param clientSwitch client switch you want to switch to.
   */
  public async switchClient(clientSwitch: ClientSwitchType): Promise<void> {
    logger.info(`window handler: switch to client ${clientSwitch}`);

    if (!this.mainWebContents || this.mainWebContents.isDestroyed()) {
      logger.info(
        `window-handler: switch client - main window web contents destroyed already! exiting`,
      );
      return;
    }
    try {
      if (!this.url) {
        this.url = this.globalConfig.url;
      }
      const parsedUrl = parse(this.url);
      const csrfToken = await this.mainWebContents?.executeJavaScript(
        `localStorage.getItem('x-km-csrf-token')`,
      );

      switch (clientSwitch) {
        case ClientSwitchType.CLIENT_2_0:
          this.url = `https://${parsedUrl.hostname}/client-bff/index.html?x-km-csrf-token=${csrfToken}`;
          break;
        case ClientSwitchType.CLIENT_2_0_DAILY:
          this.url = `https://${parsedUrl.hostname}/bff-daily/daily/index.html?x-km-csrf-token=${csrfToken}`;
          break;
        case ClientSwitchType.STARTPAGE_CLIENT_2_0:
          this.url = `https://${parsedUrl.hostname}/apps/client2`;
          break;
        case ClientSwitchType.STARTPAGE_CLIENT_2_0_DAILY:
          this.url = `https://${parsedUrl.hostname}/apps/client2/daily`;
          break;
        default:
          this.url = this.globalConfig.url + `?x-km-csrf-token=${csrfToken}`;
      }
      await this.closeScreenSharingIndicator();
      const userAgent = this.getUserAgent(this.mainWebContents);
      await this.mainWebContents.loadURL(this.url, { userAgent });
    } catch (e) {
      logger.error(
        `window-handler: failed to switch client because of error ${e}`,
      );
    }
  }

  /**
   * Reloads the window based on the window type
   */
  public onReload(): void {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (!focusedWindow || !windowExists(focusedWindow)) {
      return;
    }
    reloadWindow(focusedWindow as ICustomBrowserWindow);
  }

  /**
   * Exports all logs
   */
  public onExportLogs(): void {
    logger.info('window-handler: Exporting logs');
    exportLogs();
  }

  /**
   * Moves snipping tool to the right place after restoring all hidden windows
   * @param focusedWindow Focused window where snipping tool window should be moved
   */
  public moveSnippingToolWindow(focusedWindow: BrowserWindow): void {
    if (this.snippingToolWindow && !this.snippingToolWindow.isDestroyed()) {
      this.snippingToolWindow.setAlwaysOnTop(true);
      this.snippingToolWindow.setParentWindow(focusedWindow);
      this.moveWindow(this.snippingToolWindow, undefined, focusedWindow);
    }
  }

  /**
   * Setting origin for main window
   */
  public setMainWindowOrigin(url: string) {
    if (this.mainWindow && windowExists(this.mainWindow)) {
      this.mainWindow.origin = url;
    }
  }

  /**
   * Listens for app load timeouts and reloads if required
   */
  private listenForLoad() {
    setTimeout(async () => {
      if (!this.finishedLoading) {
        logger.info(`window-handler: Pod load failed on launch`);
        if (this.mainWebContents && !this.mainWebContents.isDestroyed()) {
          const webContentsUrl = this.mainWebContents?.getURL();
          logger.info(
            `window-handler: Current main window url is ${webContentsUrl}.`,
          );
          const reloadUrl =
            webContentsUrl || this.userConfig.url || this.globalConfig.url;
          logger.info(`window-handler: Trying to reload ${reloadUrl}.`);
          const userAgent = this.getUserAgent(this.mainWebContents);
          await this.mainWebContents.loadURL(reloadUrl, { userAgent });
          return;
        }
        logger.error(
          `window-handler: Cannot reload as main window does not exist`,
        );
      }
    }, LISTEN_TIMEOUT);
  }

  /**
   * Sets the about panel details for macOS
   */
  private setAboutPanel() {
    if (!isMac) {
      return;
    }
    const appName = app.getName();
    const copyright = `Copyright \xA9 ${new Date().getFullYear()} ${appName}`;
    app.setAboutPanelOptions({
      applicationName: appName,
      applicationVersion: versionHandler.versionInfo.clientVersion,
      version: versionHandler.versionInfo.buildNumber,
      copyright,
    });
  }

  /**
   * Cleans up reference
   */
  private destroyAllWindows(): void {
    for (const key in this.windows) {
      if (Object.prototype.hasOwnProperty.call(this.windows, key)) {
        const winKey = this.windows[key];
        this.removeWindow(winKey);
      }
    }
    this.mainWindow = null;
  }

  /**
   * Check if build is expired and show an error message
   * @param browserWindow Focused window instance
   */
  private async checkExpiry(browserWindow: BrowserWindow) {
    logger.info(
      `window handler: calling ttl handler to check for build expiry!`,
    );
    const buildExpired = checkIfBuildExpired();
    if (!buildExpired) {
      logger.info(`window handler: build not expired, proceeding further!`);
      return;
    }
    logger.info(
      `window handler: build expired, will inform the user and quit the app!`,
    );

    const options = {
      type: 'error',
      title: i18n.t('Build expired')(),
      message: i18n.t(
        'Sorry, this is a test build and it has expired. Please contact your administrator to get a production build.',
      )(),
      buttons: [i18n.t('Quit')()],
      cancelId: 0,
    };

    const { response } = await dialog.showMessageBox(browserWindow, options);
    if (response === 0) {
      app.exit();
    }
  }

  /**
   * Returns constructor opts for the browser window
   *
   * @param windowOpts {Electron.BrowserWindowConstructorOptions}
   * @param webPreferences {Electron.WebPreferences}
   */
  private getWindowOpts(
    windowOpts: Electron.BrowserWindowConstructorOptions,
    webPreferences: Electron.WebPreferences,
  ): ICustomBrowserWindowConstructorOpts {
    const defaultPreferencesOpts = {
      ...{
        sandbox: IS_SAND_BOXED,
        nodeIntegration: IS_NODE_INTEGRATION_ENABLED,
        contextIsolation: this.contextIsolation,
        backgroundThrottling: this.backgroundThrottling,
        enableRemoteModule: true,
        disableBlinkFeatures: AUX_CLICK,
      },
      ...webPreferences,
    };
    const defaultWindowOpts = {
      alwaysOnTop: false,
      webPreferences: defaultPreferencesOpts,
      winKey: getGuid(),
    };

    return { ...defaultWindowOpts, ...windowOpts };
  }

  /**
   * getUserAgent retrieves current window user-agent and updates it
   * depending on global config setup
   * Electron user-agent is removed due to Microsoft Azure not supporting SSO if found - cf SDA-3201
   * @param webContents
   * @returns updated user-agents
   */
  private getUserAgent(webContents: WebContents): string {
    const doOverrideUserAgents = !!this.globalConfig.overrideUserAgent;
    let userAgent = webContents.getUserAgent();
    if (doOverrideUserAgents) {
      const electronUserAgentRegex = /Electron/;
      userAgent = userAgent.replace(electronUserAgentRegex, 'ElectronSymphony');
    }
    return userAgent;
  }
}

const windowHandler = new WindowHandler();

export { windowHandler };
