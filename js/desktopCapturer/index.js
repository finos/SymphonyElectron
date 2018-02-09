'use strict';

const electron = require('electron');
const BrowserWindow = electron.BrowserWindow;
const ipc = electron.ipcMain;
const path = require('path');
const fs = require('fs');
const log = require('../log.js');
const logLevels = require('../enums/logLevels.js');
const { isMac } = require('../utils/misc');

let screenPickerWindow;
let preloadWindow;

let windowConfig = {
    width: 600,
    height: 600,
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
        log.send(logLevels.ERROR, 'basic-auth: Could not find template ("' + templatePath + '").');
    }
    return 'file://' + templatePath;
}

function openScreenPickerWindowWindow(window, sources) {

    preloadWindow = window;


    let allWindows = BrowserWindow.getAllWindows();
    allWindows = allWindows.find((win) => { return win.winName === window.name });

    // if we couldn't find any window matching the window name
    // it will render as a new window
    if (allWindows) {
        windowConfig.parent = allWindows;
    }

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
    screenPickerWindow = null;
}

ipc.on('source-selected', (event, source) => {
    preloadWindow.send('screen-selected', source);
});

module.exports = {
    openScreenPickerWindowWindow
};