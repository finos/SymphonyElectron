'use strict';

let activityWindow;

/**
 * Sends user activity status from main process to activity detection hosted by
 * renderer process. Allows main process to use activity detection
 * provided by JS.
 * @param  {object} data - data as object
 */
function send(data) {
    if (activityWindow && data) {
        activityWindow.send('activity', {
            systemIdleTime: data.systemIdleTime,
            isUserActive: data.isUserActive
        });
    }
}

function setActivityWindow(win) {
    activityWindow = win;
}

module.exports = {
    send: send,
    setActivityWindow: setActivityWindow
};
