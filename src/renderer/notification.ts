import { BrowserWindow, ipcMain } from 'electron';

import { createComponentWindow } from '../app/window-utils';
import { getGuid } from '../common/utils';
import NotificationHandler from './notification-handler';

// const MAX_QUEUE_SIZE = 30;

interface ICustomBrowserWindow extends Electron.BrowserWindow {
    notificationData: INotificationData;
    displayTimer: NodeJS.Timer;
    winKey: string;
}

interface INotificationData {
    title: string;
    text: string;
    image: string;
    flash: boolean;
    color: string;
    tag: string;
    sticky: boolean;
    company: string;
    displayTime: number;
}

type startCorner = 'upper-right' | 'upper-left' | 'lower-right' | 'lower-left';
const notificationSettings = {
    startCorner: 'upper-right' as startCorner,
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
    animateInParallel: true,
    pathToModule: '',
    logging: true,
};

class Notification extends NotificationHandler {

    private readonly activeNotifications: Electron.BrowserWindow[] = [];
    private readonly inactiveWindows: Electron.BrowserWindow[] = [];
    private readonly notificationQueue: INotificationData[] = [];

    constructor(opts) {
        super(opts);
        ipcMain.on('close-notification', (_event, windowId) => {
            this.hideNotification(windowId);
        });
    }

    /**
     * Displays a new notification
     *
     * @param data
     */
    public showNotification(data: INotificationData): void {
        this.createNotificationWindow(data);
    }

    /**
     * Creates a new notification window
     *
     * @param data
     */
    public createNotificationWindow(data): ICustomBrowserWindow | undefined {

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

        if (this.activeNotifications.length > this.settings.maxVisibleNotifications) {
            this.notificationQueue.push(data);
            return;
        }

        const notificationWindow = createComponentWindow(
            'notification-comp',
            this.getNotificationOpts(),
            false,
        ) as ICustomBrowserWindow;

        notificationWindow.notificationData = data;
        notificationWindow.winKey = getGuid();
        notificationWindow.webContents.on('did-finish-load', () => {
            this.calcNextInsertPos(this.activeNotifications.length);
            this.setWindowPosition(notificationWindow, this.nextInsertPos.x, this.nextInsertPos.y);
            this.setNotificationContent(notificationWindow, {...data, windowId: notificationWindow.id});
            this.activeNotifications.push(notificationWindow);
        });

        return notificationWindow;
    }

    /**
     * Sets the notification contents
     *
     * @param notificationWindow
     * @param data {INotificationData}
     */
    public setNotificationContent(notificationWindow: ICustomBrowserWindow, data: INotificationData): void {
        const displayTime = data.displayTime ? data.displayTime : notificationSettings.displayTime;
        let timeoutId;

        if (!data.sticky) {
            timeoutId = setTimeout(() => {
                this.hideNotification(notificationWindow.id);
            }, displayTime);
            notificationWindow.displayTimer = timeoutId;
        }

        notificationWindow.webContents.send('notification-data', data);
        notificationWindow.showInactive();
    }

    /**
     * Hides the notification window
     *
     * @param windowId
     */
    public hideNotification(windowId: number): void {
        const browserWindow = BrowserWindow.fromId(windowId);
        if (browserWindow && typeof !browserWindow.isDestroyed()) {
            // send empty to reset the state
            // browserWindow.webContents.send('notification-data', {});
            const pos = this.activeNotifications.indexOf(browserWindow);
            this.activeNotifications.splice(pos, 1);
            this.inactiveWindows.push(browserWindow);
            browserWindow.hide();
            this.moveNotificationDown(pos, this.activeNotifications);

            if (this.notificationQueue.length > 0 && this.activeNotifications.length < this.settings.maxVisibleNotifications) {
                const notificationData = this.notificationQueue[0];
                this.notificationQueue.splice(0, 1);
                this.createNotificationWindow(notificationData);
            }
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
