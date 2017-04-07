'use strict';

let logWindow;

/**
 * Send log messages from main process to logger hosted by
 * renderer process. Allows main process to use logger
 * provided by JS.
 * @param  {enum} level      enum from ./enums/LogLevel.js
 * @param  {string} details  msg to be logged
 */
function send(level, details) {
    if (logWindow && level && details) {
        logWindow.send('log', {
            level: level,
            details: details
        });
    }
}

function setLogWindow(win) {
    logWindow = win;
}

module.exports = {
    send: send,
    setLogWindow: setLogWindow
};
