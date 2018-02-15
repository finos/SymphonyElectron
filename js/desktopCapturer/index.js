'use strict';

const electron = require('electron');
const BrowserWindow = electron.BrowserWindow;
const ipc = electron.ipcMain;
const path = require('path');
const fs = require('fs');
const log = require('../log.js');
const logLevels = require('../enums/logLevels.js');

let screenPickerWindow;
let preloadWindow;
let eventId;

let windowConfig = {
    width: 580,
    height: 520,
    show: false,
    modal: true,
    frame: false,
    autoHideMenuBar: true,
    alwaysOnTop: true,
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
    let templatePath = path.join(__dirname, 'screen-picker.html');
    try {
        fs.statSync(templatePath).isFile();
    } catch (err) {
        log.send(logLevels.ERROR, 'screen-picker: Could not find template ("' + templatePath + '").');
    }
    return 'file://' + templatePath;
}

/**
 * Creates the screen picker window
 * @param win {RTCRtpSender} - Name of the window which called invoked this
 * @param sources {Array} - list of object which has screens and applications
 * @param id {Number} - event emitter id
 */
function openScreenPickerWindowWindow(win, sources, id) {

    if (!win) {
        return;
    }

    // prevent a new window from being opened
    // if there is an existing windows
    if (screenPickerWindow) {
        return;
    }

    // Store the window ref to send event
    preloadWindow = win;
    eventId = id;

    screenPickerWindow = new BrowserWindow(windowConfig);
    screenPickerWindow.setVisibleOnAllWorkspaces(true);
    screenPickerWindow.loadURL(getTemplatePath());

    screenPickerWindow.once('ready-to-show', () => {
        screenPickerWindow.show();
    });

    screenPickerWindow.webContents.on('did-finish-load', () => {
        screenPickerWindow.webContents.send('sources', sources);
    });

    screenPickerWindow.on('close', () => {
        destroyWindow();
    });

    screenPickerWindow.on('closed', () => {
        destroyWindow();
    });

}

/**
 * Destroys a window
 */
function destroyWindow() {
    // sending null will clean up the event listener
    startScreenShare(null);
    screenPickerWindow = null;
}

/**
 * Sends an event to a specific with the selected source
 * @param source {Object} - User selected source
 */
function startScreenShare(source) {
    if (preloadWindow && !preloadWindow.isDestroyed()) {
        preloadWindow.send('start-share' + eventId, source);
    }
}

// Emitted when user has selected a source and press the share button
ipc.on('share-selected-source', (event, source) => {
    startScreenShare(source);
});

// Emitted when user closes the screen picker window
ipc.on('close-screen-picker', () => {
    if (screenPickerWindow && !screenPickerWindow.isDestroyed()) {
        screenPickerWindow.close();
    }
});


module.exports = {
    openScreenPickerWindowWindow
};