import * as electron from 'electron';
import { app, BrowserWindow, crashReporter, globalShortcut, ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { format, parse } from 'url';

import { buildNumber, clientVersion, version } from '../../package.json';
import { apiName, WindowTypes } from '../common/api-interface';
import { isDevEnv, isMac, isWindowsOS } from '../common/env';
import { i18n } from '../common/i18n';
import { logger } from '../common/logger';
import { getCommandLineArgs, getGuid } from '../common/utils';
import { notification } from '../renderer/notification';
import { AppMenu } from './app-menu';
import { handleChildWindow } from './child-window-handler';
import { config, IConfig } from './config-handler';
import { SpellChecker } from './spell-check-handler';
import { checkIfBuildExpired } from './ttl-handler';
import { handlePermissionRequests, monitorWindowActions } from './window-actions';
import {
    createComponentWindow,
    getBounds,
    handleCertificateProxyVerification,
    handleDownloadManager,
    injectStyles,
    isSymphonyReachable,
    preventWindowNavigation,
    windowExists,
} from './window-utils';
import DesktopCapturerSource = Electron.DesktopCapturerSource;

interface ICustomBrowserWindowConstructorOpts extends Electron.BrowserWindowConstructorOptions {
    winKey: string;
}

export interface ICustomBrowserWindow extends Electron.BrowserWindow {
    winName: string;
    notificationObj?: object;
    origin?: string;
}

// Default window width & height
const DEFAULT_WIDTH: number = 900;
const DEFAULT_HEIGHT: number = 900;

export class WindowHandler {

    /**
     * Verifies if the url is valid and
     * forcefully appends https if not present
     *
     * @param configURL {string}
     */
    private static getValidUrl(configURL: string): string {
        const parsedUrl = parse(configURL);

        if (!parsedUrl.protocol || parsedUrl.protocol !== 'https') {
            parsedUrl.protocol = 'https:';
            parsedUrl.slashes = true;
        }
        return format(parsedUrl);
    }

    public appMenu: AppMenu | null;
    public isAutoReload: boolean;
    public isOnline: boolean;
    public url: string | undefined;
    public willQuitApp: boolean = false;
    public spellchecker: SpellChecker | undefined;

    private readonly contextIsolation: boolean;
    private readonly backgroundThrottling: boolean;
    private readonly windowOpts: ICustomBrowserWindowConstructorOpts;
    private readonly globalConfig: IConfig;
    private readonly config: IConfig;
    // Window reference
    private readonly windows: object;
    private readonly isCustomTitleBar: boolean;

    private loadFailError: string | undefined;
    private mainWindow: ICustomBrowserWindow | null = null;
    private aboutAppWindow: Electron.BrowserWindow | null = null;
    private moreInfoWindow: Electron.BrowserWindow | null = null;
    private screenPickerWindow: Electron.BrowserWindow | null = null;
    private screenSharingIndicatorWindow: Electron.BrowserWindow | null = null;
    private basicAuthWindow: Electron.BrowserWindow | null = null;
    private notificationSettingsWindow: Electron.BrowserWindow | null = null;

    constructor(opts?: Electron.BrowserViewConstructorOptions) {
        // Use these variables only on initial setup
        this.config = config.getConfigFields([ 'isCustomTitleBar', 'mainWinPos', 'minimizeOnClose', 'notificationSettings' ]);
        this.globalConfig = config.getGlobalConfigFields([ 'url', 'contextIsolation', 'customFlags' ]);
        const { url, contextIsolation, customFlags }: IConfig = this.globalConfig;

        this.windows = {};
        this.contextIsolation = contextIsolation || false;
        this.backgroundThrottling = !customFlags.disableThrottling;
        this.contextIsolation = contextIsolation || false;
        this.isCustomTitleBar = isWindowsOS && this.config.isCustomTitleBar;
        this.windowOpts = {
            ...this.getWindowOpts({
                frame: !this.isCustomTitleBar,
                minHeight: 300,
                minWidth: 300,
                title: 'Symphony',
            }, {
                preload: path.join(__dirname, '../renderer/_preload-main.js'),
            }), ...opts,
        };
        this.isAutoReload = false;
        this.isOnline = true;

        this.appMenu = null;

        try {
            const extra = { podUrl: url, process: 'main' };
            const defaultOpts = { uploadToServer: false, companyName: 'Symphony', submitURL: '' };
            crashReporter.start({ ...defaultOpts, extra });
        } catch (e) {
            throw new Error('failed to init crash report');
        }
    }

    /**
     * Starting point of the app
     */
    public createApplication() {

        this.spellchecker = new SpellChecker();
        logger.info(`window-handler: initialized spellchecker module with locale ${this.spellchecker.locale}`);

        // set window opts with additional config
        this.mainWindow = new BrowserWindow({
            ...this.windowOpts, ...getBounds(this.config.mainWinPos, DEFAULT_WIDTH, DEFAULT_HEIGHT),
        }) as ICustomBrowserWindow;
        this.mainWindow.winName = apiName.mainWindowName;
        const { isFullScreen, isMaximized } = this.config.mainWinPos ? this.config.mainWinPos : { isFullScreen: false, isMaximized: false };
        if (isMaximized) {
            this.mainWindow.maximize();
            logger.info(`window-handler: window is maximized!`);
        }
        if (isFullScreen) {
            logger.info(`window-handler: window is in full screen!`);
            this.mainWindow.setFullScreen(true);
        }

        // Event needed to hide native menu bar on Windows 10 as we use custom menu bar
        this.mainWindow.webContents.once('did-start-loading', () => {
            logger.info(`window-handler: main window web contents started loading!`);
            if ((this.config.isCustomTitleBar || isWindowsOS) && this.mainWindow && windowExists(this.mainWindow)) {
                this.mainWindow.setMenuBarVisibility(false);
            }
        });

        // Get url to load from cmd line or from global config file
        const urlFromCmd = getCommandLineArgs(process.argv, '--url=', false);
        this.url = urlFromCmd && urlFromCmd.substr(6) || WindowHandler.getValidUrl(this.globalConfig.url);

        // loads the main window with url from config/cmd line
        this.mainWindow.loadURL(this.url);
        // check for build expiry in case of test builds
        this.checkExpiry(this.mainWindow);
        // need this for postMessage origin
        this.mainWindow.origin = this.globalConfig.url;
        this.mainWindow.webContents.on('did-finish-load', async () => {
            logger.info(`window-handler: main window web contents finished loading!`);
            // early exit if the window has already been destroyed
            if (!this.mainWindow || !windowExists(this.mainWindow)) {
                logger.info(`window-handler: main window web contents destroyed already! exiting`);
                return;
            }
            this.url = this.mainWindow.webContents.getURL();

            // Injects custom title bar and snack bar css into the webContents
            await injectStyles(this.mainWindow, this.isCustomTitleBar);

            this.mainWindow.webContents.send('page-load', {
                isWindowsOS,
                locale: i18n.getLocale(),
                resources: i18n.loadedResources,
                enableCustomTitleBar: this.isCustomTitleBar,
                isMainWindow: true,
            });
            this.appMenu = new AppMenu();
            const { permissions } = config.getGlobalConfigFields([ 'permissions' ]);
            this.mainWindow.webContents.send('is-screen-share-enabled', permissions.media);
        });

        this.mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDesc, validatedURL) => {
            logger.error(`window-handler: Failed to load ${validatedURL}, with an error: ${errorCode}::${errorDesc}`);
            this.loadFailError = errorDesc;
        });

        this.mainWindow.webContents.on('did-stop-loading', async () => {
            if (this.mainWindow && windowExists(this.mainWindow)) {
                const href = await this.mainWindow.webContents.executeJavaScript('document.location.href');
                try {
                    if (href === 'data:text/html,chromewebdata' || href === 'chrome-error://chromewebdata/') {
                        if (this.mainWindow && windowExists(this.mainWindow)) {
                            this.mainWindow.webContents.insertCSS(fs.readFileSync(path.join(__dirname, '..', '/renderer/styles/network-error.css'), 'utf8').toString());
                            this.mainWindow.webContents.send('network-error', { error: this.loadFailError });
                            isSymphonyReachable(this.mainWindow);
                        }
                    }
                } catch (error) {
                    logger.error(`window-handler: Could not read document.location`, error);
                }
            }
        });

        this.mainWindow.webContents.on('crashed', (_event: Event, killed: boolean) => {
            if (killed) {
                logger.info(`window-handler: main window crashed (killed)!`);
                return;
            }
            logger.info(`window-handler: main window crashed!`);
            electron.dialog.showMessageBox({
                type: 'error',
                title: i18n.t('Renderer Process Crashed')(),
                message: i18n.t('Oops! Looks like we have had a crash. Please reload or close this window.')(),
                buttons: [ 'Reload', 'Close' ],
            }, (index: number) => {
                if (!this.mainWindow || !windowExists(this.mainWindow)) {
                    return;
                }
                index === 0 ? this.mainWindow.reload() : this.mainWindow.close();
            });
        });

        // Handle main window close
        this.mainWindow.on('close', (event) => {
            if (!this.mainWindow || !windowExists(this.mainWindow)) {
                return;
            }

            if (this.willQuitApp) {
                logger.info(`window-handler: app is quitting, destroying all windows!`);
                return this.destroyAllWindows();
            }

            const { minimizeOnClose } = config.getConfigFields([ 'minimizeOnClose' ]);
            if (minimizeOnClose) {
                event.preventDefault();
                isMac ? this.mainWindow.hide() : this.mainWindow.minimize();
                return;
            }
            app.quit();
        });

        this.mainWindow.once('closed', () => {
            logger.info(`window-handler: main window closed, destroying all windows!`);
            this.destroyAllWindows();
        });

        // Reloads the Symphony
        ipcMain.on('reload-symphony', () => {
            if (this.mainWindow && windowExists(this.mainWindow)) {
                this.mainWindow.loadURL(this.url || this.globalConfig.url);
            }
        });

        // Certificate verification proxy
        if (!isDevEnv) {
            this.mainWindow.webContents.session.setCertificateVerifyProc(handleCertificateProxyVerification);
        }

        // Register global shortcuts
        this.registerGlobalShortcuts();

        // Validate window navigation
        preventWindowNavigation(this.mainWindow, false);

        // Handle media/other permissions
        handlePermissionRequests(this.mainWindow.webContents);

        // Start monitoring window actions
        monitorWindowActions(this.mainWindow);

        // Download manager
        this.mainWindow.webContents.session.on('will-download', handleDownloadManager);

        // store window ref
        this.addWindow(this.windowOpts.winKey, this.mainWindow);

        // Handle pop-outs window
        handleChildWindow(this.mainWindow.webContents);
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
     * Closes the window from an event emitted by the render processes
     *
     * @param windowType {WindowTypes}
     * @param winKey {string} - Unique ID assigned to the window
     */
    public closeWindow(windowType: WindowTypes, winKey?: string): void {
        logger.info(`window-handler: closing window type ${windowType} with key ${winKey}!`);
        switch (windowType) {
            case 'screen-picker':
                if (this.screenPickerWindow && windowExists(this.screenPickerWindow)) {
                    this.screenPickerWindow.close();
                }
                break;
            case 'screen-sharing-indicator':
                if (winKey) {
                    const browserWindow = this.windows[ winKey ];
                    if (browserWindow && windowExists(browserWindow)) {
                        browserWindow.close();
                    }
                }
                break;
            case 'notification-settings':
                if (this.notificationSettingsWindow && windowExists(this.notificationSettingsWindow)) {
                    this.notificationSettingsWindow.close();
                }
                break;
            default:
                break;
        }
    }

    /**
     * Finds all the child window and closes it
     */
    public async closeAllWindow(): Promise<void> {
        const browserWindows = BrowserWindow.getAllWindows();
        await notification.cleanUp();
        if (browserWindows && browserWindows.length) {
            browserWindows.forEach((win) => {
                const browserWindow = win as ICustomBrowserWindow;
                if (browserWindow && windowExists(browserWindow)) {
                    // Closes only child windows
                    if (browserWindow.winName !== apiName.mainWindowName && browserWindow.winName !== apiName.notificationWindowName) {
                        browserWindow.close();
                    }
                }
            });
        }
    }

    /**
     * Sets is auto reload when the application
     * is auto reloaded for optimizing memory
     *
     * @param shouldAutoReload {boolean}
     */
    public setIsAutoReload(shouldAutoReload: boolean): void {
        this.isAutoReload = shouldAutoReload;
    }

    /**
     * Checks if the window and a key has a window
     *
     * @param key {string}
     * @param window {Electron.BrowserWindow}
     */
    public hasWindow(key: string, window: Electron.BrowserWindow): boolean {
        const browserWindow = this.windows[ key ];
        return browserWindow && window === browserWindow;
    }

    /**
     * Creates a about app window
     */
    public createAboutAppWindow(windowName: string): void {

        // This prevents creating multiple instances of the
        // about window
        if (this.aboutAppWindow && windowExists(this.aboutAppWindow)) {
            if (this.aboutAppWindow.isMinimized()) {
                this.aboutAppWindow.restore();
            }
            this.aboutAppWindow.focus();
            return;
        }

        const allWindows = BrowserWindow.getAllWindows();
        const selectedParentWindow = allWindows.find((window) => {
            return (window as ICustomBrowserWindow).winName === windowName;
        });

        this.aboutAppWindow = createComponentWindow(
            'about-app',
            selectedParentWindow ? { parent: selectedParentWindow } : {},
        );
        this.aboutAppWindow.setVisibleOnAllWorkspaces(true);
        this.aboutAppWindow.webContents.once('did-finish-load', () => {
            if (!this.aboutAppWindow || !windowExists(this.aboutAppWindow)) {
                return;
            }
            this.aboutAppWindow.webContents.send('about-app-data', { buildNumber, clientVersion, version });
        });
    }

    /**
     * Creates a more info window
     */
    public createMoreInfoWindow(): void {
        if (this.moreInfoWindow && windowExists(this.moreInfoWindow)) {
            if (this.moreInfoWindow.isMinimized()) {
                this.moreInfoWindow.restore();
            }
            this.moreInfoWindow.focus();
            return;
        }

        this.moreInfoWindow = createComponentWindow('more-info', { width: 550, height: 500 });
        this.moreInfoWindow.webContents.once('did-finish-load', () => {
            if (!this.moreInfoWindow || !windowExists(this.moreInfoWindow)) {
                return;
            }
            this.moreInfoWindow.webContents.send('more-info-data');
        });
    }

    /**
     * Creates a screen picker window
     *
     * @param window
     * @param sources
     * @param id
     */
    public createScreenPickerWindow(window: Electron.WebContents, sources: DesktopCapturerSource[], id: number): void {

        if (this.screenPickerWindow && windowExists(this.screenPickerWindow)) {
            this.screenPickerWindow.close();
        }

        const opts = this.getWindowOpts({
            alwaysOnTop: true,
            autoHideMenuBar: true,
            frame: false,
            height: isMac ? 519 : 523,
            width: 580,
            show: false,
        }, {
            devTools: false,
        });
        this.screenPickerWindow = createComponentWindow('screen-picker', opts);
        this.screenPickerWindow.webContents.once('did-finish-load', () => {
            if (!this.screenPickerWindow || !windowExists(this.screenPickerWindow)) {
                return;
            }
            this.screenPickerWindow.webContents.send('screen-picker-data', { sources, id });
            this.addWindow(opts.winKey, this.screenPickerWindow);
        });
        ipcMain.once('screen-source-selected', (_event, source) => {
            window.send('start-share' + id, source);
            if (this.screenPickerWindow && windowExists(this.screenPickerWindow)) {
                this.screenPickerWindow.close();
            }
        });
        this.screenPickerWindow.once('closed', () => {
            this.removeWindow(opts.winKey);
            this.screenPickerWindow = null;
        });
    }

    /**
     * Creates a Basic auth window whenever the network
     * requires authentications
     *
     * Invoked by app.on('login')
     *
     * @param window
     * @param hostname
     * @param isMultipleTries
     * @param clearSettings
     * @param callback
     */
    public createBasicAuthWindow(window: ICustomBrowserWindow, hostname: string, isMultipleTries: boolean, clearSettings, callback): void {
        const opts = this.getWindowOpts({
            width: 360,
            height: isMac ? 270 : 295,
            show: false,
            modal: true,
            autoHideMenuBar: true,
            resizable: false,
        }, {
            devTools: false,
        });
        opts.parent = window;
        this.basicAuthWindow = createComponentWindow('basic-auth', opts);
        this.basicAuthWindow.setVisibleOnAllWorkspaces(true);
        this.basicAuthWindow.webContents.once('did-finish-load', () => {
            if (!this.basicAuthWindow || !windowExists(this.basicAuthWindow)) {
                return;
            }
            this.basicAuthWindow.webContents.send('basic-auth-data', { hostname, isValidCredentials: isMultipleTries });
        });
        const closeBasicAuth = (shouldClearSettings = true) => {
            if (shouldClearSettings) {
                clearSettings();
            }
            if (this.basicAuthWindow && windowExists(this.basicAuthWindow)) {
                this.basicAuthWindow.close();
                this.basicAuthWindow = null;
            }
        };

        const login = (_event, arg) => {
            const { username, password } = arg;
            callback(username, password);
            closeBasicAuth(false);
        };

        this.basicAuthWindow.once('close', () => {
            ipcMain.removeListener('basic-auth-closed', closeBasicAuth);
            ipcMain.removeListener('basic-auth-login', login);
        });

        ipcMain.once('basic-auth-closed', closeBasicAuth);
        ipcMain.once('basic-auth-login', login);
    }

    /**
     * Creates and displays notification settings window
     *
     * @param windowName
     */
    public createNotificationSettingsWindow(windowName: string): void {
        const opts = this.getWindowOpts({
            width: 460,
            height: 360,
            show: false,
            modal: true,
            minimizable: false,
            maximizable: false,
            fullscreenable: false,
            autoHideMenuBar: true,
        }, {
            devTools: false,
        });
        // This prevents creating multiple instances of the
        // notification configuration window
        if (this.notificationSettingsWindow && !this.notificationSettingsWindow.isDestroyed()) {
            if (this.notificationSettingsWindow.isMinimized()) {
                this.notificationSettingsWindow.restore();
            }
            this.notificationSettingsWindow.focus();
            return;
        }
        const allWindows = BrowserWindow.getAllWindows();
        const selectedParentWindow = allWindows.find((window) => {
            return (window as ICustomBrowserWindow).winName === windowName;
        });

        if (selectedParentWindow) {
            opts.parent = selectedParentWindow;
        }

        this.notificationSettingsWindow = createComponentWindow('notification-settings', opts);
        this.notificationSettingsWindow.setVisibleOnAllWorkspaces(true);
        this.notificationSettingsWindow.webContents.on('did-finish-load', () => {
            if (this.notificationSettingsWindow && windowExists(this.notificationSettingsWindow)) {
                let screens: Electron.Display[] = [];
                if (app.isReady()) {
                    screens = electron.screen.getAllDisplays();
                }
                const { position, display } = config.getConfigFields([ 'notificationSettings' ]).notificationSettings;
                this.notificationSettingsWindow.webContents.send('notification-settings-data', { screens, position, display });
            }
        });

        this.addWindow(opts.winKey, this.notificationSettingsWindow);

        ipcMain.once('notification-settings-update', async (_event, args) => {
            const { display, position } = args;
            try {
                await config.updateUserConfig({ notificationSettings: { display, position } });
            } catch (e) {
                logger.error(`NotificationSettings: Could not update user config file error`, e);
            }
            if (this.notificationSettingsWindow && windowExists(this.notificationSettingsWindow)) {
                this.notificationSettingsWindow.close();
            }
            // Update latest notification settings from config
            notification.updateNotificationSettings();
        });

        this.notificationSettingsWindow.once('closed', () => {
            this.removeWindow(opts.winKey);
            this.notificationSettingsWindow = null;
        });
    }

    /**
     * Creates a screen sharing indicator whenever uses start
     * sharing the screen
     *
     * @param screenSharingWebContents {Electron.webContents}
     * @param displayId {string} - current display id
     * @param id {number} - postMessage request id
     * @param streamId {string} - MediaStream id
     */
    public createScreenSharingIndicatorWindow(
        screenSharingWebContents: Electron.webContents,
        displayId: string,
        id: number,
        streamId: string,
    ): void {
        const indicatorScreen =
            (displayId && electron.screen.getAllDisplays().filter((d) =>
                displayId.includes(d.id.toString()))[ 0 ]) || electron.screen.getPrimaryDisplay();

        const screenRect = indicatorScreen.workArea;
        // Set stream id as winKey to link stream to the window
        let opts = {
            ...this.getWindowOpts({
                width: 620,
                height: 48,
                show: false,
                modal: true,
                frame: false,
                focusable: false,
                transparent: true,
                autoHideMenuBar: true,
                resizable: false,
                alwaysOnTop: true,
            }, {
                devTools: false,
            }), ...{ winKey: streamId },
        };
        if (opts.width && opts.height) {
            opts = Object.assign({}, opts, {
                x: screenRect.x + Math.round((screenRect.width - opts.width) / 2),
                y: screenRect.y + screenRect.height - opts.height,
            });
        }
        this.screenSharingIndicatorWindow = createComponentWindow('screen-sharing-indicator', opts);
        this.screenSharingIndicatorWindow.setVisibleOnAllWorkspaces(true);
        this.screenSharingIndicatorWindow.webContents.once('did-finish-load', () => {
            if (!this.screenSharingIndicatorWindow || !windowExists(this.screenSharingIndicatorWindow)) {
                return;
            }
            this.screenSharingIndicatorWindow.webContents.send('screen-sharing-indicator-data', { id, streamId });
        });
        const stopScreenSharing = (_event, indicatorId) => {
            if (id === indicatorId) {
                screenSharingWebContents.send('screen-sharing-stopped', id);
            }
        };

        this.addWindow(opts.winKey, this.screenSharingIndicatorWindow);

        this.screenSharingIndicatorWindow.once('close', () => {
            this.removeWindow(streamId);
            ipcMain.removeListener('stop-screen-sharing', stopScreenSharing);
        });

        ipcMain.once('stop-screen-sharing', stopScreenSharing);
    }

    /**
     * Opens an external url in the system's default browser
     *
     * @param urlToOpen
     */
    public openUrlInDefaultBrowser(urlToOpen) {
        if (urlToOpen) {
            electron.shell.openExternal(urlToOpen);
            logger.info(`window-handler: opened url ${urlToOpen} in the default browser!`);
        }
    }

    /**
     * Stores information of all the window we have created
     *
     * @param key {string}
     * @param browserWindow {Electron.BrowserWindow}
     */
    public addWindow(key: string, browserWindow: Electron.BrowserWindow): void {
        this.windows[ key ] = browserWindow;
    }

    /**
     * Removes the window reference
     *
     * @param key {string}
     */
    public removeWindow(key: string): void {
        delete this.windows[ key ];
    }

    /**
     * Registers keyboard shortcuts or devtools
     */
    private registerGlobalShortcuts(): void {
        logger.info(`window-handler: registering global shortcuts!`);
        globalShortcut.register(isMac ? 'Cmd+Alt+I' : 'Ctrl+Shift+I', this.onRegisterDevtools);

        app.on('browser-window-focus', () => {
            globalShortcut.register(isMac ? 'Cmd+Alt+I' : 'Ctrl+Shift+I', this.onRegisterDevtools);
        });

        app.on('browser-window-blur', () => {
            globalShortcut.unregister(isMac ? 'Cmd+Alt+I' : 'Ctrl+Shift+I');
        });
    }

    /**
     * Verifies and toggle devtool based on global config settings
     * else displays a dialog
     */
    private onRegisterDevtools(): void {
        const focusedWindow = BrowserWindow.getFocusedWindow();
        const { devToolsEnabled } = config.getGlobalConfigFields([ 'devToolsEnabled' ]);
        if (!focusedWindow || !windowExists(focusedWindow)) {
            return;
        }
        if (devToolsEnabled) {
            focusedWindow.webContents.toggleDevTools();
            return;
        }
        focusedWindow.webContents.closeDevTools();
        logger.info(`window-handler: dev tools disabled by admin, showing error dialog to user!`);
        electron.dialog.showMessageBox(focusedWindow, {
            type: 'warning',
            buttons: [ 'Ok' ],
            title: i18n.t('Dev Tools disabled')(),
            message: i18n.t('Dev Tools has been disabled! Please contact your system administrator to enable it!')(),
        });
    }

    /**
     * Cleans up reference
     */
    private destroyAllWindows(): void {
        for (const key in this.windows) {
            if (Object.prototype.hasOwnProperty.call(this.windows, key)) {
                const winKey = this.windows[ key ];
                this.removeWindow(winKey);
            }
        }
        this.mainWindow = null;
    }

    /**
     * Check if build is expired and show an error message
     * @param browserWindow Focused window instance
     */
    private checkExpiry(browserWindow: BrowserWindow) {
        logger.info(`window handler: calling ttl handler to check for build expiry!`);
        const buildExpired = checkIfBuildExpired();
        if (!buildExpired) {
            logger.info(`window handler: build not expired, proceeding further!`);
            return;
        }
        logger.info(`window handler: build expired, will inform the user and quit the app!`);
        const response = (resp: number) => {
            if (resp === 0) {
                electron.app.exit();
            }
        };

        const options = {
            type: 'error',
            title: i18n.t('Build expired')(),
            message: i18n.t('Sorry, this is a test build and it has expired. Please contact your administrator to get a production build.')(),
            buttons: [ i18n.t('Quit')() ],
            cancelId: 0,
        };

        electron.dialog.showMessageBox(browserWindow, options, response);
    }

    /**
     * Returns constructor opts for the browser window
     *
     * @param windowOpts {Electron.BrowserWindowConstructorOptions}
     * @param webPreferences {Electron.WebPreferences}
     */
    private getWindowOpts(windowOpts: Electron.BrowserWindowConstructorOptions, webPreferences: Electron.WebPreferences): ICustomBrowserWindowConstructorOpts {
        const defaultPreferencesOpts = {
            ...{
                sandbox: true,
                nodeIntegration: false,
                contextIsolation: this.contextIsolation,
                backgroundThrottling: this.backgroundThrottling,
            }, ...webPreferences,
        };
        const defaultWindowOpts = {
            alwaysOnTop: false,
            webPreferences: defaultPreferencesOpts,
            winKey: getGuid(),
        };

        return { ...defaultWindowOpts, ...windowOpts };
    }
}

const windowHandler = new WindowHandler();

export { windowHandler };
