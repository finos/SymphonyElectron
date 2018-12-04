import { app, BrowserWindow, nativeImage } from 'electron';
import * as path from 'path';
import * as url from 'url';

import { isMac, isWindowsOS } from '../common/env';
import { i18n, LocaleType } from '../common/i18n';
import { logger } from '../common/logger';
import { ICustomBrowserWindow, windowHandler } from './window-handler';

const checkValidWindow = true;

/**
 * Prevents window from navigating
 *
 * @param browserWindow
 */
export const preventWindowNavigation = (browserWindow: Electron.BrowserWindow): void => {
    const listener = (e: Electron.Event, winUrl: string) => {
        if (browserWindow.isDestroyed()
            || browserWindow.webContents.isDestroyed()
            || winUrl === browserWindow.webContents.getURL()) return;
        e.preventDefault();
    };

    browserWindow.webContents.on('will-navigate', listener);
};

/**
 * Creates components windows
 *
 * @param componentName
 * @param opts
 */
export const createComponentWindow = (
    componentName: string,
    opts?: Electron.BrowserWindowConstructorOptions): BrowserWindow => {

    const parent = windowHandler.getMainWindow() || undefined;
    const options = {
        center: true,
        height: 300,
        maximizable: false,
        minimizable: false,
        parent,
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
        query: { componentName },
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
 * Tries finding a window we have created with given name.  If found, then
 * brings to front and gives focus.
 *
 * @param  {string} windowName   Name of target window. Note: main window has
 * name 'main'.
 * @param {Boolean} shouldFocus  whether to get window to focus or just show
 * without giving focus
 */
export const activate = (windowName: string, shouldFocus: boolean = true): void => {

    // Electron-136: don't activate when the app is reloaded programmatically
    if (windowHandler.isAutoReload) return;

    const windows = windowHandler.getAllWindows();
    for (const key in windows) {
        if (windows.hasOwnProperty(key)) {
            const window = windows[ key ];
            if (window && !window.isDestroyed() && window.winName === windowName) {

                // Bring the window to the top without focusing
                // Flash task bar icon in Windows for windows
                if (!shouldFocus) {
                    window.moveTop();
                    return isWindowsOS ? window.flashFrame(true) : null;
                }

                return window.isMinimized() ? window.restore() : window.show();
            }
        }
    }
};

/**
 * Sets always on top property based on isAlwaysOnTop
 *
 * @param isAlwaysOnTop
 * @param shouldActivateMainWindow
 */
export const updateAlwaysOnTop = (isAlwaysOnTop: boolean, shouldActivateMainWindow: boolean = true): void => {
    const browserWins: ICustomBrowserWindow[] = BrowserWindow.getAllWindows() as ICustomBrowserWindow[];
    if (browserWins.length > 0) {
        browserWins
            .filter((browser) => typeof browser.notificationObj !== 'object')
            .forEach((browser) => browser.setAlwaysOnTop(isAlwaysOnTop));

        // An issue where changing the alwaysOnTop property
        // focus the pop-out window
        // Issue - Electron-209/470
        const mainWindow = windowHandler.getMainWindow();
        if (mainWindow && mainWindow.winName && shouldActivateMainWindow) {
            activate(mainWindow.winName);
        }
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