import { ExecException, execFile } from 'child_process';
import {
  app,
  BrowserWindow,
  BrowserWindowConstructorOptions,
  crashReporter,
  DesktopCapturerSource,
  dialog,
  globalShortcut,
  ipcMain,
  screen,
  shell,
} from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { format, parse } from 'url';

import { apiName, Themes, WindowTypes } from '../common/api-interface';
import {
  isDevEnv,
  isLinux,
  isMac,
  isNodeEnv,
  isWindowsOS,
} from '../common/env';
import { i18n, LocaleType } from '../common/i18n';
import { logger } from '../common/logger';
import {
  calculatePercentage,
  getCommandLineArgs,
  getGuid,
} from '../common/utils';
import { notification } from '../renderer/notification';
import { cleanAppCacheOnCrash } from './app-cache-handler';
import { AppMenu } from './app-menu';
import { handleChildWindow } from './child-window-handler';
import {
  CloudConfigDataTypes,
  config,
  IConfig,
  IGlobalConfig,
} from './config-handler';
import crashHandler from './crash-handler';
import { SpellChecker } from './spell-check-handler';
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
  injectStyles,
  isSymphonyReachable,
  monitorNetworkInterception,
  preventWindowNavigation,
  reloadWindow,
  windowExists,
  zoomIn,
  zoomOut,
} from './window-utils';

const windowSize: string | null = getCommandLineArgs(
  process.argv,
  '--window-size',
  false,
);

enum ClientSwitchType {
  CLIENT_1_5 = 'CLIENT_1_5',
  CLIENT_2_0 = 'CLIENT_2_0',
  CLIENT_2_0_DAILY = 'CLIENT_2_0_DAILY',
}

interface ICustomBrowserWindowConstructorOpts
  extends Electron.BrowserWindowConstructorOptions {
  winKey: string;
}

export interface ICustomBrowserWindow extends Electron.BrowserWindow {
  winName: string;
  notificationData?: object;
  origin?: string;
}

// Default window width & height
let DEFAULT_WIDTH: number = 900;
let DEFAULT_HEIGHT: number = 900;

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
  public appMenu: AppMenu | null;
  public isAutoReload: boolean;
  public isOnline: boolean;
  public url: string | undefined;
  public startUrl!: string;
  public isMana: boolean = false;
  public willQuitApp: boolean = false;
  public spellchecker: SpellChecker | undefined;
  public isCustomTitleBar: boolean;
  public isWebPageLoading: boolean = true;
  public isLoggedIn: boolean = false;
  public screenShareIndicatorFrameUtil: string;
  public shouldShowWelcomeScreen: boolean = false;
  private readonly defaultPodUrl: string = 'https://[POD].symphony.com';
  private readonly contextIsolation: boolean;
  private readonly backgroundThrottling: boolean;
  private readonly windowOpts: ICustomBrowserWindowConstructorOpts;
  private readonly globalConfig: IGlobalConfig;
  private readonly userConfig: IConfig;
  private readonly config: IConfig;
  // Window reference
  private readonly windows: object;
  private loadFailError: string | undefined;
  private mainWindow: ICustomBrowserWindow | null = null;
  private aboutAppWindow: Electron.BrowserWindow | null = null;
  private screenPickerWindow: Electron.BrowserWindow | null = null;
  private screenSharingIndicatorWindow: Electron.BrowserWindow | null = null;
  private screenSharingFrameWindow: Electron.BrowserWindow | null = null;
  private basicAuthWindow: Electron.BrowserWindow | null = null;
  private notificationSettingsWindow: Electron.BrowserWindow | null = null;
  private snippingToolWindow: Electron.BrowserWindow | null = null;
  private finishedLoading: boolean;

  constructor(opts?: Electron.BrowserViewConstructorOptions) {
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
    ]);
    logger.info(
      `window-handler: main windows initialized with following config data`,
      this.config,
    );

    this.globalConfig = config.getGlobalConfigFields([
      'url',
      'contextIsolation',
      'contextOriginUrl',
    ]);
    this.userConfig = config.getUserConfigFields(['url']);

    const { customFlags } = this.config;
    const { disableThrottling } = config.getCloudConfigFields([
      'disableThrottling',
    ]) as any;

    this.windows = {};
    this.contextIsolation = true;
    if (this.globalConfig.contextIsolation !== undefined) {
      this.contextIsolation = this.globalConfig.contextIsolation;
    }
    this.backgroundThrottling =
      customFlags.disableThrottling !== CloudConfigDataTypes.ENABLED ||
      disableThrottling !== CloudConfigDataTypes.ENABLED;
    this.isCustomTitleBar =
      isWindowsOS &&
      this.config.isCustomTitleBar === CloudConfigDataTypes.ENABLED;
    this.windowOpts = {
      ...this.getWindowOpts(
        {
          alwaysOnTop:
            this.config.alwaysOnTop === CloudConfigDataTypes.ENABLED || false,
          frame: !this.isCustomTitleBar,
          minHeight: 300,
          minWidth: 300,
          title: 'Symphony',
        },
        {
          preload: path.join(__dirname, '../renderer/_preload-main.js'),
        },
      ),
      ...opts,
    };
    this.isAutoReload = false;
    this.isOnline = true;

    this.finishedLoading = false;

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

    this.appMenu = null;
    const locale: LocaleType = (this.config.locale ||
      app.getLocale()) as LocaleType;
    i18n.setLocale(locale);

    this.listenForLoad();
  }

  /**
   * Starting point of the app
   */
  public async createApplication() {
    this.spellchecker = new SpellChecker();
    logger.info(
      `window-handler: initialized spellchecker module with locale ${this.spellchecker.locale}`,
    );

    logger.info(
      'window-handler: createApplication mainWinPos: ' +
        JSON.stringify(this.config.mainWinPos),
    );

    let { isFullScreen, isMaximized } = this.config.mainWinPos
      ? this.config.mainWinPos
      : { isFullScreen: false, isMaximized: false };

    this.url = WindowHandler.getValidUrl(
      this.userConfig.url ? this.userConfig.url : this.globalConfig.url,
    );
    logger.info(`window-handler: setting url ${this.url} from config file!`);

    if (
      config.isFirstTimeLaunch() &&
      this.globalConfig.url.indexOf('https://my.symphony.com') >= 0
    ) {
      this.shouldShowWelcomeScreen = true;
      this.url = this.defaultPodUrl;
      isMaximized = false;
      isFullScreen = false;
      DEFAULT_HEIGHT = 333;
      DEFAULT_WIDTH = 542;
      this.windowOpts.resizable = false;
      this.windowOpts.maximizable = false;
      this.windowOpts.fullscreenable = false;

      if (this.config.mainWinPos && this.config.mainWinPos.height) {
        this.config.mainWinPos.height = DEFAULT_HEIGHT;
      }

      if (this.config.mainWinPos && this.config.mainWinPos.width) {
        this.config.mainWinPos.width = DEFAULT_WIDTH;
      }

      if (this.config.mainWinPos && this.config.mainWinPos.x) {
        this.config.mainWinPos.x = undefined;
      }

      if (this.config.mainWinPos && this.config.mainWinPos.y) {
        this.config.mainWinPos.y = undefined;
      }
    }

    logger.info('window-handler: windowSize: ' + JSON.stringify(windowSize));
    if (windowSize) {
      const args = windowSize.split('=');
      const sizes = args[1].split(',');
      logger.info('window-handler: windowSize: args: ' + JSON.stringify(args));
      logger.info(
        'window-handler: windowSize: sizes: ' + JSON.stringify(sizes),
      );
      DEFAULT_WIDTH = Number(sizes[0]);
      DEFAULT_HEIGHT = Number(sizes[1]);
      if (this.config.mainWinPos) {
        this.config.mainWinPos.width = DEFAULT_WIDTH;
        this.config.mainWinPos.height = DEFAULT_HEIGHT;
      }
    }

    // set window opts with additional config
    this.mainWindow = new BrowserWindow({
      ...this.windowOpts,
      ...getBounds(this.config.mainWinPos, DEFAULT_WIDTH, DEFAULT_HEIGHT),
    }) as ICustomBrowserWindow;

    logger.info(
      'window-handler: this.mainWindow.getBounds: ' +
        JSON.stringify(this.mainWindow.getBounds()),
    );

    this.mainWindow.winName = apiName.mainWindowName;
    // Get url to load from cmd line or from global config file
    const urlFromCmd = getCommandLineArgs(process.argv, '--url=', false);

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
          this.shouldShowWelcomeScreen = false;
          isMaximized = true;
          isFullScreen = false;
          this.mainWindow.resizable = true;
          this.mainWindow.maximizable = true;
          this.mainWindow.fullScreenable = true;
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
        this.shouldShowWelcomeScreen = false;
        isMaximized = true;
        isFullScreen = false;
        this.mainWindow.resizable = true;
        this.mainWindow.maximizable = true;
        this.mainWindow.fullScreenable = true;
      }
    }

    if (isMaximized) {
      this.mainWindow.maximize();
      logger.info(`window-handler: window is maximized!`);
    }

    if (isFullScreen) {
      logger.info(`window-handler: window is in full screen!`);
      this.mainWindow.setFullScreen(true);
    }

    this.startUrl = this.url;
    if (this.shouldShowWelcomeScreen) {
      this.handleWelcomeScreen();
    }

    cleanAppCacheOnCrash(this.mainWindow);
    // loads the main window with url from config/cmd line
    logger.info(`Loading main window with url ${this.url}`);
    this.mainWindow.loadURL(this.url);
    // check for build expiry in case of test builds
    this.checkExpiry(this.mainWindow);
    // update version info from server
    this.updateVersionInfo();
    // need this for postMessage origin
    this.mainWindow.origin = this.globalConfig.contextOriginUrl || this.url;

    // Event needed to hide native menu bar on Windows 10 as we use custom menu bar
    this.mainWindow.webContents.once('did-start-loading', () => {
      logger.info(
        `window-handler: main window web contents started loading for url ${this.mainWindow?.webContents.getURL()}!`,
      );
      this.finishedLoading = false;
      this.listenForLoad();
      if (
        this.config.isCustomTitleBar === CloudConfigDataTypes.ENABLED &&
        isWindowsOS &&
        this.mainWindow &&
        windowExists(this.mainWindow)
      ) {
        this.mainWindow.setMenuBarVisibility(false);
      }
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

    this.mainWindow.once('ready-to-show', (event: Electron.Event) => {
      logger.info(`window-handler: Main Window ready to show: ${event}`);
    });

    this.mainWindow.webContents.on('did-finish-load', async () => {
      // reset to false when the client reloads
      this.isMana = false;
      logger.info(`window-handler: main window web contents finished loading!`);
      // early exit if the window has already been destroyed
      if (!this.mainWindow || !windowExists(this.mainWindow)) {
        logger.info(
          `window-handler: main window web contents destroyed already! exiting`,
        );
        return;
      }
      this.finishedLoading = true;
      this.url = this.mainWindow.webContents.getURL();
      if (this.url.indexOf('about:blank') === 0) {
        logger.info(
          `Looks like about:blank got loaded which may lead to blank screen`,
        );
        logger.info(`Reloading the app to check if it resolves the issue`);
        await this.mainWindow.loadURL(
          this.userConfig.url || this.globalConfig.url,
        );
        return;
      }
      logger.info('window-handler: did-finish-load, url: ' + this.url);

      // Injects custom title bar and snack bar css into the webContents
      await injectStyles(this.mainWindow, this.isCustomTitleBar);

      this.mainWindow.webContents.send('page-load', {
        isWindowsOS,
        locale: i18n.getLocale(),
        resources: i18n.loadedResources,
        enableCustomTitleBar: this.isCustomTitleBar,
        isMainWindow: true,
      });
      this.appMenu = new AppMenu();
      const { permissions } = config.getConfigFields(['permissions']);
      this.mainWindow.webContents.send(
        'is-screen-share-enabled',
        permissions.media,
      );
    });

    this.mainWindow.webContents.on(
      'did-fail-load',
      (_event, errorCode, errorDesc, validatedURL) => {
        logger.error(
          `window-handler: Failed to load ${validatedURL}, with an error: ${errorCode}::${errorDesc}`,
        );
        this.loadFailError = errorDesc;
      },
    );

    this.mainWindow.webContents.on('did-stop-loading', async () => {
      if (this.mainWindow && windowExists(this.mainWindow)) {
        this.mainWindow.webContents.send('page-load-failed', {
          locale: i18n.getLocale(),
          resources: i18n.loadedResources,
        });
        const href = await this.mainWindow.webContents.executeJavaScript(
          'document.location.href',
        );
        try {
          if (
            href === 'data:text/html,chromewebdata' ||
            href === 'chrome-error://chromewebdata/'
          ) {
            if (this.mainWindow && windowExists(this.mainWindow)) {
              this.mainWindow.webContents.insertCSS(
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
              this.mainWindow.webContents.send('network-error', {
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

    this.mainWindow.webContents.on(
      'crashed',
      async (_event: Event, killed: boolean) => {
        if (killed) {
          logger.info(`window-handler: main window crashed (killed)!`);
          return;
        }
        logger.info(`window-handler: main window crashed!`);
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
        if (this.mainWindow && this.mainWindow.webContents.isDevToolsOpened()) {
          this.mainWindow.webContents.closeDevTools();
        }
        return this.destroyAllWindows();
      }

      const { minimizeOnClose } = config.getConfigFields(['minimizeOnClose']);
      if (minimizeOnClose === CloudConfigDataTypes.ENABLED) {
        event.preventDefault();
        this.mainWindow.minimize();
        return;
      }

      if (isMac) {
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
        this.execCmd(this.screenShareIndicatorFrameUtil, []);
      }
      this.closeAllWindow();
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
    if (!isDevEnv) {
      this.mainWindow.webContents.session.setCertificateVerifyProc(
        handleCertificateProxyVerification,
      );
    }

    // Register global shortcuts
    this.registerGlobalShortcuts();

    // Validate window navigation
    preventWindowNavigation(this.mainWindow, false);

    // Handle media/other permissions
    handlePermissionRequests(this.mainWindow.webContents);

    // Start monitoring window actions
    monitorWindowActions(this.mainWindow);

    // Download manager
    this.mainWindow.webContents.session.on(
      'will-download',
      handleDownloadManager,
    );

    // store window ref
    this.addWindow(this.windowOpts.winKey, this.mainWindow);

    // Handle pop-outs window
    handleChildWindow(this.mainWindow.webContents);

    if (this.config.enableRendererLogs) {
      this.mainWindow.webContents.on('console-message', onConsoleMessages);
    }

    return this.mainWindow;
  }

  /**
   * Handles the use case of showing
   * welcome screen for first time installs
   */
  public handleWelcomeScreen() {
    if (!this.url || !this.mainWindow) {
      return;
    }

    if (this.url.startsWith(this.defaultPodUrl)) {
      this.url = format({
        pathname: require.resolve('../renderer/react-window.html'),
        protocol: 'file',
        query: {
          componentName: 'welcome',
          locale: i18n.getLocale(),
        },
        slashes: true,
      });
    }

    this.mainWindow.webContents.on('did-finish-load', () => {
      if (!this.url || !this.mainWindow) {
        return;
      }
      logger.info(`finished loading welcome screen.`);
      if (this.url.indexOf('welcome')) {
        this.mainWindow.webContents.send('page-load-welcome', {
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

        this.mainWindow.webContents.send('welcome', {
          url: userConfigUrl || this.startUrl,
          message: '',
          urlValid: !!userConfigUrl,
          sso: false,
        });
      }
    });

    ipcMain.on('set-pod-url', async (_event, newPodUrl: string) => {
      await config.updateUserConfig({ url: newPodUrl });
      app.relaunch();
      app.exit();
    });
  }

  /**
   * Gets the main window
   */
  public getMainWindow(): ICustomBrowserWindow | null {
    return this.mainWindow;
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
        if (winKey) {
          const browserWindow = this.windows[winKey];

          if (browserWindow && windowExists(browserWindow)) {
            browserWindow.destroy();
          }
        }
        if (isWindowsOS || isMac) {
          const timeoutValue = 300;
          setTimeout(
            () => this.execCmd(this.screenShareIndicatorFrameUtil, []),
            timeoutValue,
          );
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
  public async closeAllWindow(): Promise<void> {
    const browserWindows = BrowserWindow.getAllWindows();
    await notification.cleanUp();
    if (browserWindows && browserWindows.length) {
      browserWindows.forEach((win) => {
        const browserWindow = win as ICustomBrowserWindow;
        if (browserWindow && windowExists(browserWindow)) {
          // Closes only child windows
          if (
            browserWindow.winName !== apiName.mainWindowName &&
            browserWindow.winName !== apiName.notificationWindowName
          ) {
            if (browserWindow.closable) {
              browserWindow.close();
            } else {
              browserWindow.destroy();
            }
          }
        }
      });
    }
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
   * @param key {string}
   * @param window {Electron.BrowserWindow}
   */
  public hasWindow(key: string, window: Electron.BrowserWindow): boolean {
    const browserWindow = this.windows[key];
    return browserWindow && window === browserWindow;
  }

  /**
   * Move window to the same screen as main window
   */
  public moveWindow(windowToMove: BrowserWindow, fixedYPosition?: number) {
    if (this.mainWindow && windowExists(this.mainWindow)) {
      const display = screen.getDisplayMatching(this.mainWindow.getBounds());

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
        width: 440,
        height: 315,
        modal: true,
        alwaysOnTop: isMac,
        resizable: false,
        fullscreenable: false,
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

    this.aboutAppWindow = createComponentWindow('about-app', opts);
    this.moveWindow(this.aboutAppWindow);
    this.aboutAppWindow.setVisibleOnAllWorkspaces(true);

    this.aboutAppWindow.webContents.once('did-finish-load', async () => {
      let client = '';
      if (this.url && this.url.startsWith('https://corporate.symphony.com')) {
        const manaPath = 'client-bff';
        const daily = 'daily';
        client = this.url.includes(manaPath)
          ? this.url.includes(daily)
            ? 'Symphony 2.0 - Daily'
            : 'Symphony 2.0'
          : 'Symphony Classic';
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
  ): void {
    // Prevents creating multiple instances
    if (didVerifyAndRestoreWindow(this.snippingToolWindow)) {
      logger.error('window-handler: Could not open snipping tool window');
      return;
    }

    logger.info(
      'window-handler, createSnippingToolWindow: Receiving snippet props: ' +
        JSON.stringify({
          snipImage,
          snipDimensions,
        }),
    );

    const allDisplays = screen.getAllDisplays();
    logger.info(
      'window-handler, createSnippingToolWindow: User has these displays: ' +
        JSON.stringify(allDisplays),
    );

    if (!this.mainWindow) {
      logger.error('window-handler: Could not get main window');
      return;
    }

    const OS_PADDING = 25;
    const MIN_TOOL_HEIGHT = 312;
    const MIN_TOOL_WIDTH = 320;
    const BUTTON_BAR_TOP_HEIGHT = 48;
    const BUTTON_BAR_BOTTOM_HEIGHT = 72;
    const BUTTON_BARS_HEIGHT = BUTTON_BAR_TOP_HEIGHT + BUTTON_BAR_BOTTOM_HEIGHT;

    const display = screen.getDisplayMatching(this.mainWindow.getBounds());
    const workAreaSize = display.workAreaSize;
    const maxToolHeight = Math.floor(
      calculatePercentage(workAreaSize.height, 90),
    );
    const maxToolWidth = Math.floor(
      calculatePercentage(workAreaSize.width, 90),
    );
    const availableAnnotateAreaHeight = maxToolHeight - BUTTON_BARS_HEIGHT;
    const availableAnnotateAreaWidth = maxToolWidth;
    const scaleFactor = display.scaleFactor;
    const scaledImageDimensions = {
      height: Math.floor(snipDimensions.height / scaleFactor),
      width: Math.floor(snipDimensions.width / scaleFactor),
    };
    logger.info(
      'window-handler, createSnippingToolWindow: Image will open with scaled dimensions: ' +
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

    const opts: ICustomBrowserWindowConstructorOpts = this.getWindowOpts(
      {
        width: toolWidth,
        height: toolHeight,
        modal: false,
        alwaysOnTop: false,
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

    if (isWindowsOS && this.mainWindow) {
      opts.parent = this.mainWindow;
    }

    this.snippingToolWindow = createComponentWindow('snipping-tool', opts);
    this.moveWindow(this.snippingToolWindow);
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
            'window-handler: Could not create window with correct size, resizing with setBounds',
          );
          this.snippingToolWindow.setBounds({
            height: toolHeight,
            width: toolWidth,
          });
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

    this.snippingToolWindow.once('closed', () => {
      logger.info(
        'window-handler, createSnippingToolWindow: Closing snipping window, attempting to delete temp snip image',
      );
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
    window: Electron.WebContents,
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
        modal: true,
        height: isMac ? 519 : 523,
        width: 580,
        show: false,
        fullscreenable: false,
      },
      {
        devTools: isDevEnv,
      },
    );
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow && windowExists(focusedWindow) && isWindowsOS) {
      opts.parent = focusedWindow;
    }

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

        this.execCmd(this.screenShareIndicatorFrameUtil, []);
        const timeoutValue = 300;
        setTimeout(
          () => this.drawScreenShareIndicatorFrame(source),
          timeoutValue,
        );
      }
    };

    ipcMain.on('screen-source-select', screenSourceSelect);

    ipcMain.once('screen-source-selected', (_event, source) => {
      logger.info(`window-handler: screen-source-selected`, source, id);
      if (source == null) {
        this.execCmd(this.screenShareIndicatorFrameUtil, []);
      }

      window.send('start-share' + id, source);
      if (this.screenPickerWindow && windowExists(this.screenPickerWindow)) {
        this.screenPickerWindow.close();
      }
    });
    this.screenPickerWindow.once('closed', () => {
      ipcMain.removeListener('screen-source-select', screenSourceSelect);
      this.removeWindow(opts.winKey);
      this.screenPickerWindow = null;
    });
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
    const opts = this.getWindowOpts(
      {
        width: 360,
        height: isMac ? 270 : 295,
        show: false,
        modal: true,
        autoHideMenuBar: true,
        resizable: false,
      },
      {
        devTools: isDevEnv,
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
        this.basicAuthWindow = null;
      }
    };

    const login = (_event, arg) => {
      const { username, password } = arg;
      callback(username, password);
      closeBasicAuth(null, false);
    };

    this.basicAuthWindow.once('close', () => {
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
   * @param screenSharingWebContents {Electron.webContents}
   * @param displayId {string} - current display id
   * @param id {number} - postMessage request id
   * @param streamId {string} - MediaStream id
   */
  public createScreenSharingIndicatorWindow(
    screenSharingWebContents: Electron.webContents,
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
          modal: true,
          frame: false,
          focusable: true,
          transparent: true,
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
  public reloadSymphony() {
    if (this.mainWindow && windowExists(this.mainWindow)) {
      // If the client is fully loaded, upon network interruption, load that
      if (this.isLoggedIn) {
        logger.info(
          `window-utils: user has logged in, getting back to Symphony app`,
        );
        this.mainWindow.loadURL(
          this.url || this.userConfig.url || this.globalConfig.url,
        );
        return;
      }
      // If not, revert to loading the starting pod url
      logger.info(
        `window-utils: user hasn't logged in yet, loading login page again`,
      );
      this.mainWindow.loadURL(this.userConfig.url || this.globalConfig.url);
    }
  }

  /**
   * Listens for app load timeouts and reloads if required
   */
  private listenForLoad() {
    setTimeout(async () => {
      if (!this.finishedLoading) {
        logger.info(`window-handler: Pod load failed on launch`);
        if (this.mainWindow && windowExists(this.mainWindow)) {
          const webContentsUrl = this.mainWindow.webContents.getURL();
          logger.info(
            `window-handler: Current main window url is ${webContentsUrl}.`,
          );
          const reloadUrl =
            webContentsUrl || this.userConfig.url || this.globalConfig.url;
          logger.info(`window-handler: Trying to reload ${reloadUrl}.`);
          await this.mainWindow.loadURL(reloadUrl);
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
   * Registers keyboard shortcuts or devtools
   */
  private registerGlobalShortcuts(): void {
    logger.info(`window-handler: registering global shortcuts!`);
    globalShortcut.register(
      isMac ? 'Cmd+Alt+I' : 'Ctrl+Shift+I',
      this.onRegisterDevtools,
    );
    globalShortcut.register('CmdOrCtrl+R', this.onReload);

    // Hack to switch between Client 1.5, Mana-stable and Mana-daily
    if (this.url && this.url.startsWith('https://corporate.symphony.com')) {
      globalShortcut.register(isMac ? 'Cmd+Alt+1' : 'Ctrl+Shift+1', () =>
        this.switchClient(ClientSwitchType.CLIENT_1_5),
      );
      globalShortcut.register(isMac ? 'Cmd+Alt+2' : 'Ctrl+Shift+2', () =>
        this.switchClient(ClientSwitchType.CLIENT_2_0),
      );
      globalShortcut.register(isMac ? 'Cmd+Alt+3' : 'Ctrl+Shift+3', () =>
        this.switchClient(ClientSwitchType.CLIENT_2_0_DAILY),
      );
    } else {
      logger.info('Switch between clients not supported for this POD-url');
    }

    if (isMac) {
      globalShortcut.register('CmdOrCtrl+Plus', zoomIn);
      globalShortcut.register('CmdOrCtrl+=', zoomIn);
      if (this.isMana) {
        globalShortcut.register('CmdOrCtrl+-', zoomOut);
      }
    } else if (this.isMana && (isWindowsOS || isLinux)) {
      globalShortcut.register('Ctrl+=', zoomIn);
      globalShortcut.register('Ctrl+-', zoomOut);
    }

    app.on('browser-window-focus', () => {
      globalShortcut.register(
        isMac ? 'Cmd+Alt+I' : 'Ctrl+Shift+I',
        this.onRegisterDevtools,
      );
      globalShortcut.register('CmdOrCtrl+R', this.onReload);
      if (isMac) {
        globalShortcut.register('CmdOrCtrl+Plus', zoomIn);
        globalShortcut.register('CmdOrCtrl+=', zoomIn);
        if (this.isMana) {
          globalShortcut.register('CmdOrCtrl+-', zoomOut);
        }
      } else if (this.isMana && (isWindowsOS || isLinux)) {
        globalShortcut.register('Ctrl+=', zoomIn);
        globalShortcut.register('Ctrl+-', zoomOut);
      }

      if (this.url && this.url.startsWith('https://corporate.symphony.com')) {
        globalShortcut.register(isMac ? 'Cmd+Alt+1' : 'Ctrl+Shift+1', () =>
          this.switchClient(ClientSwitchType.CLIENT_1_5),
        );
        globalShortcut.register(isMac ? 'Cmd+Alt+2' : 'Ctrl+Shift+2', () =>
          this.switchClient(ClientSwitchType.CLIENT_2_0),
        );
        globalShortcut.register(isMac ? 'Cmd+Alt+3' : 'Ctrl+Shift+3', () =>
          this.switchClient(ClientSwitchType.CLIENT_2_0_DAILY),
        );
      } else {
        logger.info('Switch between clients not supported for this POD-url');
      }
    });

    app.on('browser-window-blur', () => {
      globalShortcut.unregister(isMac ? 'Cmd+Alt+I' : 'Ctrl+Shift+I');
      globalShortcut.unregister('CmdOrCtrl+R');
      if (isMac) {
        globalShortcut.unregister('CmdOrCtrl+Plus');
        globalShortcut.unregister('CmdOrCtrl+=');
        if (this.isMana) {
          globalShortcut.unregister('CmdOrCtrl+-');
        }
      } else if (this.isMana && (isWindowsOS || isLinux)) {
        globalShortcut.unregister('Ctrl+=');
        globalShortcut.unregister('Ctrl+-');
      }
      // Unregister shortcuts related to client switch
      if (this.url && this.url.startsWith('https://corporate.symphony.com')) {
        globalShortcut.unregister(isMac ? 'Cmd+Alt+1' : 'Ctrl+Shift+1');
        globalShortcut.unregister(isMac ? 'Cmd+Alt+2' : 'Ctrl+Shift+2');
        globalShortcut.unregister(isMac ? 'Cmd+Alt+3' : 'Ctrl+Shift+3');
      }
    });
  }

  /**
   * Verifies and toggle devtool based on global config settings
   * else displays a dialog
   */
  private onRegisterDevtools(): void {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (!focusedWindow || !windowExists(focusedWindow)) {
      return;
    }
    const { devToolsEnabled } = config.getConfigFields(['devToolsEnabled']);
    if (devToolsEnabled) {
      focusedWindow.webContents.toggleDevTools();
      return;
    }
    focusedWindow.webContents.closeDevTools();
    logger.info(
      `window-handler: dev tools disabled by admin, not opening it for the user!`,
    );
  }

  /**
   * Reloads the window based on the window type
   */
  private onReload(): void {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (!focusedWindow || !windowExists(focusedWindow)) {
      return;
    }
    reloadWindow(focusedWindow as ICustomBrowserWindow);
  }

  /**
   * Switch between clients 1.5, 2.0 and 2.0 daily
   * @param clientSwitch client switch you want to switch to.
   */
  private async switchClient(clientSwitch: ClientSwitchType): Promise<void> {
    logger.info(`window handler: switch to client ${clientSwitch}`);

    if (!this.mainWindow || !windowExists(this.mainWindow)) {
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
      const manaPath = 'client-bff';
      const manaChannel = 'daily';
      const csrfToken = await this.mainWindow.webContents.executeJavaScript(
        `localStorage.getItem('x-km-csrf-token')`,
      );
      switch (clientSwitch) {
        case ClientSwitchType.CLIENT_1_5:
          this.url = this.startUrl + `?x-km-csrf-token=${csrfToken}`;
          break;
        case ClientSwitchType.CLIENT_2_0:
          this.url = `https://${parsedUrl.hostname}/${manaPath}/index.html?x-km-csrf-token=${csrfToken}`;
          break;
        case ClientSwitchType.CLIENT_2_0_DAILY:
          this.url = `https://${parsedUrl.hostname}/${manaPath}/${manaChannel}/index.html?x-km-csrf-token=${csrfToken}`;
          break;
        default:
          this.url = this.globalConfig.url + `?x-km-csrf-token=${csrfToken}`;
      }
      this.execCmd(this.screenShareIndicatorFrameUtil, []);
      await this.mainWindow.loadURL(this.url);
    } catch (e) {
      logger.error(
        `window-handler: failed to switch client because of error ${e}`,
      );
    }
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
        sandbox: !isNodeEnv,
        nodeIntegration: isNodeEnv,
        contextIsolation: isNodeEnv ? false : this.contextIsolation,
        backgroundThrottling: this.backgroundThrottling,
        enableRemoteModule: true,
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
}

const windowHandler = new WindowHandler();

export { windowHandler };
