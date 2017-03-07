'use strict';

/**
 * This module runs in the main process and handles api calls
 * from the renderer process.
 */
const electron = require('electron');

const windowMgr = require('./windowMgr.js');
const log = require('./log.js');
const badgeCount = require('./badgeCount.js');

const apiEnums = require('./enums/api.js');
const apiCmds = apiEnums.cmds;
const apiName = apiEnums.apiName;

/**
 * Ensure events comes from a window that we have created.
 * @param  {EventEmitter} event  node emitter event to be tested
 * @return {Boolean} returns true if exists otherwise false
 */
function isValidWindow(event) {
    if (event && event.sender) {
        // validate that event sender is from window we created
        const browserWin = electron.BrowserWindow.fromWebContents(event.sender);
        const winKey = event.sender.browserWindowOptions &&
            event.sender.browserWindowOptions.webPreferences &&
            event.sender.browserWindowOptions.webPreferences.winKey;

        return windowMgr.hasWindow(browserWin, winKey);
    }

    return false;
}

/**
 * Handle API related ipc messages from renderers. Only messages from windows
 * we have created are allowed.
 */
electron.ipcMain.on(apiName, (event, arg) => {
    if (!isValidWindow(event)) {
        /* eslint-disable no-console */
        console.log('invalid window try to perform action, ignoring action.');
        /* eslint-enable no-console */
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

    if (arg.cmd === apiCmds.badgeDataUrl && typeof arg.dataUrl === 'string' &&
        typeof arg.count === 'number') {
        badgeCount.setDataUrl(arg.dataUrl, arg.count);
        return;
    }

    if (arg.cmd === apiCmds.registerLogger) {
        // renderer window that has a registered logger from JS.
        log.setLogWindow(event.sender);
        return;
    }

    if (arg.cmd === apiCmds.open && typeof arg.url === 'string') {
        let title = arg.title || 'Symphony';
        let width = arg.width || 1024;
        let height = arg.height || 768;
        windowMgr.createChildWindow(arg.url, title, width, height);
    }
});
