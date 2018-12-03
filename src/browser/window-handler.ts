import { BrowserWindow, crashReporter } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';

import { isWindowsOS } from '../common/env';
import { getCommandLineArgs, getGuid } from '../common/utils';
import { AppMenu } from './app-menu';
import { config, IConfig } from './config-handler';
import { createComponentWindow } from './window-utils';

const { buildNumber, clientVersion, version } = require('../../package.json'); // tslint:disable-line:no-var-requires

interface ICustomBrowserWindowConstructorOpts extends Electron.BrowserWindowConstructorOptions {
    winKey: string;
}

export interface ICustomBrowserWindow extends Electron.BrowserWindow {
    winName: string;
    notificationObj?: object;
}

export class WindowHandler {

    /**
     * Main window opts
     */
    private static getMainWindowOpts() {
        return {
            alwaysOnTop: false,
            frame: true,
            minHeight: 300,
            minWidth: 400,
            show: false,
            title: 'Symphony',
            webPreferences: {
                nativeWindowOpen: true,
                nodeIntegration: false,
                preload: path.join(__dirname, '../renderer/preload-main'),
                sandbox: false,
            },
            winKey: getGuid(),
        };
    }

    /**
     * Loading window opts
     */
    private static getLoadingWindowOpts() {
        return {
            alwaysOnTop: false,
            center: true,
            frame: false,
            height: 200,
            maximizable: false,
            minimizable: false,
            resizable: false,
            show: false,
            title: 'Symphony',
            width: 400,
        };
    }

    /**
     * Verifies if the url is valid and
     * forcefully appends https if not present
     *
     * @param configURL {string}
     */
    private static validateURL(configURL: string): string {
        const parsedUrl = url.parse(configURL);

        if (!parsedUrl.protocol || parsedUrl.protocol !== 'https') {
            parsedUrl.protocol = 'https:';
            parsedUrl.slashes = true;
        }
        return url.format(parsedUrl);
    }

    private appMenu: AppMenu | null;
    private readonly windowOpts: ICustomBrowserWindowConstructorOpts;
    private readonly globalConfig: IConfig;
    // Window reference
    private readonly windows: object;
    private mainWindow: ICustomBrowserWindow | null;
    private loadingWindow: Electron.BrowserWindow | null;
    private aboutAppWindow: Electron.BrowserWindow | null;
    private moreInfoWindow: Electron.BrowserWindow | null;
    private isAutoReload: boolean;

    constructor(opts?: Electron.BrowserViewConstructorOptions) {
        this.windows = {};
        this.windowOpts = { ...WindowHandler.getMainWindowOpts(), ...opts };
        this.isAutoReload = false;
        this.appMenu = null;
        // Window references
        this.mainWindow = null;
        this.loadingWindow = null;
        this.aboutAppWindow = null;
        this.moreInfoWindow = null;
        this.globalConfig = config.getGlobalConfigFields([ 'url', 'crashReporter' ]);

        try {
            const extra = { podUrl: this.globalConfig.url, process: 'main' };
            crashReporter.start({ ...this.globalConfig.crashReporter, extra });
        } catch (e) {
            throw new Error('failed to init crash report');
        }
    }

    /**
     * Starting point of the app
     */
    public createApplication() {
        this.mainWindow = new BrowserWindow(this.windowOpts) as ICustomBrowserWindow;
        this.mainWindow.winName = 'main';

        const urlFromCmd = getCommandLineArgs(process.argv, '--url=', false);
        this.mainWindow.loadURL(urlFromCmd && urlFromCmd.substr(6) || WindowHandler.validateURL(this.globalConfig.url));
        this.mainWindow.webContents.on('did-finish-load', () => {
            if (this.loadingWindow) {
                this.loadingWindow.destroy();
                this.loadingWindow = null;
            }
            if (!this.mainWindow) return;
            if (isWindowsOS && this.mainWindow && config.getConfigFields([ 'isCustomTitleBar' ])) {
                this.mainWindow.webContents.insertCSS(
                    fs.readFileSync(path.join(__dirname, '..', '/renderer/styles/title-bar.css'), 'utf8').toString(),
                );
                this.mainWindow.webContents.send('initiate-custom-title-bar');
            }
            this.mainWindow.show();
            this.appMenu = new AppMenu();
            this.createAboutAppWindow();
        });
        this.addWindow(this.windowOpts.winKey, this.mainWindow);
        return this.mainWindow;
    }

    /**
     * Gets the main window
     */
    public getMainWindow(): ICustomBrowserWindow | null {
        return this.mainWindow;
    }

    /**
     * Gets all the window that we have created
     *
     * @return {Electron.BrowserWindow}
     *
     */
    public getAllWindows(): object {
        return this.windows;
    }

    /**
     * Gets the application menu
     */
    public getApplicationMenu(): AppMenu | null {
        return this.appMenu;
    }

    /**
     * Sets is auto reload when the application
     * is auto reloaded for optimizing memory
     *
     * @param shouldAutoReload {boolean}
     */
    public setIsAutoReload(shouldAutoReload: boolean) {
        this.isAutoReload = shouldAutoReload;
    }

    /**
     * Gets is auto reload
     *
     * @return isAutoReload {boolean}
     */
    public getIsAutoReload(): boolean {
        return this.isAutoReload;
    }

    /**
     * Checks if the window and a key has a window
     * @param key {string}
     * @param window {Electron.BrowserWindow}
     */
    public hasWindow(key: string, window: Electron.BrowserWindow): boolean {
        const browserWindow = this.windows[key];
        return browserWindow && window === browserWindow;
    }

    /**
     * Displays a loading window until the main
     * application is loaded
     */
    public showLoadingScreen() {
        this.loadingWindow = createComponentWindow('loading-screen', WindowHandler.getLoadingWindowOpts());
        this.loadingWindow.webContents.once('did-finish-load', () => {
            if (this.loadingWindow) {
                this.loadingWindow.webContents.send('data');
            }
        });

        this.loadingWindow.once('closed', () => this.loadingWindow = null);
    }

    /**
     * Creates a about app window
     */
    public createAboutAppWindow() {
        this.aboutAppWindow = createComponentWindow('about-app');
        this.aboutAppWindow.webContents.once('did-finish-load', () => {
            if (this.aboutAppWindow) {
                this.aboutAppWindow.webContents.send('about-app-data', { buildNumber, clientVersion, version });
            }
        });
    }

    /**
     * Creates a more info window
     */
    public createMoreInfoWindow() {
        this.moreInfoWindow = createComponentWindow('more-info-window');
        this.moreInfoWindow.webContents.once('did-finish-load', () => {
            if (this.aboutAppWindow) {
                this.aboutAppWindow.webContents.send('more-info-window');
            }
        });
    }

    /**
     * Stores information of all the window we have created
     * @param key {string}
     * @param browserWindow {Electron.BrowserWindow}
     */
    private addWindow(key: string, browserWindow: Electron.BrowserWindow): void {
        this.windows[key] = browserWindow;
    }
}

const windowHandler = new WindowHandler();

export { windowHandler };