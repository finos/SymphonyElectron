'use strict';

const systemIdleTime = require('@paulcbetts/system-idle-time');

const log = require('./log.js');
const logLevels = require('./enums/logLevels.js');
const { getMainWindow, setIsAutoReload, getIsOnline } = require('./windowMgr');
const { getConfigField } = require('./config');

const maxMemory = 800;
const memoryRefreshThreshold = 60 * 60 * 1000;
const maxIdleTime = 4 * 60 * 60 * 1000;
const memoryRefreshInterval = 60 * 60 * 1000;
const cpuUsageThreshold = 5;

let isInMeeting = false;
let canReload = true;
let preloadMemory;
let preloadWindow;

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
    log.send(logLevels.INFO, `Current Memory Stats -> ${details}`);
}

/**
 * Method that checks memory usage every minute
 * and verify if the user in inactive if so it reloads the
 * application to free up some memory consumption
 */
function optimizeMemory() {

    if (!preloadMemory || !preloadMemory.memoryInfo || !preloadMemory.cpuUsage) {
        log.send(logLevels.INFO, `Memory info not available`);
        return;
    }

    const memoryConsumed = (preloadMemory.memoryInfo && preloadMemory.memoryInfo.workingSetSize / 1024) || 0;
    const cpuUsagePercentage = preloadMemory.cpuUsage.percentCPUUsage;
    const activeNetworkRequest = preloadMemory.activeRequests === 0;

    if (memoryConsumed > maxMemory
        && cpuUsagePercentage <= cpuUsageThreshold
        && !isInMeeting
        && getIsOnline()
        && canReload
        && systemIdleTime.getIdleTime() > maxIdleTime
        && activeNetworkRequest
    ) {
        getConfigField('memoryRefresh')
            .then((enabled) => {
                if (enabled) {
                    const mainWindow = getMainWindow();

                    if (mainWindow && !mainWindow.isDestroyed()) {
                        setIsAutoReload(true);
                        log.send(logLevels.INFO, `Reloading the app to optimize memory usage as 
                        memory consumption was ${memoryConsumed} 
                        CPU usage percentage was ${preloadMemory.cpuUsage.percentCPUUsage} 
                        user was in a meeting? ${isInMeeting}
                        pending network request on the client was ${preloadMemory.activeRequests}
                        is network online? ${getIsOnline()}`);
                        mainWindow.reload();

                        // do not refresh for another 1hrs
                        canReload = false;
                        setTimeout(() => {
                            canReload = true;
                        }, memoryRefreshThreshold);
                    }
                } else {
                    log.send(logLevels.INFO, `Memory refresh not enabled by the user so Not Reloading the app`);
                }
            });
    } else {
        log.send(logLevels.INFO, `Not Reloading the app as
                        application was refreshed less than a hour ago? ${canReload ? 'no' : 'yes'}
                        memory consumption was ${memoryConsumed} 
                        CPU usage percentage was ${preloadMemory.cpuUsage.percentCPUUsage} 
                        user was in a meeting? ${isInMeeting}
                        pending network request on the client was ${preloadMemory.activeRequests}
                        is network online? ${getIsOnline()}`);
    }
}

/**
 * Sets the current user meeting status
 * @param meetingStatus - Whether user is in an active meeting
 */
function setIsInMeeting(meetingStatus) {
    isInMeeting = meetingStatus;
}

/**
 * Sets preload memory info and calls optimize memory func
 *
 * @param memoryInfo - memory consumption of the preload main script
 * @param activeRequests - pending active network requests on the client
 */
function setPreloadMemoryInfo(memoryInfo, activeRequests) {
    log.send(logLevels.INFO, 'Memory info received from preload process now running optimize memory logic');
    const cpuUsage = process.getCPUUsage();
    preloadMemory = { memoryInfo, cpuUsage, activeRequests };
    optimizeMemory();
}

/**
 * Sets the preload window
 *
 * @param win - preload window
 */
function setPreloadWindow(win) {
    log.send(logLevels.INFO, 'Preload window registered');
    preloadWindow = win;
}

/**
 * Request memory info from the registered preload window
 * which invokes the optimize memory func
 */
function requestMemoryInfo() {
    if (preloadWindow) {
        log.send(logLevels.INFO, 'Requesting memory information from the preload script');
        preloadWindow.send('memory-info-request');
    }
}

/**
 * Requests memory info from the renderer every 4 hrs
 */
setInterval(() => {
    requestMemoryInfo();
}, memoryRefreshInterval);

module.exports = {
    setIsInMeeting,
    setPreloadMemoryInfo,
    setPreloadWindow,
};