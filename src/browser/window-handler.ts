import { BrowserWindow, crashReporter } from 'electron';
import * as path from 'path';
import * as url from 'url';

import { getCommandLineArgs } from '../common/utils';
import { config, IConfig } from './config-handler';
import { createComponentWindow } from './window-utils';

const { buildNumber, clientVersion, version } = require('../../package.json');// tslint:disable-line:no-var-requires

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
                preload: path.join(__dirname, '../renderer/preload'),
                sandbox: false,
            },
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

    private readonly windowOpts: Electron.BrowserWindowConstructorOptions;
    private readonly globalConfig: IConfig;
    // Window reference
    private mainWindow: Electron.BrowserWindow | null;
    private loadingWindow: Electron.BrowserWindow | null;
    private aboutAppWindow: Electron.BrowserWindow | null;

    constructor(opts?: Electron.BrowserViewConstructorOptions) {
        this.windowOpts = { ... WindowHandler.getMainWindowOpts(), ...opts };
        this.mainWindow = null;
        this.loadingWindow = null;
        this.aboutAppWindow = null;
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
        this.mainWindow = new BrowserWindow(this.windowOpts);

        const urlFromCmd = getCommandLineArgs(process.argv, '--url=', false);
        this.mainWindow.loadURL(urlFromCmd && urlFromCmd.substr(6) || WindowHandler.validateURL(this.globalConfig.url));
        this.mainWindow.webContents.on('did-finish-load', () => {
            if (this.loadingWindow) {
                this.loadingWindow.destroy();
                this.loadingWindow = null;
            }
            if (this.mainWindow) this.mainWindow.show();
            this.createAboutAppWindow();
        });
        return this.mainWindow;
    }

    /**
     * Gets the main window
     */
    public getMainWindow(): Electron.BrowserWindow | null {
        return this.mainWindow;
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
     * creates a about app window
     */
    public createAboutAppWindow() {
        this.aboutAppWindow = createComponentWindow('about-app');
            this.aboutAppWindow.webContents.once('did-finish-load', () => {
                if (this.aboutAppWindow) {
                    this.aboutAppWindow.webContents.send('data', { buildNumber, clientVersion, version });
                }
            });
    }
}

const windowHandler = new WindowHandler();

export { windowHandler };