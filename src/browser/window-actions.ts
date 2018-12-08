import { BrowserWindow } from 'electron';

import { throttle } from '../common/utils';
import { config } from './config-handler';
import { ICustomBrowserWindow } from './window-handler';

export const saveWindowSettings = (): void => {
    const browserWindow = BrowserWindow.getFocusedWindow() as ICustomBrowserWindow;

    if (browserWindow && !browserWindow.isDestroyed()) {
        const [ x, y ] = browserWindow.getPosition();
        const [ width, height ] = browserWindow.getSize();
        if (x && y && width && height) {
            browserWindow.webContents.send('boundChanges', { x, y, width, height });

            if (browserWindow.winName === 'main') {
                const isMaximized = browserWindow.isMaximized();
                const isFullScreen = browserWindow.isFullScreen();
                config.updateUserConfig({ mainWinPos: { x, y, width, height, isMaximized, isFullScreen } });
            }
        }
    }

};

export const enterFullScreen = () => {
    const browserWindow = BrowserWindow.getFocusedWindow() as ICustomBrowserWindow;
    if (browserWindow && !browserWindow.isDestroyed() && browserWindow.winName === 'main') {
        browserWindow.webContents.send('window-enter-full-screen');
    }
};

export const leaveFullScreen = () => {
    const browserWindow = BrowserWindow.getFocusedWindow() as ICustomBrowserWindow;
    if (browserWindow && !browserWindow.isDestroyed() && browserWindow.winName === 'main') {
        browserWindow.webContents.send('window-leave-full-screen');
    }
};

export const throttledWindowChanges = throttle(saveWindowSettings, 1000);