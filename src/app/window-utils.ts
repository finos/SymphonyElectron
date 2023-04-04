import {
  app,
  BrowserView,
  BrowserWindow,
  dialog,
  Menu,
  nativeImage,
  nativeTheme,
  Rectangle,
  screen,
  shell,
  Tray,
  WebContents,
} from 'electron';
import electron = require('electron');
import fetch from 'electron-fetch';
import { filesize } from 'filesize';
import * as fs from 'fs';
import * as path from 'path';
import { format, parse } from 'url';
import { apiName, EPresenceStatusGroup } from '../common/api-interface';

import { isDevEnv, isLinux, isMac, isWindowsOS } from '../common/env';
import { i18n, LocaleType } from '../common/i18n';
import { logger } from '../common/logger';
import { getDifferenceInDays, getGuid, getRandomTime } from '../common/utils';
import { whitelistHandler } from '../common/whitelist-handler';
import {
  CloudConfigDataTypes,
  config,
  ConfigFieldsToRestart,
  ICloudConfig,
  IConfig,
  ICustomRectangle,
} from './config-handler';
import { downloadHandler, IDownloadItem } from './download-handler';
import { memoryMonitor } from './memory-monitor';
import { screenSnippet } from './screen-snippet-handler';
import { updateAlwaysOnTop } from './window-actions';
import {
  AUX_CLICK,
  DEFAULT_HEIGHT,
  DEFAULT_WIDTH,
  ICustomBrowserView,
  ICustomBrowserWindow,
  IS_NODE_INTEGRATION_ENABLED,
  IS_SAND_BOXED,
  TITLE_BAR_HEIGHT,
  windowHandler,
} from './window-handler';

import { notification } from '../renderer/notification';
import { autoLaunchInstance } from './auto-launch-controller';
import { autoUpdate, AutoUpdateTrigger } from './auto-update-handler';
import { mainEvents } from './main-event-handler';
import { presenceStatus } from './presence-status-handler';
import { presenceStatusStore } from './stores';

interface IStyles {
  name: styleNames;
  content: string;
}

enum styleNames {
  titleBar = 'title-bar',
  snackBar = 'snack-bar',
  messageBanner = 'message-banner',
}

const checkValidWindow = true;
const { ctWhitelist } = config.getConfigFields(['ctWhitelist']);

// Network status check variables
const networkStatusCheckInterval = 10 * 1000;
let networkStatusCheckIntervalId;

const MAX_AUTO_UPDATE_CHECK_INTERVAL = 4 * 60 * 60 * 1000; // 4hrs
const MIN_AUTO_UPDATE_CHECK_INTERVAL = 2 * 60 * 60 * 1000; // 2hrs
let autoUpdateIntervalId;

let isNetworkMonitorInitialized = false;

const styles: IStyles[] = [];
const DOWNLOAD_MANAGER_NAMESPACE = 'DownloadManager';

const TITLE_BAR_EVENTS = [
  'maximize',
  'unmaximize',
  'move',
  'enter-full-screen',
  'leave-full-screen',
];

/**
 * Checks if window is valid and exists
 *
 * @param window {BrowserWindow}
 * @return boolean
 */
export const windowExists = (window: BrowserWindow): boolean =>
  !!window && typeof window.isDestroyed === 'function' && !window.isDestroyed();

/**
 * Checks if view is valid and exists
 *
 * @param view {BrowserView}
 * @return boolean
 */
export const viewExists = (view: BrowserView): boolean =>
  !!view &&
  typeof view.webContents.isDestroyed === 'function' &&
  !view.webContents.isDestroyed();

/**
 * Prevents window from navigating
 *
 * @param browserWindow
 * @param isPopOutWindow
 */
export const preventWindowNavigation = (
  browserWindow: BrowserWindow,
  isPopOutWindow: boolean = false,
): void => {
  if (!browserWindow || !windowExists(browserWindow)) {
    return;
  }
  logger.info(
    `window-utils: preventing window from navigating!`,
    isPopOutWindow,
  );

  const listener = async (e: Electron.Event, winUrl: string) => {
    if (!winUrl.startsWith('https')) {
      logger.error(
        `window-utils: ${winUrl} doesn't start with https, so, not navigating!`,
      );
      e.preventDefault();
      return;
    }

    if (!isPopOutWindow) {
      const isValid = whitelistHandler.isWhitelisted(winUrl);
      if (!isValid) {
        e.preventDefault();
        if (browserWindow && windowExists(browserWindow)) {
          const response = await dialog.showMessageBox(browserWindow, {
            type: 'warning',
            buttons: ['OK'],
            title: i18n.t('Not Allowed')(),
            message: `${i18n.t(
              `Sorry, you are not allowed to access this website`,
            )()} (${winUrl}), ${i18n.t(
              'please contact your administrator for more details',
            )()}`,
          });
          logger.info(
            `window-utils: received ${response} response from dialog`,
          );
        }
      }

      windowHandler.closeScreenSharingIndicator();
    }

    if (
      browserWindow.isDestroyed() ||
      browserWindow.webContents.isDestroyed() ||
      winUrl === browserWindow.webContents.getURL()
    ) {
      return;
    }
  };

  if (isPopOutWindow) {
    browserWindow.webContents.on('will-navigate', listener);
  } else {
    const mainWebContents = windowHandler.getMainWebContents();
    if (mainWebContents && !mainWebContents.isDestroyed()) {
      mainWebContents.on('will-navigate', listener);
    }
  }

  browserWindow.once('close', () => {
    browserWindow.webContents.removeListener('will-navigate', listener);
  });
};

/**
 * Creates components windows
 *
 * @param componentName
 * @param opts
 * @param shouldFocus {boolean}
 */
export const createComponentWindow = (
  componentName: string,
  opts?: Electron.BrowserWindowConstructorOptions,
  shouldFocus: boolean = true,
): BrowserWindow => {
  const options: Electron.BrowserWindowConstructorOptions = {
    center: true,
    height: 300,
    maximizable: false,
    minimizable: false,
    resizable: false,
    show: false,
    width: 300,
    ...opts,
    webPreferences: {
      sandbox: IS_SAND_BOXED,
      nodeIntegration: IS_NODE_INTEGRATION_ENABLED,
      preload: path.join(__dirname, '../renderer/_preload-component.js'),
      devTools: isDevEnv,
      disableBlinkFeatures: AUX_CLICK,
    },
  };

  const browserWindow: ICustomBrowserWindow = new BrowserWindow(
    options,
  ) as ICustomBrowserWindow;
  if (shouldFocus) {
    browserWindow.once('ready-to-show', () => {
      if (!browserWindow || !windowExists(browserWindow)) {
        return;
      }
      browserWindow.show();
    });
  }
  browserWindow.webContents.once('did-finish-load', () => {
    if (!browserWindow || !windowExists(browserWindow)) {
      return;
    }
    browserWindow.webContents.send('page-load', {
      locale: i18n.getLocale(),
      resource: i18n.loadedResources,
    });
  });
  browserWindow.setMenu(null as any);

  const targetUrl = format({
    pathname: require.resolve(`../renderer/${componentName}.html`),
    protocol: 'file',
    query: {
      componentName,
      locale: i18n.getLocale(),
    },
    slashes: true,
  });

  browserWindow.loadURL(targetUrl);
  preventWindowNavigation(browserWindow);
  return browserWindow;
};

/**
 * Shows the badge count
 *
 * @param count {number}
 */
export const showBadgeCount = (count: number): void => {
  if (typeof count !== 'number') {
    logger.warn(
      `window-utils: badgeCount: invalid func arg, must be a number: ${count}`,
    );
    return;
  }

  logger.info(`window-utils: updating badge count to ${count}!`);

  if (isMac || isLinux) {
    // too big of a number here and setBadgeCount crashes
    app.setBadgeCount(Math.min(1e8, count));
    return;
  }

  // handle ms windows...
  const mainWebContents = windowHandler.getMainWebContents();
  if (!mainWebContents || mainWebContents.isDestroyed()) {
    return;
  }

  // get badge img from renderer process, will return
  // img dataUrl in setDataUrl func.
  const status = presenceStatusStore.getPresence();
  if (count > 0 && status.statusGroup !== EPresenceStatusGroup.OFFLINE) {
    mainWebContents.send('create-badge-data-url', { count });
    return;
  } else {
    const backgroundImage = presenceStatusStore.generateImagePath(
      status.statusGroup,
      'taskbar',
    );

    if (backgroundImage) {
      setStatusBadge(backgroundImage, status.statusGroup);
    }
  }
};

/**
 * Creates sys tray
 */
export const initSysTray = () => {
  const defaultSysTrayIcon = 'no-status-tray';
  const defaultSysTrayIconExtension = isWindowsOS ? 'ico' : 'png';
  const os = isWindowsOS ? 'windows' : isMac ? 'macOS' : 'linux';
  const theme = nativeTheme.shouldUseDarkColors ? 'light' : 'dark';
  logger.info('theme: ', theme, nativeTheme.themeSource);
  const assetsPath = `renderer/assets/presence-status/${os}/${theme}`;
  const defaultSysTrayIconPath = path.join(
    __dirname,
    `../${assetsPath}/${defaultSysTrayIcon}.${defaultSysTrayIconExtension}`,
  );
  const backgroundImage = nativeImage.createFromPath(defaultSysTrayIconPath);
  const tray = new Tray(backgroundImage);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: i18n.t('Quit Symphony')(),
      click: () => app.quit(),
    },
  ]);
  tray.setContextMenu(contextMenu);
  tray.setToolTip('Symphony');
  presenceStatusStore.setCurrentTray(tray);
  return tray;
};

/**
 * Sets the data url
 *
 * @param dataUrl
 * @param count
 */
export const setStatusBadge = (
  path: string,
  statusGroup?: EPresenceStatusGroup,
): void => {
  const mainWindow = windowHandler.getMainWindow();
  if (mainWindow && path && statusGroup) {
    const img = nativeImage.createFromPath(path);
    // for accessibility screen readers
    const desc = `Your current status group is ${i18n.t(
      statusGroup,
      'PresenceStatus',
    )()}`;
    mainWindow.setOverlayIcon(img, desc);
    logger.info('window-utils: Taskbar Presence Updated');
  }
};

export const setDataUrl = (dataUrl: string, count: number): void => {
  const mainWindow = windowHandler.getMainWindow();
  if (mainWindow && dataUrl && count) {
    const img = nativeImage.createFromDataURL(dataUrl);
    // for accessibility screen readers
    const desc = 'Symphony has ' + count + ' unread messages';
    mainWindow.setOverlayIcon(img, desc);
  }
};

/**
 * Ensure events comes from a window that we have created.
 *
 * @param  {BrowserWindow} browserWin  node emitter event to be tested
 * @return {Boolean} returns true if exists otherwise false
 */
export const isValidWindow = (
  browserWin: Electron.BrowserWindow | null,
): boolean => {
  if (!checkValidWindow) {
    return true;
  }
  let result: boolean = false;
  if (browserWin && !browserWin.isDestroyed()) {
    result = windowHandler.hasWindow(browserWin);
  }

  if (!result) {
    logger.warn(
      `window-utils: invalid window try to perform action, ignoring action`,
    );
  }

  return result;
};

/**
 * Ensure events comes from a view that we have created.
 *
 * @return {Boolean} returns true if exists otherwise false
 * @param webContents
 */
export const isValidView = (webContents: WebContents): boolean => {
  if (!checkValidWindow) {
    return true;
  }
  let result: boolean = false;
  if (webContents && !webContents.isDestroyed()) {
    result = windowHandler.hasView(webContents);
  }

  if (!result) {
    logger.warn(
      `window-utils: invalid window try to perform action, ignoring action`,
    );
  }

  return result;
};

/**
 * Updates the locale and rebuilds the entire application menu
 *
 * @param locale {LocaleType}
 */
export const updateLocale = async (locale: LocaleType): Promise<void> => {
  logger.info(`window-utils: updating locale to ${locale}!`);
  // sets the new locale
  i18n.setLocale(locale);
  const appMenu = windowHandler.appMenu;
  if (appMenu) {
    logger.info(`window-utils: updating app menu with locale ${locale}!`);
    appMenu.update(locale);
  }

  // Update notification after new locale
  notification.cleanUpInactiveNotification();

  if (i18n.isValidLocale(locale)) {
    // Update user config file with latest locale changes
    await config.updateUserConfig({ locale });
  }
};

/**
 * Displays a popup menu
 */
export const showPopupMenu = (opts: Electron.PopupOptions): void => {
  const browserWindow = windowHandler.getMainWindow();
  if (
    browserWindow &&
    windowExists(browserWindow) &&
    isValidWindow(browserWindow)
  ) {
    const coordinates = windowHandler.isCustomTitleBar
      ? { x: 20, y: 15 }
      : { x: 10, y: -20 };
    const { x, y } = browserWindow.isFullScreen()
      ? { x: 0, y: 0 }
      : coordinates;
    const popupOpts = { window: browserWindow, x, y };
    const appMenu = windowHandler.appMenu;
    if (appMenu) {
      appMenu.popupMenu({ ...popupOpts, ...opts });
    }
  }
};

/**
 * Method that is invoked when the application is reloaded/navigated
 * window.addEventListener('beforeunload')
 *
 * @param windowName {string}
 */
export const sanitize = (windowName: string): void => {
  // To make sure the reload event is from the main window
  const mainWindow = windowHandler.getMainWindow();
  if (mainWindow && windowName === mainWindow.winName) {
    // reset the badge count whenever an user refreshes the electron client
    showBadgeCount(0);

    // Terminates the screen snippet process and screen share indicator frame on reload
    if (!isMac || !isLinux) {
      logger.info(
        'window-utils: Terminating screen snippet and screen share indicator frame utils',
      );
      screenSnippet.killChildProcess();
      windowHandler.execCmd(windowHandler.screenShareIndicatorFrameUtil, []);
    }
    // Closes all the child windows
    windowHandler.closeAllWindows();
  }
};

/**
 * Returns the config stored rectangle if it is contained within the workArea of at
 * least one of the screens else returns the default rectangle value with out x, y
 * as the default is to center the window
 *
 * @param winPos {Electron.Rectangle}
 * @param defaultWidth
 * @param defaultHeight
 * @return {x?: Number, y?: Number, width: Number, height: Number}
 */
export const getBounds = (
  winPos: ICustomRectangle | Electron.Rectangle | undefined,
  defaultWidth: number,
  defaultHeight: number,
): Partial<Electron.Rectangle> => {
  logger.info('window-utils: getBounds, winPos: ' + JSON.stringify(winPos));

  if (!winPos || !winPos.x || !winPos.y || !winPos.width || !winPos.height) {
    return { width: defaultWidth, height: defaultHeight };
  }
  const displays = screen.getAllDisplays();

  for (let i = 0, len = displays.length; i < len; i++) {
    const bounds = displays[i].bounds;
    logger.info('window-utils: getBounds, bounds: ' + JSON.stringify(bounds));
    if (
      winPos.x >= bounds.x &&
      winPos.y >= bounds.y &&
      winPos.x + winPos.width <= bounds.x + bounds.width &&
      winPos.y + winPos.height <= bounds.y + bounds.height
    ) {
      return winPos;
    }
  }

  // Fit in the middle of immediate display
  const display = screen.getDisplayMatching(winPos as electron.Rectangle);

  if (display) {
    // Check that defaultWidth fits
    let windowWidth = defaultWidth;
    if (display.workArea.width < defaultWidth) {
      windowWidth = display.workArea.width;
    }

    // Check that defaultHeight fits
    let windowHeight = defaultHeight;
    if (display.workArea.height < defaultHeight) {
      windowHeight = display.workArea.height;
    }

    const windowX =
      display.workArea.x + display.workArea.width / 2 - windowWidth / 2;
    const windowY =
      display.workArea.y + display.workArea.height / 2 - windowHeight / 2;

    return { x: windowX, y: windowY, width: windowWidth, height: windowHeight };
  }

  return { width: defaultWidth, height: defaultHeight };
};

/**
 * Open downloaded file
 * @param type
 * @param filePath
 */
export const downloadManagerAction = async (type, filePath): Promise<void> => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  const message = i18n.t(
    'The file you are trying to open cannot be found in the specified path.',
    DOWNLOAD_MANAGER_NAMESPACE,
  )();
  const title = i18n.t('File not Found', DOWNLOAD_MANAGER_NAMESPACE)();

  if (!focusedWindow || !windowExists(focusedWindow)) {
    return;
  }

  if (type === 'open') {
    const fileExists = fs.existsSync(`${filePath}`);
    let openFileResponse;
    if (fileExists) {
      openFileResponse = await shell.openPath(filePath);
    }
    if (
      openFileResponse !== '' &&
      focusedWindow &&
      !focusedWindow.isDestroyed()
    ) {
      dialog.showMessageBox(focusedWindow, {
        message,
        title,
        type: 'error',
      });
    }
    return;
  }
  if (fs.existsSync(filePath)) {
    shell.showItemInFolder(filePath);
  } else {
    dialog.showMessageBox(focusedWindow, {
      message,
      title,
      type: 'error',
    });
  }
};

/**
 * Displays a UI with downloaded file similar to chrome
 * Invoked by webContents session's will-download event
 *
 * @param _event
 * @param item {Electron.DownloadItem}
 * @param webContents {WeContents}
 */
export const handleDownloadManager = (
  _event,
  item: Electron.DownloadItem,
  webContents: WebContents,
) => {
  // Send file path when download is complete
  item.once('done', (_e, state) => {
    if (state === 'completed') {
      const savePathSplit = item.getSavePath()?.split(path.sep);
      const downloadedItemTotalBytes: number = item.getTotalBytes() || 0;
      const data: IDownloadItem = {
        _id: getGuid(),
        savedPath: item.getSavePath() || '',
        total: filesize(downloadedItemTotalBytes, {
          output: 'string',
        }) as string,
        fileName: savePathSplit[savePathSplit.length - 1] || 'No name',
      };
      logger.info(
        'window-utils: Download completed, informing download manager',
      );
      webContents.send('downloadCompleted', data);
      downloadHandler.onDownloadSuccess(data);
    } else {
      logger.info('window-utils: Download failed, informing download manager');
      downloadHandler.onDownloadFailed();
    }
  });

  item.on('updated', (_e, state) => {
    if (state === 'interrupted') {
      logger.info('window-utils: Download is interrupted but can be resumed');
    } else if (state === 'progressing') {
      if (item.isPaused()) {
        logger.info('window-utils: Download is paused');
      } else {
        logger.info(`window-utils: Received bytes: ${item.getReceivedBytes()}`);
      }
    }
  });
};

/**
 * Inserts css in to the window
 *
 * @param mainWebContents {WebContents}
 */
const readAndInsertCSS = async (mainWebContents): Promise<IStyles[] | void> => {
  if (mainWebContents && !mainWebContents.isDestroyed()) {
    return styles.map(({ content }) => mainWebContents.insertCSS(content));
  }
};

/**
 * Inserts all the required css on to the specified windows
 *
 * @param mainView {WebContents}
 * @param isCustomTitleBar {boolean} - whether custom title bar enabled
 */
export const injectStyles = async (
  mainView: WebContents,
  isCustomTitleBar: boolean,
): Promise<IStyles[] | void> => {
  if (isCustomTitleBar) {
    const index = styles.findIndex(({ name }) => name === styleNames.titleBar);
    if (index === -1) {
      let titleBarStylesPath;
      const stylesFileName = path.join('config', 'titleBarStyles.css');
      if (isDevEnv) {
        titleBarStylesPath = path.join(app.getAppPath(), stylesFileName);
      } else {
        const execPath = path.dirname(app.getPath('exe'));
        titleBarStylesPath = path.join(execPath, stylesFileName);
      }
      // Window custom title bar styles
      if (fs.existsSync(titleBarStylesPath)) {
        styles.push({
          name: styleNames.titleBar,
          content: fs.readFileSync(titleBarStylesPath, 'utf8').toString(),
        });
      } else {
        const stylePath = path.join(
          __dirname,
          '..',
          '/renderer/styles/title-bar.css',
        );
        styles.push({
          name: styleNames.titleBar,
          content: fs.readFileSync(stylePath, 'utf8').toString(),
        });
      }
    }
  }
  // Snack bar styles
  if (styles.findIndex(({ name }) => name === styleNames.snackBar) === -1) {
    styles.push({
      name: styleNames.snackBar,
      content: fs
        .readFileSync(
          path.join(__dirname, '..', '/renderer/styles/snack-bar.css'),
          'utf8',
        )
        .toString(),
    });
  }

  // Banner styles
  if (
    styles.findIndex(({ name }) => name === styleNames.messageBanner) === -1
  ) {
    styles.push({
      name: styleNames.messageBanner,
      content: fs
        .readFileSync(
          path.join(__dirname, '..', '/renderer/styles/message-banner.css'),
          'utf8',
        )
        .toString(),
    });
  }

  await readAndInsertCSS(mainView);
  return;
};

/**
 * Proxy verification for root certificates
 *
 * @param request {any}
 * @param callback {(verificationResult: number) => void}
 */
export const handleCertificateProxyVerification = (
  request: any,
  callback: (verificationResult: number) => void,
): void => {
  const { hostname: hostUrl, errorCode } = request;

  if (errorCode === 0) {
    return callback(0);
  }

  const { tld, domain } = whitelistHandler.parseDomain(hostUrl);
  const host = domain + tld;

  if (
    ctWhitelist &&
    Array.isArray(ctWhitelist) &&
    ctWhitelist.length > 0 &&
    ctWhitelist.indexOf(host) > -1
  ) {
    return callback(0);
  }
  // We let chromium handle the verification result. In case chromium detects a certificate error, then 'certificate-error' event will be triggered.
  return callback(-3);
};

/**
 * Validates the network by fetching the pod url
 * every 10sec, on active reloads the given window
 *
 * @param window {ICustomBrowserWindow}
 * @param url Pod URL to load
 */
export const isSymphonyReachable = (
  window: ICustomBrowserWindow | null,
  url: string,
) => {
  if (networkStatusCheckIntervalId) {
    return;
  }
  if (!window || !windowExists(window)) {
    return;
  }
  networkStatusCheckIntervalId = setInterval(() => {
    const { hostname, protocol } = parse(url);
    if (!hostname || !protocol) {
      return;
    }
    const podUrl = `${protocol}//${hostname}`;
    logger.info(`window-utils: checking to see if pod ${podUrl} is reachable!`);
    fetch(podUrl, { method: 'GET' })
      .then(async (rsp) => {
        if (rsp.status === 200 && windowHandler.isOnline) {
          logger.info(
            `window-utils: pod ${podUrl} is reachable, loading main window!`,
          );
          await windowHandler.reloadSymphony();
          if (networkStatusCheckIntervalId) {
            clearInterval(networkStatusCheckIntervalId);
            networkStatusCheckIntervalId = null;
          }
          return;
        }
        logger.warn(
          `window-utils: POD is down! statusCode: ${rsp.status}, is online: ${windowHandler.isOnline}`,
        );
      })
      .catch((error) => {
        logger.error(
          `window-utils: Network status check: No active network connection ${error}`,
        );
      });
  }, networkStatusCheckInterval);
};

/**
 * Refreshes/Restarts the window based on type
 *
 * @param browserWindow {ICustomBrowserWindow}
 */
export const reloadWindow = (browserWindow: ICustomBrowserWindow) => {
  if (!browserWindow || !windowExists(browserWindow)) {
    return;
  }

  const windowName = browserWindow.winName;
  const mainWebContents = windowHandler.getMainWebContents();
  const main = windowHandler.getMainWindow();
  // reload the main window
  if (
    windowName === apiName.mainWindowName &&
    mainWebContents &&
    !mainWebContents.isDestroyed()
  ) {
    logger.info(`window-utils: reloading the main window`);
    windowHandler.reloadSymphony();

    windowHandler.closeAllWindows();
    main?.setThumbarButtons([]);
    presenceStatus.onSignOut();

    windowHandler.closeScreenSharingIndicator();

    return;
  }

  // Send an event to SFE that restarts the pop-out window
  if (mainWebContents && !mainWebContents.isDestroyed()) {
    logger.info(`window-handler: reloading the window`, { windowName });
    const bounds = browserWindow.getBounds();
    mainWebContents.send('restart-floater', { windowName, bounds });
  }
};

/**
 * Restrict the zoom in in 2.0
 * @returns void
 */
export const zoomIn = () => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (!focusedWindow || !windowExists(focusedWindow)) {
    return;
  }

  if (focusedWindow.getTitle() === 'Screen Sharing Indicator - Symphony') {
    return;
  }

  // Disable Zoom for notification windows
  if (
    (focusedWindow as ICustomBrowserWindow).winName &&
    (focusedWindow as ICustomBrowserWindow).winName ===
      apiName.notificationWindowName
  ) {
    return;
  }

  let { webContents } = focusedWindow;

  // If the focused window is mainWindow we should use mainWebContents
  if (
    (focusedWindow as ICustomBrowserWindow).winName === apiName.mainWindowName
  ) {
    const mainWebContents = windowHandler.getMainWebContents();
    if (mainWebContents && !mainWebContents.isDestroyed()) {
      webContents = mainWebContents;
    }
  }

  if (windowHandler.isMana) {
    const zoomFactor = webContents.getZoomFactor();
    if (zoomFactor < 1.5) {
      if (zoomFactor < 0.7) {
        webContents.setZoomFactor(0.7);
      } else if (zoomFactor >= 0.7 && zoomFactor < 0.8) {
        webContents.setZoomFactor(0.8);
      } else if (zoomFactor >= 0.8 && zoomFactor < 0.9) {
        webContents.setZoomFactor(0.9);
      } else if (zoomFactor >= 0.9 && zoomFactor < 1.0) {
        webContents.setZoomFactor(1.0);
      } else if (zoomFactor >= 1.0 && zoomFactor < 1.1) {
        webContents.setZoomFactor(1.1);
      } else if (zoomFactor >= 1.1 && zoomFactor < 1.25) {
        webContents.setZoomFactor(1.25);
      } else if (zoomFactor >= 1.25 && zoomFactor < 1.5) {
        webContents.setZoomFactor(1.5);
      }
    }
  } else {
    const currentZoomLevel = webContents.getZoomLevel();
    webContents.setZoomLevel(currentZoomLevel + 0.5);
  }
};

/**
 * Restrict the zoom out in 2.0
 * @returns void
 */
export const zoomOut = () => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (!focusedWindow || !windowExists(focusedWindow)) {
    return;
  }

  if (focusedWindow.getTitle() === 'Screen Sharing Indicator - Symphony') {
    return;
  }

  // Disable Zoom for notification windows
  if (
    (focusedWindow as ICustomBrowserWindow).winName &&
    (focusedWindow as ICustomBrowserWindow).winName ===
      apiName.notificationWindowName
  ) {
    return;
  }

  let { webContents } = focusedWindow;

  // If the focused window is mainWindow we should use mainWebContents
  if (
    (focusedWindow as ICustomBrowserWindow).winName === apiName.mainWindowName
  ) {
    const mainWebContents = windowHandler.getMainWebContents();
    if (mainWebContents && !mainWebContents.isDestroyed()) {
      webContents = mainWebContents;
    }
  }

  if (windowHandler.isMana) {
    const zoomFactor = webContents.getZoomFactor();
    if (zoomFactor > 0.7) {
      if (zoomFactor > 1.5) {
        webContents.setZoomFactor(1.5);
      } else if (zoomFactor > 1.25 && zoomFactor <= 1.5) {
        webContents.setZoomFactor(1.25);
      } else if (zoomFactor > 1.1 && zoomFactor <= 1.25) {
        webContents.setZoomFactor(1.1);
      } else if (zoomFactor > 1.0 && zoomFactor <= 1.1) {
        webContents.setZoomFactor(1.0);
      } else if (zoomFactor > 0.9 && zoomFactor <= 1.0) {
        webContents.setZoomFactor(0.9);
      } else if (zoomFactor > 0.8 && zoomFactor <= 0.9) {
        webContents.setZoomFactor(0.8);
      } else if (zoomFactor > 0.7 && zoomFactor <= 0.8) {
        webContents.setZoomFactor(0.7);
      }
    }
  } else {
    const currentZoomLevel = webContents.getZoomLevel();
    webContents.setZoomLevel(currentZoomLevel - 0.5);
  }
};

/**
 * Reset zoom level.
 * @returns void
 */
export const resetZoomLevel = () => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (!focusedWindow || !windowExists(focusedWindow)) {
    return;
  }
  // Disable Zoom for notification windows
  if (
    (focusedWindow as ICustomBrowserWindow).winName &&
    (focusedWindow as ICustomBrowserWindow).winName ===
      apiName.notificationWindowName
  ) {
    return;
  }
  let { webContents } = focusedWindow;
  // If the focused window is mainWindow we should use mainWebContents
  if (
    (focusedWindow as ICustomBrowserWindow).winName === apiName.mainWindowName
  ) {
    const mainWebContents = windowHandler.getMainWebContents();
    if (mainWebContents && !mainWebContents.isDestroyed()) {
      webContents = mainWebContents;
    }
  }
  webContents.setZoomLevel(0);
};

/**
 * Verifies if window exists and restores/focuses the window
 *
 * @param browserWindow {ICustomBrowserWindow}
 */
export const didVerifyAndRestoreWindow = (
  browserWindow: BrowserWindow | null,
): boolean => {
  if (!browserWindow || !windowExists(browserWindow)) {
    return false;
  }
  if (browserWindow.isMinimized()) {
    browserWindow.restore();
  }
  browserWindow.focus();
  return true;
};

/**
 * Finds and returns a specific window by name
 *
 * @param windowName {String}
 */
export const getWindowByName = (
  windowName: string,
): BrowserWindow | undefined => {
  const allWindows = BrowserWindow.getAllWindows();
  return allWindows.find((window) => {
    return (window as ICustomBrowserWindow).winName === windowName;
  });
};

export const updateFeaturesForCloudConfig = async (
  cloudConfig: ICloudConfig,
): Promise<void> => {
  const {
    podLevelEntitlements,
    acpFeatureLevelEntitlements,
    pmpEntitlements,
    ...rest
  } = cloudConfig as ICloudConfig;
  if (
    podLevelEntitlements &&
    podLevelEntitlements.autoLaunchPath &&
    podLevelEntitlements.autoLaunchPath.match(/\\\\/g)
  ) {
    podLevelEntitlements.autoLaunchPath =
      podLevelEntitlements.autoLaunchPath.replace(/\\+/g, '\\');
  }
  if (
    podLevelEntitlements &&
    podLevelEntitlements.userDataPath &&
    podLevelEntitlements.userDataPath.match(/\\\\/g)
  ) {
    podLevelEntitlements.userDataPath =
      podLevelEntitlements.userDataPath.replace(/\\+/g, '\\');
  }

  logger.info(
    'window-utils: filtered SDA cloudConfig',
    config.getMergedConfig(config.cloudConfig as ICloudConfig) as IConfig,
  );
  logger.info(
    'window-utils: filtered SFE cloud config',
    config.getMergedConfig({
      podLevelEntitlements,
      acpFeatureLevelEntitlements,
      pmpEntitlements,
    }) as IConfig,
  );
  const updatedCloudConfigFields = config.compareCloudConfig(
    config.getMergedConfig(config.cloudConfig as ICloudConfig) as IConfig,
    config.getMergedConfig({
      podLevelEntitlements,
      acpFeatureLevelEntitlements,
      pmpEntitlements,
    }) as IConfig,
  );

  logger.info('window-utils: ignored other values from SFE', rest);
  await config.updateCloudConfig({
    podLevelEntitlements,
    acpFeatureLevelEntitlements,
    pmpEntitlements,
  });

  const {
    alwaysOnTop: isAlwaysOnTop,
    launchOnStartup,
    memoryRefresh,
    memoryThreshold,
    isAutoUpdateEnabled,
    autoUpdateCheckInterval,
  } = config.getConfigFields([
    'launchOnStartup',
    'alwaysOnTop',
    'memoryRefresh',
    'memoryThreshold',
    'isAutoUpdateEnabled',
    'autoUpdateCheckInterval',
  ]) as IConfig;

  const mainWebContents = windowHandler.getMainWebContents();

  // Update Always on top feature
  await updateAlwaysOnTop(
    isAlwaysOnTop === CloudConfigDataTypes.ENABLED,
    false,
    false,
  );

  // Update launch on start up
  launchOnStartup === CloudConfigDataTypes.ENABLED
    ? autoLaunchInstance.enableAutoLaunch()
    : autoLaunchInstance.disableAutoLaunch();

  if (mainWebContents && !mainWebContents.isDestroyed()) {
    if (memoryRefresh && memoryRefresh === CloudConfigDataTypes.ENABLED) {
      logger.info(
        `window-utils: updating the memory threshold`,
        memoryThreshold,
      );
      memoryMonitor.setMemoryThreshold(parseInt(memoryThreshold, 10));
      mainWebContents.send('initialize-memory-refresh');
    }
  }

  logger.info(
    `window-utils: Updated cloud config fields`,
    updatedCloudConfigFields,
  );
  if (updatedCloudConfigFields && updatedCloudConfigFields.length) {
    if (mainWebContents && !mainWebContents.isDestroyed()) {
      const shouldRestart = updatedCloudConfigFields.some((field) =>
        ConfigFieldsToRestart.has(field),
      );
      logger.info(
        `window-utils: should restart for updated cloud config field?`,
        shouldRestart,
      );
      if (shouldRestart) {
        mainWebContents.send('display-client-banner', {
          reason: 'cloudConfig',
          action: 'restart',
        });
      }
    }
  }

  // SDA auto updater
  logger.info(`window-utils: initiate auto update?`, isAutoUpdateEnabled);
  if (isAutoUpdateEnabled) {
    if (!autoUpdateIntervalId) {
      // randomised to avoid having all users getting SDA update at the same time
      autoUpdateIntervalId = setInterval(async () => {
        const { lastAutoUpdateCheckDate } = config.getUserConfigFields([
          'lastAutoUpdateCheckDate',
        ]);
        if (!lastAutoUpdateCheckDate || lastAutoUpdateCheckDate === '') {
          logger.info(
            `window-utils: lastAutoUpdateCheckDate is not set in user config file so checking for updates`,
            lastAutoUpdateCheckDate,
            autoUpdateCheckInterval,
          );
          await config.updateUserConfig({
            lastAutoUpdateCheckDate: new Date().toISOString(),
          });
          autoUpdate.checkUpdates(AutoUpdateTrigger.AUTOMATED);
          return;
        }
        logger.info(
          `window-utils: is last check date > auto update check interval?`,
          lastAutoUpdateCheckDate,
          autoUpdateCheckInterval,
        );
        // Compare the current date and user config last auto update checked date
        // and if it is greater that autoUpdateCheckInterval we check for new updates
        if (
          getDifferenceInDays(new Date(), new Date(lastAutoUpdateCheckDate)) >
          Number(autoUpdateCheckInterval)
        ) {
          await config.updateUserConfig({
            lastAutoUpdateCheckDate: new Date().toISOString(),
          });
          autoUpdate.checkUpdates(AutoUpdateTrigger.AUTOMATED);
        }
      }, getRandomTime(MIN_AUTO_UPDATE_CHECK_INTERVAL, MAX_AUTO_UPDATE_CHECK_INTERVAL));
    }
  }
};

/**
 * Monitors network requests and displays red banner on failure
 * @param url: Pod URL to be loaded after network is active again
 */
export const monitorNetworkInterception = (url: string) => {
  if (isNetworkMonitorInitialized) {
    return;
  }
  const { hostname, protocol } = parse(url);

  if (!hostname || !protocol) {
    return;
  }

  const mainWebContents = windowHandler.getMainWebContents();
  const podUrl = `${protocol}//${hostname}/`;
  logger.info('window-utils: monitoring network interception for url', podUrl);

  // Filter applied w.r.t pod url
  const filter = { urls: [podUrl + '*'] };

  if (mainWebContents && !mainWebContents.isDestroyed()) {
    isNetworkMonitorInitialized = true;
    mainWebContents.session.webRequest.onErrorOccurred(
      filter,
      async (details) => {
        if (!mainWebContents || mainWebContents.isDestroyed()) {
          return;
        }
        if (
          !windowHandler.isMana &&
          windowHandler.isWebPageLoading &&
          (details.error === 'net::ERR_INTERNET_DISCONNECTED' ||
            details.error === 'net::ERR_NETWORK_CHANGED' ||
            details.error === 'net::ERR_NAME_NOT_RESOLVED')
        ) {
          logger.error(`window-utils: URL failed to load`, details);
          mainWebContents.send('show-banner', {
            show: true,
            bannerType: 'error',
            url: podUrl,
          });
        }
      },
    );
  }
};

export const loadBrowserViews = async (
  mainWindow: BrowserWindow,
): Promise<WebContents> => {
  mainWindow.setMenuBarVisibility(false);

  const titleBarView = new BrowserView({
    webPreferences: {
      sandbox: IS_SAND_BOXED,
      nodeIntegration: IS_NODE_INTEGRATION_ENABLED,
      preload: path.join(__dirname, '../renderer/_preload-component.js'),
      devTools: isDevEnv,
      disableBlinkFeatures: AUX_CLICK,
    },
  }) as ICustomBrowserView;
  const mainWindowBounds = windowHandler.getMainWindow()?.getBounds();
  const mainView = new BrowserView({
    ...windowHandler.getMainWindowOpts(),
    ...{
      width: mainWindowBounds?.width || DEFAULT_WIDTH,
      height: mainWindowBounds?.height || DEFAULT_HEIGHT,
      x: 0,
      y: TITLE_BAR_HEIGHT,
    },
  }) as ICustomBrowserView;

  mainWindow.addBrowserView(titleBarView);
  mainWindow.addBrowserView(mainView);

  const titleBarWindowUrl = format({
    pathname: require.resolve('../renderer/windows-title-bar.html'),
    protocol: 'file',
    query: {
      componentName: 'windows-title-bar',
      locale: i18n.getLocale(),
    },
    slashes: true,
  });
  titleBarView.webContents.once('did-finish-load', () => {
    if (!titleBarView || titleBarView.webContents.isDestroyed()) {
      return;
    }
    titleBarView?.webContents.send('page-load', {
      isWindowsOS,
      locale: i18n.getLocale(),
      resource: i18n.loadedResources,
      isMainWindow: true,
    });
    mainEvents.subscribeMultipleEvents(
      TITLE_BAR_EVENTS,
      titleBarView.webContents,
    );

    mainWindow?.on('enter-full-screen', () => {
      if (
        !titleBarView ||
        !viewExists(titleBarView) ||
        !mainWindow ||
        !windowExists(mainWindow)
      ) {
        return;
      }
      // Workaround: Need to delay getting the window bounds
      // to get updated window bounds
      setTimeout(() => {
        const [width, height] = mainWindow.getSize();
        mainWindow.removeBrowserView(titleBarView);
        if (!mainView || !viewExists(mainView)) {
          return;
        }
        mainView.setBounds({
          width,
          height,
          x: 0,
          y: 0,
        });
      }, 500);
      mainEvents.publish('enter-full-screen');
    });
    mainWindow?.on('leave-full-screen', () => {
      if (
        !titleBarView ||
        !viewExists(titleBarView) ||
        !mainWindow ||
        !windowExists(mainWindow)
      ) {
        return;
      }
      let width: number;
      let height: number;
      if (mainWindow.isMaximized()) {
        const winBounds: Rectangle = mainWindow.getBounds();
        const currentScreenBounds: Rectangle = screen.getDisplayMatching({
          ...winBounds,
        }).workArea;
        width = currentScreenBounds.width;
        height = currentScreenBounds.height;
      } else {
        [width, height] = mainWindow.getSize();
      }
      mainWindow.addBrowserView(titleBarView);
      const titleBarViewBounds = titleBarView.getBounds();
      titleBarView.setBounds({
        ...titleBarViewBounds,
        ...{
          width,
        },
      });
      const mainViewBounds = mainView.getBounds();
      mainView.setBounds({
        ...mainViewBounds,
        ...{
          y: TITLE_BAR_HEIGHT,
          height: height - TITLE_BAR_HEIGHT,
        },
      });
      // Workaround as electron does not resize devtools automatically
      if (mainView.webContents.isDevToolsOpened()) {
        mainView.webContents.toggleDevTools();
        mainView.webContents.toggleDevTools();
      }
      mainEvents.publish('leave-full-screen');
    });

    mainWindow?.on('maximize', () => {
      if (!mainView || !viewExists(mainView)) {
        return;
      }
      const winBounds: Rectangle = mainWindow.getBounds();
      const currentScreenBounds: Rectangle = screen.getDisplayMatching({
        ...winBounds,
      }).workArea;
      mainView.setBounds({
        width: currentScreenBounds.width,
        height: currentScreenBounds.height - TITLE_BAR_HEIGHT,
        x: 0,
        y: TITLE_BAR_HEIGHT,
      });
      titleBarView.setBounds({
        width: currentScreenBounds.width,
        height: TITLE_BAR_HEIGHT,
        x: 0,
        y: 0,
      });
    });
    mainWindow?.on('unmaximize', () => {
      if (!mainView || !viewExists(mainView)) {
        return;
      }
      const [width, height] = mainWindow.getSize();
      mainView.setBounds({
        width,
        height: height - TITLE_BAR_HEIGHT,
        x: 0,
        y: TITLE_BAR_HEIGHT,
      });
      titleBarView.setBounds({
        width,
        height: TITLE_BAR_HEIGHT,
        x: 0,
        y: 0,
      });
      // Workaround as electron does not resize devtools automatically
      if (mainView.webContents.isDevToolsOpened()) {
        mainView.webContents.toggleDevTools();
        mainView.webContents.toggleDevTools();
      }
    });

    if (mainWindow?.isMaximized()) {
      mainEvents.publish('maximize');
    }
    if (mainWindow?.isFullScreen()) {
      mainEvents.publish('enter-full-screen');
    }
  });
  await titleBarView.webContents.loadURL(titleBarWindowUrl);
  titleBarView.setBounds({
    ...mainWindow.getBounds(),
    ...{ x: 0, y: 0, height: TITLE_BAR_HEIGHT },
  });
  titleBarView.setAutoResize({
    vertical: false,
    horizontal: true,
    width: true,
    height: false,
  });

  mainView.setBounds({
    width: mainWindowBounds?.width || DEFAULT_WIDTH,
    height: (mainWindowBounds?.height || DEFAULT_HEIGHT) - TITLE_BAR_HEIGHT,
    x: 0,
    y: TITLE_BAR_HEIGHT,
  });
  mainView.setAutoResize({
    width: true,
    height: true,
  });

  windowHandler.setMainView(mainView);
  windowHandler.setTitleBarView(titleBarView);

  return mainView.webContents;
};
