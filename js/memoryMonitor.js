'use strict';

const log = require('./log.js');
const logLevels = require('./enums/logLevels.js');
const { getMainWindow, setIsAutoReload } = require('./windowMgr');
const systemIdleTime = require('@paulcbetts/system-idle-time');
const { getConfigField } = require('./config');

const maxMemory = 800;

let maxIdleTime = 4 * 60 * 60 * 1000;
let isInMeeting = false;

// once a minute
setInterval(gatherMemory, 1000 * 60);

/**
 * Gathers system memory and logs it to the remote system
 */
function gatherMemory() {
    let memory = process.getProcessMemoryInfo();
    let details =
        'workingSetSize: ' + memory.workingSetSize +
        ' peakWorkingSetSize: ' + memory.peakWorkingSetSize +
        ' privatesBytes: ' + memory.privatesBytes +
        ' sharedBytes: ' + memory.sharedBytes;
    log.send(logLevels.INFO, details);
}

/**
 * Method that checks memory usage every minute
 * and verify if the user in inactive if so it reloads the
 * application to free up some memory consumption
 * 
 * @param memoryInfo
 * @param cpuUsage
 */
function optimizeMemory(memoryInfo, cpuUsage) {
    const memoryConsumed = (memoryInfo && memoryInfo.workingSetSize / 1024) || 0;

    if (memoryConsumed > maxMemory
        && systemIdleTime.getIdleTime() > maxIdleTime
        && !isInMeeting
    ) {
        getConfigField('memoryRefresh')
            .then((enabled) => {
                if (enabled) {
                    const mainWindow = getMainWindow();

                    if (mainWindow && !mainWindow.isDestroyed()) {
                        setIsAutoReload(true);
                        log.send(logLevels.INFO, 'Reloading the app to optimize memory usage as' +
                            ' memory consumption was ' + memoryConsumed +
                            ' CPU usage percentage was ' + cpuUsage.percentCPUUsage +
                            ' user activity tick was ' + systemIdleTime.getIdleTime() +
                            ' user was in a meeting? ' + isInMeeting );
                        mainWindow.reload();
                    }
                }
            });
    }
}

/**
 * Sets the current user meeting status
 * @param meetingStatus - Whether user is in an active meeting
 */
function setIsInMeeting(meetingStatus) {
    isInMeeting = meetingStatus;
}

module.exports = {
    optimizeMemory,
    setIsInMeeting
};