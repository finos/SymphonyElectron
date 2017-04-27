'use strict';

const systemIdleTime = require('@paulcbetts/system-idle-time');
const throttle = require('../utils/throttle');

const activity = require('./activity.js');
const maxIdleTime = 4 * 60 * 1000;

/**
 * @return {{isUserIdle: boolean, systemIdleTime: *}}
 * Check if the user is idle
 */
function activityDetection() {
    // Get system idle status and idle time from PaulCBetts package
    if (systemIdleTime.getIdleTime() < maxIdleTime) {
        return {isUserIdle: false, systemIdleTime: systemIdleTime.getIdleTime()};
    }

    // If idle for more than 4 mins, monitor system idle status every second
    monitorUserActivity();
}

/**
 * Start monitoring user activity status.
 * Run every 4 mins to check user idle status
 */
function initiateActivityDetection() {
    let activityCheckInterval = 4 * 60 * 1000;

    let throttleActivity = throttle(activityCheckInterval, sendActivity);
    setInterval(throttleActivity, 5000);
}

/**
 * Monitor system idle status every second
 */
function monitorUserActivity() {
    function monitor() {
        if (systemIdleTime.getIdleTime() < maxIdleTime) {
            // If system is active, send an update to the app bridge and clear the timer
            sendActivity();
            clearInterval(intervalId);
        }
    }

    let throttleMonitor = throttle(1000, monitor);
    let intervalId = setInterval(throttleMonitor, 1000);

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
