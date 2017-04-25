'use strict';

const systemIdleTime = require('@paulcbetts/system-idle-time');
const throttle = require('../utils/throttle');

const activity = require('./activity.js');

/**
 * @return {{isUserIdle: boolean, systemIdleTime: *}}
 */
function activityDetection() {

    const maxIdleTime = 2 * 60 * 1000;

    if (systemIdleTime.getIdleTime() < maxIdleTime) {
        return {isUserIdle: true, systemIdleTime: systemIdleTime.getIdleTime()};
    }

}

/**
 * initiating activity detection on app start
 * runs every 4 min to check user activity
 */
function initiateActivateDetection() {
    let activityCheckInterval = 2 * 60 * 1000;

    setInterval(function () {
        let systemActivity = activityDetection();
        if (systemActivity && systemActivity.isUserIdle && systemActivity.systemIdleTime) {
            throttle(activityCheckInterval, sendActivity(systemActivity.systemIdleTime));
        }
    }, 1000);

}

function sendActivity(idleTime) {
    console.log("Request Sent");
    activity.send(idleTime);
}

module.exports.initiateActivateDetection = initiateActivateDetection;
