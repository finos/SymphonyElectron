import { BrowserWindow, crashReporter } from 'electron';
import * as path from 'path';
import * as url from 'url';

import { getCommandLineArgs } from '../common/utils';
import { config, IConfig } from './config-handler';

export class WindowHandler {

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
    private mainWindow: Electron.BrowserWindow | null;
    private loadingWindow: Electron.BrowserWindow | null;

    constructor(opts?: Electron.BrowserViewConstructorOptions) {
        this.windowOpts = { ... WindowHandler.getMainWindowOpts(), ...opts };
        this.mainWindow = null;
        this.loadingWindow = null;
        this.globalConfig = config.getGlobalConfigFields([ 'url', 'crashReporter' ]);

        try {
            const extra = { podUrl: this.globalConfig.url, process: 'main' };
            crashReporter.start({ ...this.globalConfig.crashReporter, ...extra });
        } catch (e) {
            throw new Error('failed to init crash report');
        }
    }

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
        });
        return this.mainWindow;
    }

    public getMainWindow(): Electron.BrowserWindow | null {
        return this.mainWindow;
    }

    /**
     * Displays a loading window until the main
     * application is loaded
     */
    public showLoadingScreen() {
        this.loadingWindow = new BrowserWindow(WindowHandler.getLoadingWindowOpts());
        this.loadingWindow.once('ready-to-show', () => this.loadingWindow ? this.loadingWindow.show() : null);
        this.loadingWindow.loadURL(`file://${path.join(__dirname, '../renderer/loading-screen.html')}`);
        this.loadingWindow.setMenu(null as any);
        this.loadingWindow.once('closed', () => this.loadingWindow = null);
    }
}

const windowHandler = new WindowHandler();

export { windowHandler };