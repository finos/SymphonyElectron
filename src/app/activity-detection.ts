import * as electron from 'electron';
import { app } from 'electron';
import Timer = NodeJS.Timer;

import { logger } from '../common/logger';

class ActivityDetection {
    private idleThreshold: number;
    private window: Electron.WebContents | null;
    private timer: Timer | undefined;

    constructor() {
        this.idleThreshold = 60 * 60 * 1000;
        this.window = null;
    }

    /**
     * Sets the window and the idle threshold from the web app
     *
     * @param window {Electron.BrowserWindow}
     * @param idleThreshold {number}
     */
    public setWindowAndThreshold(window: Electron.WebContents, idleThreshold: number): void {
        this.window = window;
        this.idleThreshold = idleThreshold;
        this.startActivityMonitor();
        logger.info(`activity-detection: Initialized activity detection with an idleThreshold of ${idleThreshold}`);
    }

    /**
     * Start a timer for monitoring user active
     */
    private startActivityMonitor(): void {
        if (app.isReady()) {
            setInterval(() => (electron.powerMonitor as any).querySystemIdleTime(this.activity.bind(this)), this.idleThreshold);
        }
    }

    /**
     * Validates and send the user activity based on
     * the idle threshold set be the web app
     *
     * @param idleTime {number}
     */
    private activity(idleTime: number): void {
        const idleTimeInMillis = idleTime * 1000;
        if (idleTimeInMillis < this.idleThreshold) {
            this.sendActivity(idleTimeInMillis);
            if (this.timer) clearInterval(this.timer);
            this.timer = undefined;
            logger.info(`activity-detection: activity occurred`);
            return;
        }

        if (!this.timer) {
            logger.info(`activity-detection: user is inactive, started monitoring for every 1 sec`);
            // starts monitoring for user activity every 1 sec
            // when user goes inactive
            this.timer = setInterval(() => {
                if (app.isReady()) {
                    (electron.powerMonitor as any).querySystemIdleTime(this.activity.bind(this));
                }
            },  1000);
        }
    }

    /**
     * Send user activity to the web app
     *
     * @param idleTime {number}
     */
    private sendActivity(idleTime: number): void {
        if (this.window && !this.window.isDestroyed()) {
            this.window.send('activity', idleTime || 1);
        }
    }
}

const activityDetection = new ActivityDetection();

export { activityDetection };