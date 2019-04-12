import * as electron from 'electron';
import { app, BrowserWindow, CertificateVerifyProcRequest, nativeImage } from 'electron';
import fetch from 'electron-fetch';
import * as filesize from 'filesize';
import * as fs from 'fs';
import * as path from 'path';
import { format, parse } from 'url';

import { isDevEnv, isMac } from '../common/env';
import { i18n, LocaleType } from '../common/i18n';
import { logger } from '../common/logger';
import { getGuid } from '../common/utils';
import { whitelistHandler } from '../common/whitelist-handler';
import { config } from './config-handler';
import { screenSnippet } from './screen-snippet-handler';
import { ICustomBrowserWindow, windowHandler } from './window-handler';

interface IStyles {
    name: styleNames;
    content: string;
}

enum styleNames {
    titleBar = 'title-bar',
    snackBar = 'snack-bar',
}

const checkValidWindow = true;
const { url: configUrl, ctWhitelist } = config.getGlobalConfigFields([ 'url', 'ctWhitelist' ]);

// Network status check variables
const networkStatusCheckInterval = 10 * 1000;
let networkStatusCheckIntervalId;

const styles: IStyles[] = [];

/**
 * Checks if window is valid and exists
 *
 * @param window {BrowserWindow}
 * @return boolean
 */
export const windowExists = (window: BrowserWindow): boolean => !!window && typeof window.isDestroyed === 'function' && !window.isDestroyed();

/**
 * Prevents window from navigating
 *
 * @param browserWindow
 * @param isPopOutWindow
 */
export const preventWindowNavigation = (browserWindow: BrowserWindow, isPopOutWindow: boolean = false): void => {
    if (!browserWindow || !windowExists(browserWindow)) {
        return;
    }

    const listener = (e: Electron.Event, winUrl: string) => {
        if (!winUrl.startsWith('http' || 'https')) {
            e.preventDefault();
            return;
        }

        if (!isPopOutWindow) {
            const isValid = whitelistHandler.isWhitelisted(winUrl);
            if (!isValid) {
                e.preventDefault();
                if (browserWindow && windowExists(browserWindow)) {
                    // @ts-ignore
                    electron.dialog.showMessageBox(browserWindow, {
                        type: 'warning',
                        buttons: [ 'OK' ],
                        title: i18n.t('Not Allowed'),
                        message: `${i18n.t(`Sorry, you are not allowed to access this website`)} (${winUrl}), ${i18n.t('please contact your administrator for more details')}`,
                    });
                }
            }
        }

        if (browserWindow.isDestroyed()
            || browserWindow.webContents.isDestroyed()
            || winUrl === browserWindow.webContents.getURL()) {
            return;
        }

        e.preventDefault();
    };

    browserWindow.webContents.on('will-navigate', listener);

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
            preload: path.join(__dirname, '../renderer/preload-component'),
            devTools: false,
        },
    };

    const browserWindow: ICustomBrowserWindow = new BrowserWindow(options) as ICustomBrowserWindow;
    if (shouldFocus) {
        browserWindow.once('ready-to-show', () => browserWindow.show());
    }
    browserWindow.webContents.once('did-finish-load', () => {
        if (!browserWindow || browserWindow.isDestroyed()) {
            return;
        }
        browserWindow.webContents.send('set-locale-resource', { locale: i18n.getLocale(), resource: i18n.loadedResources });
    });
    browserWindow.setMenu(null as any);

    const targetUrl = format({
        pathname: require.resolve('../renderer/react-window.html'),
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
        logger.warn(`badgeCount: invalid func arg, must be a number: ${count}`);
        return;
    }

    if (isMac) {
        // too big of a number here and setBadgeCount crashes
        app.setBadgeCount(Math.min(1e8, count));
        return;
    }

    // handle ms windows...
    const mainWindow = windowHandler.getMainWindow();
    if (!mainWindow || !windowExists(mainWindow)) {
        return;
    }

    // get badge img from renderer process, will return
    // img dataUrl in setDataUrl func.
    if (count > 0) {
        mainWindow.webContents.send('create-badge-data-url', { count });
        return;
    }

    // clear badge count icon
    mainWindow.setOverlayIcon(null, '');
};

/**
 * Sets the data url
 *
 * @param dataUrl
 * @param count
 */
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
export const isValidWindow = (browserWin: Electron.BrowserWindow): boolean => {
    if (!checkValidWindow) {
        return true;
    }
    let result: boolean = false;
    if (browserWin && !browserWin.isDestroyed()) {
        // @ts-ignore
        const winKey = browserWin.webContents.browserWindowOptions && browserWin.webContents.browserWindowOptions.winKey;
        result = windowHandler.hasWindow(winKey, browserWin);
    }

    if (!result) {
        logger.warn('invalid window try to perform action, ignoring action');
    }

    return result;
};

/**
 * Updates the locale and rebuilds the entire application menu
 *
 * @param locale {LocaleType}
 */
export const updateLocale = (locale: LocaleType): void => {
    // sets the new locale
    i18n.setLocale(locale);
    const appMenu = windowHandler.appMenu;
    if (appMenu) {
        appMenu.update(locale);
    }
};

/**
 * Displays a popup menu
 */
export const showPopupMenu = (opts: Electron.PopupOptions): void => {
    const mainWindow = windowHandler.getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed() && isValidWindow(mainWindow)) {
        const { x, y } = mainWindow.isFullScreen() ? { x: 0, y: 0 } : { x: 10, y: -20 };
        const popupOpts = { window: mainWindow, x, y };
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
export const sanitize = async (windowName: string): Promise<void> => {
    // To make sure the reload event is from the main window
    const mainWindow = windowHandler.getMainWindow();
    if (mainWindow && windowName === mainWindow.winName) {
        // reset the badge count whenever an user refreshes the electron client
        showBadgeCount(0);

        // Terminates the screen snippet process on reload
        if (!isMac) {
            screenSnippet.killChildProcess();
        }
        // Closes all the child windows
        await windowHandler.closeAllWindow();
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
export const getBounds = (winPos: Electron.Rectangle, defaultWidth: number, defaultHeight: number): Partial<Electron.Rectangle> => {
    if (!winPos) {
        return { width: defaultWidth, height: defaultHeight };
    }
    const displays = electron.screen.getAllDisplays();

    for (let i = 0, len = displays.length; i < len; i++) {
        const workArea = displays[ i ].workArea;
        if (winPos.x >= workArea.x && winPos.y >= workArea.y &&
            ((winPos.x + winPos.width) <= (workArea.x + workArea.width)) &&
            ((winPos.y + winPos.height) <= (workArea.y + workArea.height))) {
            return winPos;
        }
    }
    return { width: defaultWidth, height: defaultHeight };
};

/**
 * Open downloaded file
 * @param type
 * @param filePath
 */
export const downloadManagerAction = (type, filePath): void => {
    const focusedWindow = electron.BrowserWindow.getFocusedWindow();

    if (!focusedWindow || !windowExists(focusedWindow)) {
        return;
    }

    if (type === 'open') {
        const openResponse = electron.shell.openExternal(`file:///${filePath}`);
        if (!openResponse && focusedWindow && !focusedWindow.isDestroyed()) {
            electron.dialog.showMessageBox(focusedWindow, {
                message: i18n.t('The file you are trying to open cannot be found in the specified path.')(),
                title: i18n.t('File not Found')(),
                type: 'error',
            });
        }
        return;
    }

    const showResponse = electron.shell.showItemInFolder(filePath);
    if (!showResponse) {
        electron.dialog.showMessageBox(focusedWindow, {
            message: i18n.t('The file you are trying to open cannot be found in the specified path.')(),
            title: i18n.t('File not Found')(),
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
 * @param webContents {Electron.WebContents}
 */
export const handleDownloadManager = (_event, item: Electron.DownloadItem, webContents: Electron.WebContents) => {
    // Send file path when download is complete
    item.once('done', (_e, state) => {
        if (state === 'completed') {
            const data = {
                _id: getGuid(),
                savedPath: item.getSavePath() || '',
                total: filesize(item.getTotalBytes() || 0),
                fileName: item.getFilename() || 'No name',
            };
            webContents.send('downloadCompleted', data);
        }
    });
};

/**
 * Inserts css in to the window
 *
 * @param window {BrowserWindow}
 */
const readAndInsertCSS = async (window): Promise<IStyles[] | void> => {
    if (window && windowExists(window)) {
        return styles.map(({ content }) => window.webContents.insertCSS(content));
    }
};

/**
 * Inserts all the required css on to the specified windows
 *
 * @param mainWindow {BrowserWindow}
 * @param isCustomTitleBar {boolean} - whether custom title bar enabled
 */
export const injectStyles = async (mainWindow: BrowserWindow, isCustomTitleBar: boolean): Promise<IStyles[] | void> => {
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
                styles.push({ name: styleNames.titleBar, content: fs.readFileSync(titleBarStylesPath, 'utf8').toString() });
            } else {
                const stylePath = path.join(__dirname, '..', '/renderer/styles/title-bar.css');
                styles.push({ name: styleNames.titleBar, content: fs.readFileSync(stylePath, 'utf8').toString() });
            }
        }
    }
    // Snack bar styles
    if (styles.findIndex(({ name }) => name === styleNames.snackBar) === -1) {
        styles.push({
            name: styleNames.snackBar,
            content: fs.readFileSync(path.join(__dirname, '..', '/renderer/styles/snack-bar.css'), 'utf8').toString(),
        });
    }

    return await readAndInsertCSS(mainWindow);
};

/**
 * Proxy verification for root certificates
 *
 * @param request {CertificateVerifyProcRequest}
 * @param callback {(verificationResult: number) => void}
 */
export const handleCertificateProxyVerification = (
    request: CertificateVerifyProcRequest,
    callback: (verificationResult: number) => void,
): void => {
    const { hostname: hostUrl, errorCode } = request;

    if (errorCode === 0) {
        return callback(0);
    }

    const { tld, domain } = whitelistHandler.parseDomain(hostUrl);
    const host = domain + tld;

    if (ctWhitelist && Array.isArray(ctWhitelist) && ctWhitelist.length > 0 && ctWhitelist.indexOf(host) > -1) {
        return callback(0);
    }

    return callback(-2);
};

/**
 * Validates the network by fetching the pod url
 * every 10sec, on active reloads the given window
 *
 * @param window {ICustomBrowserWindow}
 */
export const isSymphonyReachable = (window: ICustomBrowserWindow | null) => {
    if (networkStatusCheckIntervalId) {
        return;
    }
    if (!window || !windowExists(window)) {
        return;
    }
    networkStatusCheckIntervalId = setInterval(() => {
        const { hostname, protocol } = parse(configUrl);
        if (!hostname || !protocol) {
            return;
        }
        const podUrl = `${protocol}//${hostname}`;
        fetch(podUrl, { method: 'GET' }).then((rsp) => {
            if (rsp.status === 200 && windowHandler.isOnline) {
                window.loadURL(podUrl);
                if (networkStatusCheckIntervalId) {
                    clearInterval(networkStatusCheckIntervalId);
                    networkStatusCheckIntervalId = null;
                }
                return;
            }
            logger.warn(`Symphony down! statusCode: ${rsp.status} is online: ${windowHandler.isOnline}`);
        }).catch((error) => {
            logger.error(`Network status check: No active network connection ${error}`);
        });
    }, networkStatusCheckInterval);
};
