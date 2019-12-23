import { app, ipcMain } from 'electron';

import { config } from '../app/config-handler';
import { createComponentWindow, windowExists } from '../app/window-utils';
import { AnimationQueue } from '../common/animation-queue';
import { apiName, INotificationData, NotificationActions } from '../common/api-interface';
import { isNodeEnv } from '../common/env';
import { logger } from '../common/logger';
import NotificationHandler from './notification-handler';

// const MAX_QUEUE_SIZE = 30;
const CLEAN_UP_INTERVAL = 60 * 1000; // Closes inactive notification
const animationQueue = new AnimationQueue();

interface ICustomBrowserWindow extends Electron.BrowserWindow {
    winName: string;
    notificationData: INotificationData;
    displayTimer: NodeJS.Timer;
    clientId: number;
}

type startCorner = 'upper-right' | 'upper-left' | 'lower-right' | 'lower-left';

const notificationSettings = {
    startCorner: 'upper-right' as startCorner,
    display: '',
    width: 380,
    height: 100,
    totalHeight: 0,
    totalWidth: 0,
    corner: {
        x: 0,
        y: 0,
    },
    firstPos: {
        x: 0,
        y: 0,
    },
    templatePath: '',
    maxVisibleNotifications: 6,
    borderRadius: 5,
    displayTime: 5000,
    animationSteps: 5,
    animationStepMs: 5,
    logging: true,
};

class Notification extends NotificationHandler {

    private readonly funcHandlers = {
        onCleanUpInactiveNotification: () => this.cleanUpInactiveNotification(),
        onCreateNotificationWindow: (data: INotificationData) => this.createNotificationWindow(data),
        onMouseOver: (_event, windowId) => this.onMouseOver(windowId),
        onMouseLeave: (_event, windowId) => this.onMouseLeave(windowId),
    };
    private activeNotifications: Electron.BrowserWindow[] = [];
    private inactiveWindows: Electron.BrowserWindow[] = [];
    private cleanUpTimer: NodeJS.Timer;
    private notificationQueue: INotificationData[] = [];

    private readonly notificationCallbacks: any[] = [];

    constructor(opts) {
        super(opts);
        ipcMain.on('close-notification', (_event, windowId) => {
            // removes the event listeners on the client side
            this.notificationClosed(windowId);
            this.hideNotification(windowId);
        });

        ipcMain.on('notification-clicked', (_event, windowId) => {
            this.notificationClicked(windowId);
        });
        ipcMain.on('notification-mouseenter', this.funcHandlers.onMouseOver);
        ipcMain.on('notification-mouseleave', this.funcHandlers.onMouseLeave);
        // Update latest notification settings from config
        app.on('ready', () => this.updateNotificationSettings());
        this.cleanUpTimer = setInterval(this.funcHandlers.onCleanUpInactiveNotification, CLEAN_UP_INTERVAL);
    }

    /**
     * Displays a new notification
     *
     * @param data
     * @param callback
     */
    public showNotification(data: INotificationData, callback): void {
        clearInterval(this.cleanUpTimer);
        animationQueue.push({
            func: this.funcHandlers.onCreateNotificationWindow,
            args: [ data ],
        });
        this.notificationCallbacks[ data.id ] = callback;
        this.cleanUpTimer = setInterval(this.funcHandlers.onCleanUpInactiveNotification, CLEAN_UP_INTERVAL);
    }

    /**
     * Creates a new notification window
     *
     * @param data
     */
    public async createNotificationWindow(data): Promise<ICustomBrowserWindow | undefined> {

        // TODO: Handle MAX_QUEUE_SIZE
        if (data.tag) {
            for (let i = 0; i < this.notificationQueue.length; i++) {
                if (this.notificationQueue[ i ].tag === data.tag) {
                    this.notificationQueue[ i ] = data;
                    return;
                }
            }

            for (const window of this.activeNotifications) {
                const notificationWin = window as ICustomBrowserWindow;
                if (window && notificationWin.notificationData.tag === data.tag) {
                    this.setNotificationContent(notificationWin, data);
                    return;
                }
            }
        }

        // Checks if number of active notification displayed is greater than or equal to the
        // max displayable notification and queues them
        if (this.activeNotifications.length >= this.settings.maxVisibleNotifications) {
            this.notificationQueue.push(data);
            return;
        }

        // Checks for the cashed window and use them
        if (this.inactiveWindows.length > 0) {
            const inactiveWin = this.inactiveWindows[0] as ICustomBrowserWindow;
            if (windowExists(inactiveWin)) {
                this.inactiveWindows.splice(0, 1);
                this.renderNotification(inactiveWin, data);
                return;
            }
        }

        const notificationWindow = createComponentWindow(
            'notification-comp',
            this.getNotificationOpts(),
            false,
        ) as ICustomBrowserWindow;

        notificationWindow.notificationData = data;
        notificationWindow.winName = apiName.notificationWindowName;
        notificationWindow.once('closed', () => {
            const activeWindowIndex = this.activeNotifications.indexOf(notificationWindow);
            const inactiveWindowIndex = this.inactiveWindows.indexOf(notificationWindow);

            if (activeWindowIndex !== -1) {
                this.activeNotifications.splice(activeWindowIndex, 1);
            }

            if (inactiveWindowIndex !== -1) {
                this.inactiveWindows.splice(inactiveWindowIndex, 1);
            }
        });

        // This is a workaround to fix an issue with electron framework
        // https://github.com/electron/electron/issues/611
        notificationWindow.on('resize', (event) => {
            event.preventDefault();
        });

        return await this.didFinishLoad(notificationWindow, data);
    }

    /**
     * Sets the notification contents
     *
     * @param notificationWindow
     * @param data {INotificationData}
     */
    public setNotificationContent(notificationWindow: ICustomBrowserWindow, data: INotificationData): void {
        notificationWindow.clientId = data.id;
        notificationWindow.notificationData = data;
        const displayTime = data.displayTime ? data.displayTime : notificationSettings.displayTime;
        let timeoutId;

        // Reset the display timer
        if (notificationWindow.displayTimer) {
            clearTimeout(notificationWindow.displayTimer);
        }
        // Move notification to top
        notificationWindow.moveTop();

        if (!data.sticky) {
            timeoutId = setTimeout(async () => {
                await this.hideNotification(notificationWindow.clientId);
            }, displayTime);
            notificationWindow.displayTimer = timeoutId;
        }

        notificationWindow.webContents.send('notification-data', data);
        notificationWindow.showInactive();
    }

    /**
     * Hides the notification window
     *
     * @param clientId
     */
    public async hideNotification(clientId: number): Promise<void> {
        const browserWindow = this.getNotificationWindow(clientId);
        if (browserWindow && windowExists(browserWindow)) {
            // send empty to reset the state
            const pos = this.activeNotifications.indexOf(browserWindow);
            this.activeNotifications.splice(pos, 1);

            if (this.inactiveWindows.length < this.settings.maxVisibleNotifications || 5) {
                this.inactiveWindows.push(browserWindow);
                browserWindow.hide();
            } else {
                browserWindow.close();
            }

            this.moveNotificationDown(pos, this.activeNotifications);

            if (this.notificationQueue.length > 0 && this.activeNotifications.length < this.settings.maxVisibleNotifications) {
                const notificationData = this.notificationQueue[0];
                this.notificationQueue.splice(0, 1);
                animationQueue.push({
                    func: this.funcHandlers.onCreateNotificationWindow,
                    args: [ notificationData ],
                });
            }
        }
        return;
    }

    /**
     * Handles notification click
     *
     * @param clientId {number}
     */
    public notificationClicked(clientId): void {
        const browserWindow = this.getNotificationWindow(clientId);
        if (browserWindow && windowExists(browserWindow) && browserWindow.notificationData) {
            const data = browserWindow.notificationData;
            const callback = this.notificationCallbacks[ clientId ];
            if (typeof callback === 'function') {
                callback(NotificationActions.notificationClicked, data);
            }
            this.hideNotification(clientId);
        }
    }

    /**
     * Handles notification close which updates client
     * to remove event listeners
     *
     * @param clientId {number}
     */
    public notificationClosed(clientId): void {
        const browserWindow = this.getNotificationWindow(clientId);
        if (browserWindow && windowExists(browserWindow) && browserWindow.notificationData) {
            const data = browserWindow.notificationData;
            const callback = this.notificationCallbacks[ clientId ];
            if (typeof callback === 'function') {
                callback(NotificationActions.notificationClosed, data);
            }
        }
    }

    /**
     * Returns the notification based on the client id
     *
     * @param clientId {number}
     */
    public getNotificationWindow(clientId: number): ICustomBrowserWindow | undefined {
        const index: number = this.activeNotifications.findIndex((win) => {
            const notificationWindow = win as ICustomBrowserWindow;
            return notificationWindow.clientId === clientId;
        });
        if (index === -1) {
            return;
        }
        return this.activeNotifications[ index ] as ICustomBrowserWindow;
    }

    /**
     * Update latest notification settings from config
     */
    public updateNotificationSettings(): void {
        const { display, position } = config.getConfigFields([ 'notificationSettings' ]).notificationSettings;
        this.settings.displayId = display;
        this.settings.startCorner = position as startCorner;

        // recalculate notification position
        this.setupNotificationPosition();
        this.moveNotificationDown(0, this.activeNotifications);
    }

    /**
     * Closes all the notification windows and resets some configurations
     */
    public async cleanUp(): Promise<void> {
        animationQueue.clear();
        this.notificationQueue = [];
        const activeNotificationWindows = Object.assign([], this.activeNotifications);
        const inactiveNotificationWindows = Object.assign([], this.inactiveWindows);
        for (const activeWindow of activeNotificationWindows) {
            if (activeWindow && windowExists(activeWindow)) {
                await this.hideNotification((activeWindow as ICustomBrowserWindow).clientId);
            }
        }
        for (const inactiveWindow of inactiveNotificationWindows) {
            if (inactiveWindow && windowExists(inactiveWindow)) {
                inactiveWindow.close();
            }
        }

        this.activeNotifications = [];
        this.inactiveWindows = [];
    }

    /**
     * Brings all the notification to the top
     * issue: ELECTRON-1382
     */
    public moveNotificationToTop(): void {
        const notificationWindows = this.activeNotifications as ICustomBrowserWindow[];
        notificationWindows
            .filter((browserWindow) => typeof browserWindow.notificationData === 'object' && browserWindow.isVisible())
            .forEach((browserWindow) => {
                if (browserWindow && windowExists(browserWindow) && browserWindow.isVisible()) {
                    browserWindow.moveTop();
                }
            });
    }

    /**
     * Waits for window to load and resolves
     *
     * @param window
     * @param data
     */
    private didFinishLoad(window, data) {
        return new Promise<ICustomBrowserWindow>((resolve) => {
            window.webContents.once('did-finish-load', () => {
                if (windowExists(window)) {
                    this.renderNotification(window, data);
                }
                return resolve(window);
            });
        });
    }

    /**
     * Calculates all the required attributes and displays the notification
     *
     * @param notificationWindow {BrowserWindow}
     * @param data {INotificationData}
     */
    private renderNotification(notificationWindow, data): void {
        this.calcNextInsertPos(this.activeNotifications.length);
        this.setWindowPosition(notificationWindow, this.nextInsertPos.x, this.nextInsertPos.y);
        this.setNotificationContent(notificationWindow, { ...data, windowId: notificationWindow.id });
        this.activeNotifications.push(notificationWindow);
    }

    /**
     * Closes the active notification after certain period
     */
    private cleanUpInactiveNotification() {
        if (this.inactiveWindows.length > 0) {
            logger.info('notification: cleaning up inactive notification windows', {inactiveNotification: this.inactiveWindows.length});
            this.inactiveWindows.forEach((window) => {
                if (windowExists(window)) {
                    window.close();
                }
            });
            logger.info(`notification: cleaned up inactive notification windows`, {inactiveNotification: this.inactiveWindows.length});
        }
    }

    /**
     * Clears the timer for a specific notification window
     *
     * @param windowId {number} - Id associated with the window
     */
    private onMouseOver(windowId: number): void {
        const notificationWindow = this.getNotificationWindow(windowId);
        if (!notificationWindow || !windowExists(notificationWindow)) {
            return;
        }
        clearTimeout(notificationWindow.displayTimer);
    }

    /**
     * Start a new timer to close the notification
     *
     * @param windowId
     */
    private onMouseLeave(windowId: number): void {
        const notificationWindow = this.getNotificationWindow(windowId);
        if (!notificationWindow || !windowExists(notificationWindow)) {
            return;
        }

        if (notificationWindow.notificationData && notificationWindow.notificationData.sticky) {
            return;
        }

        const displayTime = (notificationWindow.notificationData && notificationWindow.notificationData.displayTime)
            ? notificationWindow.notificationData.displayTime
            : notificationSettings.displayTime;
        if (notificationWindow && windowExists(notificationWindow)) {
            notificationWindow.displayTimer = setTimeout(async () => {
                await this.hideNotification(notificationWindow.clientId);
            }, displayTime);
        }
    }

    /**
     * notification window opts
     */
    private getNotificationOpts(): Electron.BrowserWindowConstructorOptions {
        return {
            width: 380,
            height: 100,
            alwaysOnTop: true,
            skipTaskbar: true,
            resizable: true,
            show: false,
            frame: false,
            transparent: true,
            acceptFirstMouse: true,
            title: 'Notification - Symphony',
            webPreferences: {
                sandbox: !isNodeEnv,
                nodeIntegration: isNodeEnv,
                devTools: true,
            },
        };
    }
}

const notification = new Notification(notificationSettings);

export {
    notification,
};
