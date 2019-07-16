import { BrowserWindow, dialog } from 'electron';

import { apiName, IBoundsChange, KeyCodes } from '../common/api-interface';
import { isMac, isWindowsOS } from '../common/env';
import { i18n } from '../common/i18n';
import { logger } from '../common/logger';
import { throttle } from '../common/utils';
import { notification } from '../renderer/notification';
import { config } from './config-handler';
import { ICustomBrowserWindow, windowHandler } from './window-handler';
import { showPopupMenu, windowExists } from './window-utils';

enum Permissions {
    MEDIA = 'media',
    LOCATION = 'geolocation',
    NOTIFICATIONS = 'notifications',
    MIDI_SYSEX = 'midiSysex',
    POINTER_LOCK = 'pointerLock',
    FULL_SCREEN = 'fullscreen',
    OPEN_EXTERNAL = 'openExternal',
}
const PERMISSIONS_NAMESPACE = 'Permissions';

const saveWindowSettings = async (): Promise<void> => {
    const browserWindow = BrowserWindow.getFocusedWindow() as ICustomBrowserWindow;

    if (browserWindow && windowExists(browserWindow)) {
        const [ x, y ] = browserWindow.getPosition();
        const [ width, height ] = browserWindow.getSize();
        if (x && y && width && height) {
            browserWindow.webContents.send('boundsChange', { x, y, width, height, windowName: browserWindow.winName } as IBoundsChange);

            // Update the config file
            if (browserWindow.winName === apiName.mainWindowName) {
                const isMaximized = browserWindow.isMaximized();
                const isFullScreen = browserWindow.isFullScreen();
                browserWindow.webContents.send(isFullScreen ? 'window-enter-full-screen' : 'window-leave-full-screen');
                const { mainWinPos } = config.getUserConfigFields([ 'mainWinPos' ]);
                await config.updateUserConfig({ mainWinPos: { ...mainWinPos, ...{ x, y, width, height, isMaximized, isFullScreen } } });
            }
        }
    }

};

const windowMaximized = async (): Promise<void> => {
    const browserWindow = BrowserWindow.getFocusedWindow() as ICustomBrowserWindow;
    if (browserWindow && windowExists(browserWindow) && browserWindow.winName === apiName.mainWindowName) {
        const isMaximized = browserWindow.isMaximized();
        const isFullScreen = browserWindow.isFullScreen();
        browserWindow.webContents.send(isFullScreen ? 'window-enter-full-screen' : 'window-leave-full-screen');
        const { mainWinPos } = config.getUserConfigFields([ 'mainWinPos' ]);
        await config.updateUserConfig({ mainWinPos: { ...mainWinPos, ...{ isMaximized, isFullScreen } } });
    }
};

const throttledWindowChanges = throttle(async () => {
    await saveWindowSettings();
    await windowMaximized();
    notification.moveNotificationToTop();
}, 1000);

const throttledWindowRestore = throttle(async () => {
    notification.moveNotificationToTop();
}, 1000);

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
            .filter((browser) => typeof browser.notificationData !== 'object')
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
                logger.info(`window-actions: exiting fullscreen by esc key action`);
                focusedWindow.setFullScreen(false);
            }
            break;
        }
        case KeyCodes.Alt:
            if (isMac) {
                return;
            }
            const browserWin = BrowserWindow.getFocusedWindow() as ICustomBrowserWindow;
            if (browserWin && windowExists(browserWin) && browserWin.winName === apiName.mainWindowName) {
                logger.info(`window-actions: popping up menu by alt key action`);
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
    window.on('enter-full-screen', throttledWindowChanges);
    window.on('maximize', throttledWindowChanges);

    window.on('leave-full-screen', throttledWindowChanges);
    window.on('unmaximize', throttledWindowChanges);

    if ((window as ICustomBrowserWindow).winName === apiName.mainWindowName) {
        window.on('restore', throttledWindowRestore);
    }
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
    window.removeListener('enter-full-screen', throttledWindowChanges);
    window.removeListener('maximize', throttledWindowChanges);

    window.removeListener('leave-full-screen', throttledWindowChanges);
    window.removeListener('unmaximize', throttledWindowChanges);
};

/**
 * Verifies the permission and display a
 * dialog if the action is not enabled
 *
 * @param permission {boolean} - config value to a specific permission
 * @param message {string} - custom message displayed to the user
 * @param callback {function}
 */
export const handleSessionPermissions = (permission: boolean, message: string, callback: (permission: boolean) => void): void => {
    logger.info(`window-action: permission is ->`, { type: message, permission });

    if (!permission) {
        const browserWindow = BrowserWindow.getFocusedWindow();
        if (browserWindow && !browserWindow.isDestroyed()) {
            dialog.showMessageBox(browserWindow, { type: 'error', title: `${i18n.t('Permission Denied')()}!`, message });
        }
    }

    return callback(permission);
};

/**
 * Sets permission requests for the window
 *
 * @param webContents {Electron.webContents}
 */
export const handlePermissionRequests = (webContents: Electron.webContents): void => {

    if (!webContents || !webContents.session) {
        return;
    }
    const { session } = webContents;

    const { permissions } = config.getGlobalConfigFields([ 'permissions' ]);
    if (!permissions) {
        logger.error('permissions configuration is invalid, so, everything will be true by default!');
        return;
    }

    session.setPermissionRequestHandler((_webContents, permission, callback) => {
        switch (permission) {
            case Permissions.MEDIA:
                return handleSessionPermissions(permissions.media, i18n.t('Your administrator has disabled sharing your camera, microphone, and speakers. Please contact your admin for help', PERMISSIONS_NAMESPACE)(), callback);
            case Permissions.LOCATION:
                return handleSessionPermissions(permissions.geolocation, i18n.t('Your administrator has disabled sharing your location. Please contact your admin for help', PERMISSIONS_NAMESPACE)(), callback);
            case Permissions.NOTIFICATIONS:
                return handleSessionPermissions(permissions.notifications, i18n.t('Your administrator has disabled notifications. Please contact your admin for help', PERMISSIONS_NAMESPACE)(), callback);
            case Permissions.MIDI_SYSEX:
                return handleSessionPermissions(permissions.midiSysex, i18n.t('Your administrator has disabled MIDI Sysex. Please contact your admin for help', PERMISSIONS_NAMESPACE)(), callback);
            case Permissions.POINTER_LOCK:
                return handleSessionPermissions(permissions.pointerLock, i18n.t('Your administrator has disabled Pointer Lock. Please contact your admin for help', PERMISSIONS_NAMESPACE)(), callback);
            case Permissions.FULL_SCREEN:
                return handleSessionPermissions(permissions.fullscreen, i18n.t('Your administrator has disabled Full Screen. Please contact your admin for help', PERMISSIONS_NAMESPACE)(), callback);
            case Permissions.OPEN_EXTERNAL:
                return handleSessionPermissions(permissions.openExternal, i18n.t('Your administrator has disabled Opening External App. Please contact your admin for help', PERMISSIONS_NAMESPACE)(), callback);
            default:
                return callback(false);
        }
    });
};
