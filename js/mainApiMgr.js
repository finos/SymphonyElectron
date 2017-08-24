'use strict';

/**
 * This module runs in the main process and handles api calls
 * from the renderer process.
 */
const electron = require('electron');

const windowMgr = require('./windowMgr.js');
const log = require('./log.js');
const logLevels = require('./enums/logLevels');
const activityDetection = require('./activityDetection');
const badgeCount = require('./badgeCount.js');
const protocolHandler = require('./protocolHandler');
const configureNotification = require('./notify/settings/configure-notification-position');

const apiEnums = require('./enums/api.js');
const apiCmds = apiEnums.cmds;
const apiName = apiEnums.apiName;

// can be overridden for testing
let checkValidWindow = true;

/**
 * Ensure events comes from a window that we have created.
 * @param  {EventEmitter} event  node emitter event to be tested
 * @return {Boolean} returns true if exists otherwise false
 */
function isValidWindow(event) {
    if (!checkValidWindow) {
        return true;
    }
    let result = false;
    if (event && event.sender) {
        // validate that event sender is from window we created
        const browserWin = electron.BrowserWindow.fromWebContents(event.sender);
        const winKey = event.sender.browserWindowOptions &&
            event.sender.browserWindowOptions.winKey;

        result = windowMgr.hasWindow(browserWin, winKey);
    }

    if (!result) {
        log.send(logLevels.WARN, 'invalid window try to perform action, ignoring action');
    }

    return result;
}

/**
 * Handle API related ipc messages from renderers. Only messages from windows
 * we have created are allowed.
 */
electron.ipcMain.on(apiName, (event, arg) => {
    if (!isValidWindow(event)) {
        return;
    }

    if (!arg) {
        return;
    }

    if (arg.cmd === apiCmds.isOnline && typeof arg.isOnline === 'boolean') {
        windowMgr.setIsOnline(arg.isOnline);
        return;
    }

    if (arg.cmd === apiCmds.setBadgeCount && typeof arg.count === 'number') {
        badgeCount.show(arg.count);
        return;
    }

    if (arg.cmd === apiCmds.registerProtocolHandler) {
        protocolHandler.setProtocolWindow(event.sender);
        protocolHandler.checkProtocolAction();
    }

    if (arg.cmd === apiCmds.badgeDataUrl && typeof arg.dataUrl === 'string' &&
        typeof arg.count === 'number') {
        badgeCount.setDataUrl(arg.dataUrl, arg.count);
        return;
    }

    if (arg.cmd === apiCmds.activate && typeof arg.windowName === 'string') {
        windowMgr.activate(arg.windowName);
        return;
    }

    if (arg.cmd === apiCmds.registerBoundsChange) {
        windowMgr.setBoundsChangeWindow(event.sender);
    }

    if (arg.cmd === apiCmds.registerLogger) {
        // renderer window that has a registered logger from JS.
        log.setLogWindow(event.sender);
    }

    if (arg.cmd === apiCmds.registerActivityDetection) {
        // renderer window that has a registered activity detection from JS.
        activityDetection.setActivityWindow(arg.period, event.sender);
    }

    if (arg.cmd === apiCmds.showNotificationSettings && typeof arg.windowName === 'string') {
        configureNotification.openConfigurationWindow(arg.windowName);
    }
});

// expose these methods primarily for testing...
module.exports = {
    shouldCheckValidWindow: function(shouldCheck) {
        checkValidWindow = shouldCheck;
    }
};