import { BrowserWindow } from 'electron';
import { apiName, IBoundsChange, KeyCodes } from '../common/api-interface';
import { isMac, isWindowsOS } from '../common/env';
import { logger } from '../common/logger';
import { throttle } from '../common/utils';
import { config } from './config-handler';
import { ICustomBrowserWindow, windowHandler } from './window-handler';
import { showPopupMenu, windowExists } from './window-utils';

const saveWindowSettings = async (): Promise<void> => {
    const browserWindow = BrowserWindow.getFocusedWindow() as ICustomBrowserWindow;

    if (browserWindow && !browserWindow.isDestroyed()) {
        const [ x, y ] = browserWindow.getPosition();
        const [ width, height ] = browserWindow.getSize();
        if (x && y && width && height) {
            browserWindow.webContents.send('boundsChange', { x, y, width, height, windowName: browserWindow.winName } as IBoundsChange);

            // Update the config file
            if (browserWindow.winName === apiName.mainWindowName) {
                await config.updateUserConfig({ mainWinPos: { x, y, width, height } });
            }
        }
    }

};

const windowMaximized = async (): Promise<void> => {
    const browserWindow = BrowserWindow.getFocusedWindow() as ICustomBrowserWindow;
    if (browserWindow && windowExists(browserWindow) && browserWindow.winName === apiName.mainWindowName) {
        const isMaximized = browserWindow.isMaximized();
        const isFullScreen = browserWindow.isFullScreen();
        if (isFullScreen) {
            browserWindow.webContents.send('window-enter-full-screen');
        }
        const { mainWinPos } = config.getUserConfigFields([ 'mainWinPos' ]);
        await config.updateUserConfig( { mainWinPos: { ...mainWinPos, ...{ isMaximized, isFullScreen } } });
    }
};

const windowUnmaximized = async (): Promise<void> => {
    const browserWindow = BrowserWindow.getFocusedWindow() as ICustomBrowserWindow;
    if (browserWindow && windowExists(browserWindow) && browserWindow.winName === apiName.mainWindowName) {
        const isMaximized = browserWindow.isMaximized();
        const isFullScreen = browserWindow.isFullScreen();
        if (!isFullScreen) {
            browserWindow.webContents.send('window-leave-full-screen');
        }
        const { mainWinPos } = config.getUserConfigFields([ 'mainWinPos' ]);
        await config.updateUserConfig( { mainWinPos: { ...mainWinPos, ...{ isMaximized, isFullScreen } } });
    }
};

const throttledWindowChanges = throttle(saveWindowSettings, 1000);

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
    if (windowHandler.isAutoReload) {
        return;
    }

    const windows = windowHandler.getAllWindows();
    for (const key in windows) {
        if (Object.prototype.hasOwnProperty.call(windows, key)) {
            const window = windows[ key ];
            if (window && !window.isDestroyed() && window.winName === windowName) {

                // Bring the window to the top without focusing
                // Flash task bar icon in Windows for windows
                if (!shouldFocus) {
                    return isMac ? window.showInactive() : window.flashFrame(true);
                }

                // Note: On window just focusing will preserve window snapped state
                // Hiding the window and just calling the focus() won't display the window
                if (isWindowsOS) {
                    return window.isMinimized() ? window.restore() : window.focus();
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
    logger.info(`window-actions: Should we set always on top? ${shouldSetAlwaysOnTop}!`);
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
            logger.info(`window-actions: activated main window!`);
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
            if (isMac) {
                return;
            }
            const browserWin = BrowserWindow.getFocusedWindow();
            if (browserWin && !browserWin.isDestroyed()) {
                showPopupMenu({ window: browserWin });
            }
            break;
        default:
            break;
    }
};

/**
 * Monitors window actions
 *
 * @param window {BrowserWindow}
 */
export const monitorWindowActions = (window: BrowserWindow): void => {
    if (!window || window.isDestroyed()) {
        return;
    }
    const eventNames = [ 'move', 'resize' ];
    eventNames.forEach((event: string) => {
        if (window) {
            // @ts-ignore
            window.on(event, throttledWindowChanges);
        }
    });
    window.on('enter-full-screen', windowMaximized);
    window.on('maximize', windowMaximized);

    window.on('leave-full-screen', windowUnmaximized);
    window.on('unmaximize', windowUnmaximized);
};

/**
 * Removes attached event listeners
 *
 * @param window
 */
export const removeWindowEventListener = (window: BrowserWindow): void => {
    if (!window || window.isDestroyed()) {
        return;
    }
    const eventNames = [ 'move', 'resize' ];
    eventNames.forEach((event: string) => {
        if (window) {
            // @ts-ignore
            window.removeListener(event, throttledWindowChanges);
        }
    });
    window.removeListener('enter-full-screen', windowMaximized);
    window.removeListener('maximize', windowMaximized);

    window.removeListener('leave-full-screen', windowUnmaximized);
    window.removeListener('unmaximize', windowUnmaximized);
};
