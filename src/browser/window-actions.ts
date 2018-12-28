import { BrowserWindow } from 'electron';

import { apiName, IBoundsChange, KeyCodes } from '../common/api-interface';
import { isWindowsOS } from '../common/env';
import { throttle } from '../common/throttle';
import { config } from './config-handler';
import { ICustomBrowserWindow, windowHandler } from './window-handler';
import { showPopupMenu } from './window-utils';

export const saveWindowSettings = (): void => {
    const browserWindow = BrowserWindow.getFocusedWindow() as ICustomBrowserWindow;

    if (browserWindow && !browserWindow.isDestroyed()) {
        const [ x, y ] = browserWindow.getPosition();
        const [ width, height ] = browserWindow.getSize();
        if (x && y && width && height) {
            browserWindow.webContents.send('boundChanges', { x, y, width, height, windowName: browserWindow.winName } as IBoundsChange);

            if (browserWindow.winName === apiName.mainWindowName) {
                const isMaximized = browserWindow.isMaximized();
                const isFullScreen = browserWindow.isFullScreen();
                config.updateUserConfig({ mainWinPos: { x, y, width, height, isMaximized, isFullScreen } });
            }
        }
    }

};

export const enterFullScreen = () => {
    const browserWindow = BrowserWindow.getFocusedWindow() as ICustomBrowserWindow;
    if (browserWindow && !browserWindow.isDestroyed() && browserWindow.winName === apiName.mainWindowName) {
        browserWindow.webContents.send('window-enter-full-screen');
    }
};

export const leaveFullScreen = () => {
    const browserWindow = BrowserWindow.getFocusedWindow() as ICustomBrowserWindow;
    if (browserWindow && !browserWindow.isDestroyed() && browserWindow.winName === apiName.mainWindowName) {
        browserWindow.webContents.send('window-leave-full-screen');
    }
};

export const throttledWindowChanges = throttle(saveWindowSettings, 1000);

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
 * @param shouldSetAlwaysOnTop
 * @param shouldActivateMainWindow
 */
export const updateAlwaysOnTop = (shouldSetAlwaysOnTop: boolean, shouldActivateMainWindow: boolean = true): void => {
    const browserWins: ICustomBrowserWindow[] = BrowserWindow.getAllWindows() as ICustomBrowserWindow[];
    if (browserWins.length > 0) {
        browserWins
            .filter((browser) => typeof browser.notificationObj !== 'object')
            .forEach((browser) => browser.setAlwaysOnTop(shouldSetAlwaysOnTop));

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
 * Method that handles key press
 *
 * @param key {number}
 */
export const handleKeyPress = (key: number): void => {
    switch (key) {
        case KeyCodes.Esc: {
            const focusedWindow = BrowserWindow.getFocusedWindow();

            if (focusedWindow && !focusedWindow.isDestroyed() && focusedWindow.isFullScreen()) {
                focusedWindow.setFullScreen(false);
            }
            break;
        }
        case KeyCodes.Alt:
            const browserWin = BrowserWindow.getFocusedWindow();
            if (browserWin && !browserWin.isDestroyed()) {
                showPopupMenu({ window: browserWin });
            }
            break;
        default:
            break;
    }
};
