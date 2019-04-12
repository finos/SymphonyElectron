import * as electron from 'electron';

import { logger } from '../common/logger';
import { config } from './config-handler';
import { windowHandler } from './window-handler';
import { windowExists } from './window-utils';

class MemoryMonitor {
    private memoryInfo: Electron.ProcessMemoryInfo | undefined = undefined;
    private isInMeeting: boolean;
    private canReload: boolean;

    private readonly maxIdleTime: number;
    private readonly memoryThreshold: number;
    private readonly memoryRefreshThreshold: number;

    constructor() {
        this.isInMeeting = false;
        this.canReload = true;
        this.maxIdleTime = 4 * 60 * 60 * 1000; // 4 hours
        this.memoryThreshold = 800 * 1024; // 800MB
        this.memoryRefreshThreshold = 60 * 60 * 1000; // 1 hour
    }

    /**
     * Sets process memory from ipc events every hour
     * and refreshes the client if the conditions passes
     *
     * @param memoryInfo {Electron.ProcessMemoryInfo}
     */
    public setMemoryInfo(memoryInfo: Electron.ProcessMemoryInfo): void {
        this.memoryInfo = memoryInfo;
        this.validateMemory();
    }

    /**
     * Sets the web app's RTC meeting status
     *
     * @param isInMeeting {boolean} whether user is in an active RTC meeting
     */
    public setMeetingStatus(isInMeeting: boolean): void {
        this.isInMeeting = isInMeeting;
    }

    /**
     * Validates the predefined conditions and refreshes the client
     */
    private validateMemory(): void {
        const { memoryRefresh } = config.getConfigFields([ 'memoryRefresh' ]);
        if (!memoryRefresh) {
            logger.info(`memory refresh is disabled`);
            return;
        }

        (electron.powerMonitor as any).querySystemIdleTime((time) => {
            const idleTime = time * 1000;
            if (!(!this.isInMeeting
                && windowHandler.isOnline
                && this.canReload
                && idleTime > this.maxIdleTime
                && (this.memoryInfo && this.memoryInfo.private > this.memoryThreshold))
            ) {
                logger.info(`Not Reloading the app as
                application was refreshed less than a hour ago? ${this.canReload ? 'no' : 'yes'}
                memory consumption is ${(this.memoryInfo && this.memoryInfo.private) || 'unknown'}kb is less than? ${this.memoryThreshold}kb
                system idle tick was ${idleTime}ms is less than? ${this.maxIdleTime}ms
                user was in a meeting? ${this.isInMeeting}
                is network online? ${windowHandler.isOnline}`);
                return;
            }
            const mainWindow = windowHandler.getMainWindow();
            if (mainWindow && windowExists(mainWindow)) {
                logger.info(`Reloading the app to optimize memory usage as
                    memory consumption is ${this.memoryInfo.private}kb is greater than? ${this.memoryThreshold}kb threshold
                    system idle tick was ${idleTime}ms is greater than ${this.maxIdleTime}ms
                    user was in a meeting? ${this.isInMeeting}
                    is network online? ${windowHandler.isOnline}`);
                windowHandler.setIsAutoReload(true);
                mainWindow.reload();
                this.canReload = false;
                setTimeout(() => {
                    this.canReload = true;
                }, this.memoryRefreshThreshold);
            }
        });
    }
}

const memoryMonitor = new MemoryMonitor();

export { memoryMonitor };
