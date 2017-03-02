'use strict';

/**
 * This module runs in the main process and handles api calls
 * from the renderer process.
 */
const electron = require('electron');
const path = require('path');

const windowMgr = require('./windowMgr.js');
const log = require('./log.js');

/**
 * Ensure events comes from a window that we have created.
 * @param  {EventEmitter} event  node emitter event to be tested
 * @return {Boolean} returns true if exists otherwise false
 */
function isValidWindow(event) {
    if (event && event.sender) {
        // validate that event sender is from window we created
        let browserWin = electron.BrowserWindow.fromWebContents(event.sender);
        let winKey = event.sender.browserWindowOptions &&
            event.sender.browserWindowOptions.webPreferences &&
            event.sender.browserWindowOptions.webPreferences.winKey;

        return windowMgr.hasWindow(browserWin, winKey);
    }

    return false;
}

// only these cmds are allowed by main window
let cmdBlackList = [ 'open', 'registerLogger' ];

/**
 * Only permit certain cmds for some windows
 * @param  {EventEmitter} event  node emitter event to be tested
 * @param  {String}  cmd   cmd name
 * @return {Boolean}       true if cmd is allowed for window, otherwise false
 */
function isCmdAllowed(event, cmd) {
    if (event && event.sender && cmd) {
        // validate that event sender is from window we created
        let browserWin = electron.BrowserWindow.fromWebContents(event.sender);

        if (windowMgr.isMainWindow(browserWin)) {
            // allow all commands for main window
            return true;
        } else {
            // allow only certain cmds for child windows
            // e.g., open cmd not allowed for child windows
            return (cmdBlackList.indexOf(cmd) === -1)
        }
    }

    return false;
}

/**
 * Handle API related ipc messages from renderers. Only messages from windows
 * we have created are allowed.
 */
electron.ipcMain.on('symphony-api', (event, arg) => {
    if (!isValidWindow(event)) {
        console.log('invalid window try to perform action, ignoring action.');
        return;
    }

    if (!isCmdAllowed(event, arg && arg.cmd)) {
        console.log('cmd not allowed for this window: ' + arg.cmd);
        return;
    }

    if (!arg) {
        return;
    }

    if (arg.cmd === 'isOnline') {
        windowMgr.setIsOnline(arg.isOnline);
        return;
    }

    if (arg.cmd === 'registerLogger') {
        // renderer window that has a registered logger from JS.
        log.setLogWindow(event.sender);
        return;
    }

    if (arg.cmd === 'open' && arg.url) {
        let title = arg.title || 'Symphony';
        let width = arg.width || 1024;
        let height = arg.height || 768;
        windowMgr.createChildWindow(arg.url, title, width, height);
        return;
    }
});
