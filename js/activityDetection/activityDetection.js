'use strict';

const systemIdleTime = require('@paulcbetts/system-idle-time');
const throttle = require('../utils/throttle');

const activity = require('./activity.js');
const maxIdleTime = 4 * 60 * 1000;
let intervalId;
let throttleActivity;

/**
 * Check if the user is idle
 */
function activityDetection() {
    // Get system idle status and idle time from PaulCBetts package
    if (systemIdleTime.getIdleTime() < maxIdleTime) {
        return {isUserIdle: false, systemIdleTime: systemIdleTime.getIdleTime()};
    }

    // If idle for more than 4 mins, monitor system idle status every second
    if (!intervalId) monitorUserActivity();
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

    setTimeout(sendActivity(), 5000);

}

/**
 * Monitor system idle status every second
 */
function monitorUserActivity() {
    let throttleMonitor = throttle(1000, monitor);
    intervalId = setInterval(throttleMonitor, 1000);

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
        activity.send(systemActivity.systemIdleTime);
    }
}

module.exports.initiateActivityDetection = initiateActivityDetection;
