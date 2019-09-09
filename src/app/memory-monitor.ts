import * as electron from 'electron';

import { logger } from '../common/logger';

class MemoryMonitor {
    private memoryInfo: Electron.ProcessMemoryInfo | undefined = undefined;
    private isInMeeting: boolean;

    constructor() {
        this.isInMeeting = false;
    }

    /**
     * Sets process memory from ipc events every hour
     * and refreshes the client if the conditions passes
     *
     * @param memoryInfo {Electron.ProcessMemoryInfo}
     */
    public setMemoryInfo(memoryInfo: Electron.ProcessMemoryInfo): void {
        this.memoryInfo = memoryInfo;
        logger.info(`memory-monitor: setting memory info to ${memoryInfo}`);
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
        (electron.powerMonitor as any).querySystemIdleTime((time) => {
            const idleTime = time * 1000;
            logger.info(`memory-monitor: memory info`, (this.memoryInfo && this.memoryInfo.private));
            logger.info(`memory-monitor: is user in active RTC meeting`, this.isInMeeting);
            logger.info(`memory-monitor: system idle tick`, idleTime);
        });
    }
}

const memoryMonitor = new MemoryMonitor();

export { memoryMonitor };
