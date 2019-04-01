import { ipcMain } from 'electron';

import { config } from '../app/config-handler';
import { createComponentWindow, windowExists } from '../app/window-utils';
import { AnimationQueue } from '../common/animation-queue';
import { INotificationData } from '../common/api-interface';
import { logger } from '../common/logger';
import NotificationHandler from './notification-handler';

// const MAX_QUEUE_SIZE = 30;
const CLEAN_UP_INTERVAL = 60 * 1000; // Closes inactive notification
const animationQueue = new AnimationQueue();

interface ICustomBrowserWindow extends Electron.BrowserWindow {
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
    };
    private readonly activeNotifications: Electron.BrowserWindow[] = [];
    private readonly inactiveWindows: Electron.BrowserWindow[] = [];
    private readonly notificationQueue: INotificationData[] = [];
    private readonly notificationCallbacks: any[] = [];
    private cleanUpTimer: NodeJS.Timer;

    constructor(opts) {
        super(opts);
        ipcMain.on('close-notification', (_event, windowId) => {
            this.hideNotification(windowId);
        });

        ipcMain.on('notification-clicked', (_event, windowId) => {
            this.notificationClicked(windowId);
        });
        // Update latest notification settings from config
        this.updateNotificationSettings();
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
        const displayTime = data.displayTime ? data.displayTime : notificationSettings.displayTime;
        let timeoutId;

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
                this.notificationCallbacks[ clientId ]('notification-clicked', data);
            }
            this.hideNotification(clientId);
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
        logger.info('active notification', this.activeNotifications.length);
        logger.info('inactive notification', this.inactiveWindows.length);
        if (this.inactiveWindows.length > 0) {
            logger.info('cleaning up inactive notification windows', { inactiveNotification: this.inactiveWindows.length });
            this.inactiveWindows.forEach((window) => {
                if (windowExists(window)) {
                    window.close();
                }
            });
            logger.info(`Cleaned up inactive notification windows`, { inactiveNotification: this.inactiveWindows.length });
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
            resizable: false,
            show: false,
            frame: false,
            transparent: true,
            acceptFirstMouse: true,
            webPreferences: {
                sandbox: true,
                nodeIntegration: false,
                devTools: true,
            },
        };
    }
}

const notification = new Notification(notificationSettings);

export {
    notification,
};
