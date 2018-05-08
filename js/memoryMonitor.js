'use strict';

const log = require('./log.js');
const logLevels = require('./enums/logLevels.js');
const { getMainWindow, setIsAutoReload } = require('./windowMgr');
const systemIdleTime = require('@paulcbetts/system-idle-time');
const { getConfigField } = require('./config');

const awayStatus = 'AWAY';
const maxMemory = 800;

let maxIdleTime = 4 * 60 * 1000;
let reloadThreshold = 30 * 60 * 1000;
let reloadedTimeStamp;
let userPresenceStatus;

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
 */
function optimizeMemory(memoryInfo) {
    const memoryConsumed = (memoryInfo && memoryInfo.workingSetSize / 1024) || 0;
    const canReload = (!reloadedTimeStamp || (new Date().getTime() - reloadedTimeStamp) > reloadThreshold);

    if (memoryConsumed > maxMemory && systemIdleTime.getIdleTime() > maxIdleTime && canReload && !isUserActive()) {
        getConfigField('memoryRefresh')
            .then((enabled) => {
                if (enabled) {
                    const mainWindow = getMainWindow();

                    if (mainWindow && !mainWindow.isDestroyed()) {
                        setIsAutoReload(true);
                        reloadedTimeStamp = new Date().getTime();
                        log.send(logLevels.INFO, 'Reloading the app to optimize memory usage as' +
                            ' memory consumption was ' + memoryConsumed +
                            ' user activity tick was ' + systemIdleTime.getIdleTime() +
                            ' user presence status was ' + userPresenceStatus );
                        mainWindow.reload();
                    }
                }
            });
    }
}

/**
 * Checks the user presence status to see
 * if the user is active
 * @return {boolean}
 */
function isUserActive() {
    return !(userPresenceStatus && userPresenceStatus === awayStatus);
}

/**
 * Sets the current user presence status
 * @param status
 */
function setPresenceStatus(status) {
    userPresenceStatus = status;
}

module.exports = {
    optimizeMemory,
    setPresenceStatus
};