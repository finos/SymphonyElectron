'use strict';

const electron = require('electron');
const BrowserWindow = electron.BrowserWindow;
const ipc = electron.ipcMain;
const path = require('path');
const fs = require('fs');
const log = require('../log.js');
const logLevels = require('../enums/logLevels.js');

let basicAuthWindow;

const local = {};

let windowConfig = {
    width: 360,
    height: 270,
    show: false,
    modal: true,
    autoHideMenuBar: true,
    titleBarStyle: true,
    resizable: false,
    webPreferences: {
        preload: path.join(__dirname, 'renderer.js'),
        sandbox: true,
        nodeIntegration: false
    }
};

/**
 * method to get the HTML template path
 * @returns {string}
 */
function getTemplatePath() {
    let templatePath = path.join(__dirname, 'basic-auth.html');
    try {
        fs.statSync(templatePath).isFile();
    } catch (err) {
        log.send(logLevels.ERROR, 'basic-auth: Could not find template ("' + templatePath + '").');
    }
    return 'file://' + templatePath;
}

/**
 * Opens the basic auth window for authentication
 * @param {String} windowName - name of the window upon which this window should show
 * @param {String} hostname - name of the website that requires authentication
 * @param {Function} callback
 */
function openBasicAuthWindow(windowName, hostname, callback) {

    // Register callback function
    if (typeof callback === 'function') {
        local.authCallback = callback;
    }

    // This prevents creating multiple instances of the
    // basic auth window
    if (basicAuthWindow) {
        if (basicAuthWindow.isMinimized()) {
            basicAuthWindow.restore();
        }
        basicAuthWindow.focus();
        return;
    }
    let allWindows = BrowserWindow.getAllWindows();
    allWindows = allWindows.find((window) => { return window.winName === windowName });

    // if we couldn't find any window matching the window name
    // it will render as a new window
    if (allWindows) {
        windowConfig.parent = allWindows;
    }

    basicAuthWindow = new BrowserWindow(windowConfig);
    basicAuthWindow.setVisibleOnAllWorkspaces(true);
    basicAuthWindow.loadURL(getTemplatePath());

    // sets the AlwaysOnTop property for the basic auth window
    // if the main window's AlwaysOnTop is true
    let focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow && focusedWindow.isAlwaysOnTop()) {
        basicAuthWindow.setAlwaysOnTop(true);
    }

    basicAuthWindow.once('ready-to-show', () => {
        basicAuthWindow.show();
    });

    basicAuthWindow.webContents.on('did-finish-load', () => {
        basicAuthWindow.webContents.send('hostname', hostname);
    });

    basicAuthWindow.on('close', () => {
        destroyWindow();
    });

    basicAuthWindow.on('closed', () => {
        destroyWindow();
    });
}

ipc.on('login', (event, args) => {
    if (typeof args === 'object' && typeof local.authCallback === 'function') {
        local.authCallback(args.username, args.password);
        basicAuthWindow.close();
    }
});

ipc.on('close-basic-auth', () => {
    if (basicAuthWindow) {
        basicAuthWindow.close();
    }
});

/**
 * Destroys a window
 */
function destroyWindow() {
    basicAuthWindow = null;
}


module.exports = {
    openBasicAuthWindow: openBasicAuthWindow
};