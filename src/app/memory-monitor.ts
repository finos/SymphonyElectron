import * as electron from 'electron';

import { isMac } from '../common/env';
import { logger } from '../common/logger';
import { config } from './config-handler';
import { windowHandler } from './window-handler';
import { windowExists } from './window-utils';

class MemoryMonitor {
    private memoryInfo: Electron.ProcessMemoryInfo | undefined = undefined;
    private isInMeeting: boolean;
    private canReload: boolean;
    private lastReloadTime?: number;

    private readonly maxIdleTime: number;
    private readonly memoryThreshold: number;
    private readonly memoryRefreshThreshold: number;

    constructor() {
        this.isInMeeting = false;
        this.canReload = true;
        this.maxIdleTime = 4 * 60 * 60 * 1000; // user activity threshold 4 hours
        this.memoryThreshold = 800 * 1024; // 800MB
        this.memoryRefreshThreshold = 24 * 60 * 60 * 1000; // 24 hour
    }

    /**
     * Sets process memory from ipc events every hour
     * and refreshes the client if the conditions passes
     *
     * @param memoryInfo {Electron.ProcessMemoryInfo}
     */
    public setMemoryInfo(memoryInfo: Electron.ProcessMemoryInfo): void {
        this.memoryInfo = memoryInfo;
        logger.info(`memory-monitor: setting memory info to ${JSON.stringify(memoryInfo)}`);
        this.validateMemory();
    }

    /**
     * Sets the web app's RTC meeting status
     *
     * @param isInMeeting {boolean} whether user is in an active RTC meeting
     */
    public setMeetingStatus(isInMeeting: boolean): void {
        this.isInMeeting = isInMeeting;
        logger.info(`memory-monitor: setting meeting status to ${isInMeeting}`);
    }

    /**
     * Validates the predefined conditions and refreshes the client
     */
    private validateMemory(): void {
        logger.info(`memory-monitor: validating memory refresh conditions`);
        const { memoryRefresh } = config.getConfigFields([ 'memoryRefresh' ]);
        if (!memoryRefresh) {
            logger.info(`memory-monitor: memory reload is disabled in the config, not going to refresh!`);
            return;
        }

        (electron.powerMonitor as any).querySystemIdleTime((time) => {
            const idleTime = time * 1000;
            // for MacOS use private else use residentSet
            const memoryConsumption = isMac ? (this.memoryInfo && this.memoryInfo.private) : (this.memoryInfo && this.memoryInfo.residentSet);
            logger.info(`memory-monitor: Checking different conditions to see if we should auto reload the app`);

            logger.info(`memory-monitor: Is in meeting: `, this.isInMeeting);
            logger.info(`memory-monitor: Is Network online: `, windowHandler.isOnline);
            logger.info(`memory-monitor: Memory consumption: `, memoryConsumption);
            logger.info(`memory-monitor: Idle Time: `, idleTime);
            logger.info(`memory-monitor: Last Reload time: `, this.lastReloadTime);

            if (this.isInMeeting) {
                logger.info(`memory-monitor: NOT RELOADING -> User is currently in a meeting. Meeting status from client: `, this.isInMeeting);
                return;
            }

            if (!windowHandler.isOnline) {
                logger.info(`memory-monitor: NOT RELOADING -> Not connected to network. Network status: `, windowHandler.isOnline);
                return;
            }

            if (!(memoryConsumption && memoryConsumption > this.memoryThreshold)) {
                logger.info(`memory-monitor: NOT RELOADING -> Memory consumption ${memoryConsumption} is lesser than the threshold ${this.memoryThreshold}`);
                return;
            }

            if (!(idleTime > this.maxIdleTime)) {
                logger.info(`memory-monitor: NOT RELOADING -> User is not idle for: `, idleTime);
                return;
            }

            if (!this.canReload) {
                logger.info(`memory-monitor: NOT RELOADING -> Already refreshed at: `, this.lastReloadTime);
                return;
            }

            const mainWindow = windowHandler.getMainWindow();
            if (!(mainWindow && windowExists(mainWindow))) {
                logger.info(`memory-monitor: NOT RELOADING -> Main window doesn't exist!`);
                return;
            }

            logger.info(`memory-monitor: RELOADING -> auto reloading the app as all the conditions are satisfied`);

            windowHandler.setIsAutoReload(true);
            mainWindow.reload();
            this.canReload = false;
            this.lastReloadTime = new Date().getTime();
            setTimeout(() => {
                this.canReload = true;
            }, this.memoryRefreshThreshold); // prevents multiple reloading of the client within 24hrs
        });
    }
}

const memoryMonitor = new MemoryMonitor();

export { memoryMonitor };
