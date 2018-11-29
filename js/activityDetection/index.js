'use strict';
const electron = require('electron');
const { app } = electron;
const throttle = require('../utils/throttle');
const log = require('../log.js');
const logLevels = require('../enums/logLevels.js');

let setIsAutoReloadFnc;
let getIsOnlineFnc;
if (!process.env.ELECTRON_QA) {
    /* eslint-disable global-require */
    const { getIsOnline, setIsAutoReload } = require('../windowMgr');
    getIsOnlineFnc = getIsOnline;
    setIsAutoReloadFnc = setIsAutoReload;
    /* eslint-enable global-require */
}

let maxIdleTime;
let activityWindow;
let intervalId;
let throttleActivity;
/**
 * Check if the user is idle
 */
function activityDetection() {

    if (app.isReady()) {

        electron.powerMonitor.querySystemIdleTime((time) => {
            // sent Idle time in milliseconds
            let idleTime = time * 1000 + 1; //ensuring that zero wont be sent
            if (idleTime != null && idleTime !== undefined) {

                if (idleTime < maxIdleTime) {

                    let systemActivity = { isUserIdle: false, systemIdleTime: idleTime };
                    if (systemActivity && !systemActivity.isUserIdle && typeof systemActivity.systemIdleTime === 'number') {
                        return self.send({ systemIdleTime: systemActivity.systemIdleTime });
                    }
                }
            }
            // If idle for more than 4 mins, monitor system idle status every second
            if (!intervalId) {
                self.monitorUserActivity();
            }
            return null;
        })
    }
}

/**
 * Start monitoring user activity status.
 * Run every 4 mins to check user idle status
 */
function initiateActivityDetection() {

    if (!throttleActivity) {
        throttleActivity = throttle(maxIdleTime, activityDetection);
        setInterval(throttleActivity, maxIdleTime);
    }
    self.activityDetection();
}

/**
 * Monitor system idle status every second
 */
function monitorUserActivity() {
    intervalId = setInterval(monitor, 1000);

    function monitor() {
        if (app.isReady()) {
            electron.powerMonitor.querySystemIdleTime((time) => {
                // sent Idle time in milliseconds
                let idleTime = time * 1000 + 1; //ensuring that zero wont be sent
                if (idleTime != null && idleTime !== undefined) {
                    if (idleTime < maxIdleTime && typeof getIsOnlineFnc === 'function' && getIsOnlineFnc()) {
                        // If system is active, send an update to the app bridge and clear the timer
                        self.activityDetection();
                        if (typeof setIsAutoReloadFnc === 'function') {
                            setIsAutoReloadFnc(false);
                        }
                        clearInterval(intervalId);
                        intervalId = undefined;
                    }
                }
            });
        }

    }
}

/**
 * Sends user activity status from main process to activity detection hosted by
 * renderer process. Allows main process to use activity detection
 * provided by JS.
 * @param  {object} data - data as object
 */
function send(data) {
    if (activityWindow && data) {
        log.send(logLevels.INFO, 'activity occurred at time= ' + new Date().toUTCString());
        activityWindow.send('activity', {
            systemIdleTime: data.systemIdleTime
        });
    }
}

/**
 * Set the activity's window
 * @param period
 * @param win
 */
function setActivityWindow(period, win) {
    maxIdleTime = period;
    activityWindow = win;
    // Initiate activity detection to monitor user activity status
    initiateActivityDetection();
}

// Exporting this for unit tests
const self = {
    send: send,
    setActivityWindow: setActivityWindow,
    activityDetection: activityDetection,
    monitorUserActivity: monitorUserActivity, 
};
module.exports = self;
