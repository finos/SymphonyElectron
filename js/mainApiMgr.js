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
const { bringToFront } = require('./bringToFront.js');
const eventEmitter = require('./eventEmitter');
const { isMac } = require('./utils/misc');
const { openScreenPickerWindow } = require('./desktopCapturer');
const { openScreenSharingIndicator } = require('./screenSharingIndicator');
const { setPreloadMemoryInfo, setIsInMeeting, setPreloadWindow } = require('./memoryMonitor');

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
 * Method that is invoked when the application is reloaded/navigated
 * window.addEventListener('beforeunload')
 * @param windowName
 */
function sanitize(windowName) {
    // To make sure the reload event is from the main window
    if (windowMgr.getMainWindow() && windowName === windowMgr.getMainWindow().winName) {
        // reset the badge count whenever an user refreshes the electron client
        badgeCount.show(0);

        // Terminates the screen snippet process on reload
        if (!isMac) {
            eventEmitter.emit('killScreenSnippet');
        }
        // Closes all the child windows
        windowMgr.cleanUpChildWindows();
    }
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

    switch(arg.cmd) {
        case apiCmds.isOnline:
            if (typeof arg.isOnline === 'boolean') {
                windowMgr.setIsOnline(arg.isOnline);
            }
            break;
        case apiCmds.setBadgeCount:
            if (typeof arg.count === 'number') {
                badgeCount.show(arg.count);
            }
            break;
        case apiCmds.registerProtocolHandler:
            protocolHandler.setProtocolWindow(event.sender);
            protocolHandler.checkProtocolAction();
            break;
        case apiCmds.badgeDataUrl:
            if (typeof arg.dataUrl === 'string' && typeof arg.count === 'number') {
                badgeCount.setDataUrl(arg.dataUrl, arg.count);
            }
            break;
        case apiCmds.activate:
            if (typeof arg.windowName === 'string') {
                windowMgr.activate(arg.windowName);
            }
            break;
        case apiCmds.registerBoundsChange:
            windowMgr.setBoundsChangeWindow(event.sender);
            break;
        case apiCmds.registerLogger:
            // renderer window that has a registered logger from JS.
            log.setLogWindow(event.sender);
            break;
        case apiCmds.registerActivityDetection:
            if (typeof arg.period === 'number') {
                // renderer window that has a registered activity detection from JS.
                activityDetection.setActivityWindow(arg.period, event.sender);
            }
            break;
        case apiCmds.showNotificationSettings:
            if (typeof arg.windowName === 'string') {
                configureNotification.openConfigurationWindow(arg.windowName);
            }
            break;
        case apiCmds.sanitize:
            if (typeof arg.windowName === 'string') {
                sanitize(arg.windowName);
            }
            break;
        case apiCmds.bringToFront:
            // validates the user bring to front config and activates the wrapper
            if (typeof arg.reason === 'string' && arg.reason === 'notification') {
                bringToFront(arg.windowName, arg.reason);
            }
            break;
        case apiCmds.openScreenPickerWindow:
            if (Array.isArray(arg.sources) && typeof arg.id === 'number') {
                openScreenPickerWindow(event.sender, arg.sources, arg.id);
            }
            break;
        case apiCmds.popupMenu: {
            let browserWin = electron.BrowserWindow.fromWebContents(event.sender);
            if (browserWin && !browserWin.isDestroyed()) {
                windowMgr.getMenu().popup(browserWin, {x: 20, y: 15, async: true});
            }
            break;
        }
        case apiCmds.optimizeMemoryConsumption:
            if (typeof arg.activeRequests === 'number') {
                log.send(logLevels.INFO, 'Received active network request from renderer processes');
                setPreloadMemoryInfo(arg.activeRequests);
            }
            break;
        case apiCmds.optimizeMemoryRegister:
            setPreloadWindow(event.sender);
            break;
        case apiCmds.setIsInMeeting:
            if (typeof arg.isInMeeting === 'boolean') {
                setIsInMeeting(arg.isInMeeting);
            }
            break;
        case apiCmds.setLocale:
            if (typeof arg.locale === 'string') {
                let browserWin = electron.BrowserWindow.fromWebContents(event.sender);
                windowMgr.setLocale(browserWin, { language: arg.locale });
            }
            break;
        case apiCmds.keyPress:
            if (typeof arg.keyCode === 'number') {
                windowMgr.handleKeyPress(arg.keyCode);
            }
            break;
        case apiCmds.isMisspelled:
            if (typeof arg.text === 'string') {
                /* eslint-disable no-param-reassign */
                event.returnValue = windowMgr.isMisspelled(arg.text);
                /* eslint-enable no-param-reassign */
            }
            break;
        case apiCmds.openScreenSharingIndicator:
            if (typeof arg.displayId === 'string' && typeof arg.id === 'number') {
                openScreenSharingIndicator(event.sender, arg.displayId, arg.id);
            }
            break;
        default:
    }

});

// expose these methods primarily for testing...
module.exports = {
    shouldCheckValidWindow: function(shouldCheck) {
        checkValidWindow = shouldCheck;
    }
};