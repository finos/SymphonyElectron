import * as asyncMap from 'async.map';
import { app } from 'electron';
import * as electron from 'electron';

import { windowExists } from '../app/window-utils';
import { isLinux, isMac } from '../common/env';

interface ISettings {
    startCorner: startCorner;
    displayId: string;
    height: number;
    width: number;
    totalHeight: number;
    totalWidth: number;
    corner: ICorner;
    firstPos: ICorner;
    maxVisibleNotifications: number;
    animationSteps: number;
    animationStepMs: number;
}

interface ICorner {
    x: number;
    y: number;
}

type startCorner = 'upper-right' | 'upper-left' | 'lower-right' | 'lower-left';

export default class NotificationHandler {
    public settings: ISettings;
    public nextInsertPos: ICorner = { x:  0, y: 0 };

    private readonly eventHandlers = {
        onSetup: () => this.setupNotificationPosition(),
    };

    private externalDisplay: Electron.Display | undefined;

    constructor(opts) {
        this.settings = opts as ISettings;
        this.setupNotificationPosition();

        app.once('ready', () => {
            electron.screen.on('display-added', this.eventHandlers.onSetup);
            electron.screen.on('display-removed', this.eventHandlers.onSetup);
            electron.screen.on('display-metrics-changed', this.eventHandlers.onSetup);
        });
    }

    /**
     * Sets the position of the notification window
     *
     * @param window {BrowserWindow}
     * @param x {number}
     * @param y {number}
     */
    public setWindowPosition(window: Electron.BrowserWindow, x: number = 0, y: number = 0) {
        if (window && !window.isDestroyed()) {
            window.setPosition(parseInt(String(x), 10), parseInt(String(y), 10));
        }
    }

    /**
     * Initializes / resets the notification positional values
     */
    public setupNotificationPosition() {
        // This feature only applies to windows
        if (isMac || isLinux || !app.isReady()) {
            return;
        }

        const screens = electron.screen.getAllDisplays();
        if (screens && screens.length >= 0) {
            this.externalDisplay = screens.find((screen) => {
                const screenId = screen.id.toString();
                return screenId === this.settings.displayId;
            });
        }

        const display = this.externalDisplay || electron.screen.getPrimaryDisplay();
        this.settings.corner.x = display.workArea.x;
        this.settings.corner.y = display.workArea.y;

        // update corner x/y based on corner of screen where notification should appear
        const workAreaWidth = display.workAreaSize.width;
        const workAreaHeight = display.workAreaSize.height;
        switch (this.settings.startCorner) {
            case 'upper-right':
                this.settings.corner.x += workAreaWidth;
                break;
            case 'lower-right':
                this.settings.corner.x += workAreaWidth;
                this.settings.corner.y += workAreaHeight;
                break;
            case 'lower-left':
                this.settings.corner.y += workAreaHeight;
                break;
            case 'upper-left':
            default:
                // no change needed
                break;
        }
        this.calculateDimensions();
        // Maximum amount of Notifications we can show:
        this.settings.maxVisibleNotifications = Math.floor(display.workAreaSize.height / this.settings.totalHeight);
    }

    /**
     * Find next possible insert position (on top)
     */
    public calcNextInsertPos(activeNotificationLength) {
        if (activeNotificationLength < this.settings.maxVisibleNotifications) {
            switch (this.settings.startCorner) {
                case 'upper-right':
                case 'upper-left':
                    this.nextInsertPos.y = this.settings.corner.y + (this.settings.totalHeight * activeNotificationLength);
                    break;

                default:
                case 'lower-right':
                case 'lower-left':
                    this.nextInsertPos.y = this.settings.corner.y - (this.settings.totalHeight * (activeNotificationLength + 1));
                    break;
            }
        }
    }

    /**
     * Moves the notification by one step
     *
     * @param startPos {number}
     * @param activeNotifications {ICustomBrowserWindow[]}
     */
    public moveNotificationDown(startPos, activeNotifications) {
        if (startPos >= activeNotifications || startPos === -1) {
            return;
        }
        // Build array with index of affected notifications
        const notificationPosArray: number[] = [];
        for (let i = startPos; i < activeNotifications.length; i++) {
            notificationPosArray.push(i);
        }
        asyncMap(notificationPosArray, (i, done) => {
            // Get notification to move
            const notificationWindow = activeNotifications[i];

            // Calc new y position
            let newY;
            switch (this.settings.startCorner) {
                case 'upper-right':
                case 'upper-left':
                    newY = this.settings.corner.y + (this.settings.totalHeight * i);
                    break;
                default:
                case 'lower-right':
                case 'lower-left':
                    newY = this.settings.corner.y - (this.settings.totalHeight * (i + 1));
                    break;
            }

            if (!windowExists(notificationWindow)) {
                return;
            }

            // Get startPos, calc step size and start animationInterval
            const startY = notificationWindow.getPosition()[1];
            const step = (newY - startY) / this.settings.animationSteps;
            let curStep = 1;
            const animationInterval = setInterval(() => {
                // Abort condition
                if (curStep === this.settings.animationSteps) {
                    this.setWindowPosition(notificationWindow, this.settings.firstPos.x, newY);
                    clearInterval(animationInterval);
                    done(null, 'done');
                    return;
                }
                // Move one step down
                this.setWindowPosition(notificationWindow, this.settings.firstPos.x, startY + curStep * step);
                curStep++;
            }, this.settings.animationStepMs);
        });
    }

    /**
     * Calculates the first and next notification insert position
     */
    private calculateDimensions() {
        const vertSpace = 8;

        // Calc totalHeight & totalWidth
        this.settings.totalHeight = this.settings.height + vertSpace;
        this.settings.totalWidth = this.settings.width;

        let firstPosX;
        let firstPosY;
        switch (this.settings.startCorner) {
            case 'upper-right':
                firstPosX = this.settings.corner.x - this.settings.totalWidth;
                firstPosY = this.settings.corner.y;
                break;
            case 'lower-right':
                firstPosX = this.settings.corner.x - this.settings.totalWidth;
                firstPosY = this.settings.corner.y - this.settings.totalHeight;
                break;
            case 'lower-left':
                firstPosX = this.settings.corner.x;
                firstPosY = this.settings.corner.y - this.settings.totalHeight;
                break;
            case 'upper-left':
            default:
                firstPosX = this.settings.corner.x;
                firstPosY = this.settings.corner.y;
                break;
        }

        // Calc pos of first notification:
        this.settings.firstPos = {
            x: firstPosX,
            y: firstPosY,
        };

        // Set nextInsertPos
        this.nextInsertPos.x = this.settings.firstPos.x;
        this.nextInsertPos.y = this.settings.firstPos.y;
    }

}
