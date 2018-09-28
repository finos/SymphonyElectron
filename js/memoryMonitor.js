'use strict';

const { session } = require('electron');
const eventEmitter = require('./eventEmitter');

const log = require('./log.js');
const logLevels = require('./enums/logLevels.js');
const { getMainWindow, setIsAutoReload, getIsOnline } = require('./windowMgr');
const { getConfigField } = require('./config');

const maxMemory = 800;
const defaultInterval = 30 * 1000;
const memoryRefreshThreshold = 60 * 60 * 1000;
const cpuUsageThreshold = 5;

let isInMeeting = false;
let canReload = true;
let appMinimizedTimer;
let powerMonitorTimer;
let preloadMemory;
let preloadWindow;
let networkRequestCount = 0;

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
 */
function optimizeMemory() {

    if (!preloadMemory || !preloadMemory.memoryInfo || !preloadMemory.cpuUsage) {
        log.send(logLevels.INFO, `Memory info not available`);
        return;
    }

    const memoryConsumed = (preloadMemory.memoryInfo && preloadMemory.memoryInfo.workingSetSize / 1024) || 0;
    const cpuUsagePercentage = preloadMemory.cpuUsage.percentCPUUsage;

    if (memoryConsumed > maxMemory
        && cpuUsagePercentage <= cpuUsageThreshold
        && !isInMeeting
        && getIsOnline()
        && canReload
        && networkRequestCount <= 0
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
                        pending network request on the client was ${networkRequestCount}
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
                        memory consumption was ${memoryConsumed} 
                        CPU usage percentage was ${preloadMemory.cpuUsage.percentCPUUsage} 
                        user was in a meeting? ${isInMeeting}
                        pending network request on the client was ${networkRequestCount}
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
 * @param cpuUsage - CPU usage of the preload main script
 */
function setPreloadMemoryInfo(memoryInfo, cpuUsage) {
    log.send(logLevels.INFO, 'Memory info received from preload process now running optimize memory logic');
    preloadMemory = { memoryInfo, cpuUsage };
    optimizeMemory();
}

/**
 * Called whenever the application is minimized
 * and waits for 30s to optimize memory
 */
eventEmitter.on('appMinimized', () => {
    appMinimizedTimer = setTimeout(() => {
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isMinimized()) {
            log.send(logLevels.INFO, 'Application is minimised for more than 30s so calling requestMemoryInfo');
            requestMemoryInfo();
        }
    }, defaultInterval);
});

/**
 * Called whenever the application is restored from minimized state
 *
 * Clears appMinimizedTimer if the app is restored within 30s
 * from minimized state
 */
eventEmitter.on('appRestored', () => {
    log.send(logLevels.INFO, 'Application was restored from minimized state');
    setIsAutoReload(false);
    if (appMinimizedTimer) {
        clearTimeout(appMinimizedTimer);
    }
});

/**
 * Called whenever the system in locked
 * and waits for 30s to optimize memory
 */
eventEmitter.on('sys-locked', () => {
    log.send(logLevels.INFO, 'System screen was locked');
    powerMonitorTimer = setTimeout(() => {
        log.send(logLevels.INFO, 'System screen was locked for more than 30s so calling requestMemoryInfo');
        requestMemoryInfo();
    }, defaultInterval);
});

/**
 * Called whenever the system in locked
 *
 * Clears powerMonitorTimer if the system is unlocked within 30s
 * from locked state
 */
eventEmitter.on('sys-unlocked', () => {
    log.send(logLevels.INFO, 'System screen was unlocked');
    setIsAutoReload(false);
    if (powerMonitorTimer) {
        clearTimeout(powerMonitorTimer);
    }
});

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
 * Monitors and Keeps track of active network requests
 */
function monitorNetworkRequest() {
    let ids = [];

    // network request started
    session.defaultSession.webRequest.onSendHeaders((details) => {
        networkRequestCount++;
        ids.push(details.id);
    });

    // decrease network request count on complete
    session.defaultSession.webRequest.onCompleted((details) => {
        if (ids.includes(details.id)) {
            networkRequestCount--;
            ids = ids.filter((value) => value !== details.id);
        }
    });

    // decrease network request count on error
    session.defaultSession.webRequest.onErrorOccurred((details) => {
        if (ids.includes(details.id)) {
            networkRequestCount--;
            ids = ids.filter((value) => value !== details.id);
        }
    });

    // Resets network request on redirect
    session.defaultSession.webRequest.onBeforeRedirect(() => {
        networkRequestCount = 0;
        ids = [];
    });
}

module.exports = {
    setIsInMeeting,
    setPreloadMemoryInfo,
    setPreloadWindow,
    monitorNetworkRequest,
};