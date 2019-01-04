import * as electron from 'electron';
import { app, BrowserWindow, nativeImage } from 'electron';
import * as filesize from 'filesize';
import * as path from 'path';
import * as url from 'url';

import { isMac } from '../common/env';
import { i18n, LocaleType } from '../common/i18n';
import { logger } from '../common/logger';
import { getGuid } from '../common/utils';
import { screenSnippet } from './screen-snippet-handler';
import { windowHandler } from './window-handler';

const checkValidWindow = true;

/**
 * Prevents window from navigating
 *
 * @param browserWindow
 * @param isPopOutWindow
 */
export const preventWindowNavigation = (browserWindow: Electron.BrowserWindow, isPopOutWindow: boolean = false): void => {
    const listener = (e: Electron.Event, winUrl: string) => {
        if (isPopOutWindow && !winUrl.startsWith('http' || 'https')) {
            e.preventDefault();
            return;
        }

        if (browserWindow.isDestroyed()
            || browserWindow.webContents.isDestroyed()
            || winUrl === browserWindow.webContents.getURL()) return;

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
 */
export const createComponentWindow = (
    componentName: string,
    opts?: Electron.BrowserWindowConstructorOptions,
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
        },
    };

    const browserWindow = new BrowserWindow(options);
    browserWindow.on('ready-to-show', () => browserWindow.show());
    browserWindow.setMenu(null as any);

    const targetUrl = url.format({
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
    if (mainWindow) {
        if (count > 0) {
            // get badge img from renderer process, will return
            // img dataUrl in setDataUrl func.
            mainWindow.webContents.send('create-badge-data-url', { count });
        } else {
            // clear badge count icon
            mainWindow.setOverlayIcon(null, '');
        }
    }
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
    if (appMenu) appMenu.update(locale);
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
        if (appMenu) appMenu.popupMenu({ ...popupOpts, ...opts });
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

        // Terminates the screen snippet process on reload
        if (!isMac) {
            screenSnippet.killChildProcess();
        }
        // TODO: write method to clean up child window
        // Closes all the child windows
        // windowMgr.cleanUpChildWindows();
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
    if (!winPos) return { width: defaultWidth, height: defaultHeight };
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
export const downloadManagerAction = (type, filePath) => {
    if (type === 'open') {
        const openResponse = electron.shell.openExternal(`file:///${filePath}`);
        const focusedWindow = electron.BrowserWindow.getFocusedWindow();
        if (!openResponse && focusedWindow && !focusedWindow.isDestroyed()) {
            electron.dialog.showMessageBox(focusedWindow, {
                message: i18n.t('The file you are trying to open cannot be found in the specified path.')(),
                title: i18n.t('File not Found')(),
                type: 'error',
            });
        }
    } else {
        const showResponse = electron.shell.showItemInFolder(filePath);
        const focusedWindow = electron.BrowserWindow.getFocusedWindow();
        if (!showResponse && focusedWindow && !focusedWindow.isDestroyed()) {
            electron.dialog.showMessageBox(focusedWindow, {
                message: i18n.t('The file you are trying to open cannot be found in the specified path.')(),
                title: i18n.t('File not Found')(),
                type: 'error',
            });
        }
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
