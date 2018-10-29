import { BrowserWindow } from 'electron';
import * as path from 'path';
import * as url from 'url';
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