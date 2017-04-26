'use strict';

const systemIdleTime = require('@paulcbetts/system-idle-time');
const throttle = require('../utils/throttle');

const activity = require('./activity.js');
const maxIdleTime = 4 * 60 * 1000;

/**
 * @return {{isUserIdle: boolean, systemIdleTime: *}}
 */
function activityDetection() {

    if (systemIdleTime.getIdleTime() < maxIdleTime) {
        return {isUserIdle: true, systemIdleTime: systemIdleTime.getIdleTime()};
    }

    monitorUserActivity();

}

/**
 * initiating activity detection on app start
 * runs every 4 min to check user activity
 */
function initiateActivateDetection() {
    let activityCheckInterval = 4 * 60 * 1000;

    let throttleActivity = throttle(activityCheckInterval, sendActivity);
    setInterval(throttleActivity, 5000);

}

function monitorUserActivity() {

    function monitor() {
        if (systemIdleTime.getIdleTime() < maxIdleTime) {
            sendActivity();
            clearInterval(intervalId);
        }
    }

    let throttleMonitor = throttle(1000, monitor);
    let intervalId = setInterval(throttleMonitor, 1000);

}

function sendActivity() {
    let systemActivity = activityDetection();
    if (systemActivity && systemActivity.isUserIdle && systemActivity.systemIdleTime) {
        activity.send(systemActivity.systemIdleTime);
    }
}

module.exports.initiateActivateDetection = initiateActivateDetection;
