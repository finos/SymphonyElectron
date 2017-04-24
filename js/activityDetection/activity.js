'use strict';

let activityWindow;

/**
 * Sends user activity from main process to activity detection hosted by
 * renderer process. Allows main process to use activity detection
 * provided by JS.
 * @param  {number} systemIdleTime - systemIdleTime in millisecond
 */
function send(systemIdleTime) {
    if (activityWindow && systemIdleTime) {
        activityWindow.send('activity', {
            systemIdleTime: systemIdleTime
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
