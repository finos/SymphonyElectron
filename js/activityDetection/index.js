'use strict';

const systemIdleTime = require('@paulcbetts/system-idle-time');
const throttle = require('../utils/throttle');
const log = require('../log.js');
const logLevels = require('../enums/logLevels.js');

let maxIdleTime;
let activityWindow;
let intervalId;
let throttleActivity;

/**
 * Check if the user is idle
 */
function activityDetection() {
    // Get system idle status and idle time from PaulCBetts package
    if (systemIdleTime.getIdleTime() < maxIdleTime) {
        return { isUserIdle: false, systemIdleTime: systemIdleTime.getIdleTime() };
    }

    // If idle for more than 4 mins, monitor system idle status every second
    if (!intervalId) {
        monitorUserActivity();
    }
    return null;
}

/**
 * Start monitoring user activity status.
 * Run every 4 mins to check user idle status
 */
function initiateActivityDetection() {

    if (!throttleActivity) {
        throttleActivity = throttle(maxIdleTime, sendActivity);
        setInterval(throttleActivity, maxIdleTime);
    }

    sendActivity();

}

/**
 * Monitor system idle status every second
 */
function monitorUserActivity() {
    intervalId = setInterval(monitor, 1000);

    function monitor() {
        if (systemIdleTime.getIdleTime() < maxIdleTime) {
            // If system is active, send an update to the app bridge and clear the timer
            sendActivity();
            clearInterval(intervalId);
            intervalId = undefined;
        }
    }

}

/**
 * Send user activity status to the app bridge
 * to be updated across all clients
 */
function sendActivity() {
    let systemActivity = activityDetection();
    if (systemActivity && !systemActivity.isUserIdle && systemActivity.systemIdleTime) {
        send({ systemIdleTime: systemActivity.systemIdleTime });
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

module.exports = {
    send: send,
    setActivityWindow: setActivityWindow,
    activityDetection: activityDetection,
    monitorUserActivity: monitorUserActivity, // Exporting this for unit tests
};