import { app, BrowserWindow, nativeImage } from 'electron';
import * as path from 'path';
import * as url from 'url';

import { isMac } from '../common/env';
import { logger } from '../common/logger';
import { windowHandler } from './window-handler';

/**
 * Creates components windows
 *
 * @param componentName
 * @param opts
 */
export function createComponentWindow(
    componentName: string,
    opts?: Electron.BrowserWindowConstructorOptions): BrowserWindow {

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
}

/**
 * Prevents window from navigating
 * @param browserWindow
 */
export function preventWindowNavigation(browserWindow: Electron.BrowserWindow) {
    const listener = (e: Electron.Event, winUrl: string) => {
        if (browserWindow.isDestroyed()
            || browserWindow.webContents.isDestroyed()
            || winUrl === browserWindow.webContents.getURL()) return;
        e.preventDefault();
    };

    browserWindow.webContents.on('will-navigate', listener);
}

/**
 * Shows the badge count
 * @param count {number}
 */
export function showBadgeCount(count: number): void {
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
}

/**
 * Sets the data url
 * @param dataUrl
 * @param count
 */
export function setDataUrl(dataUrl: string, count: number): void {
    const mainWindow = windowHandler.getMainWindow();
    if (mainWindow && dataUrl && count) {
        const img = nativeImage.createFromDataURL(dataUrl);
        // for accessibility screen readers
        const desc = 'Symphony has ' + count + ' unread messages';
        mainWindow.setOverlayIcon(img, desc);
    }
}