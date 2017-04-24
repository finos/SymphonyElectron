'use strict';

const systemIdleTime = require('@paulcbetts/system-idle-time');

/**
 * @return {{isUserIdle: boolean, systemIdleTime: *}}
 */
function activityDetection() {

    const maxIdleTime = 4 * 60 * 1000;

    if (systemIdleTime.getIdleTime() < maxIdleTime) {
        return {isUserIdle: true, systemIdleTime: systemIdleTime.getIdleTime()};
    }

}

module.exports.getIdleTime = activityDetection;
