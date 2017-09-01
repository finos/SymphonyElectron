'use strict';

const path = require('path');
const fs = require('fs');
const electron = require('electron');
const BrowserWindow = electron.BrowserWindow;
const app = electron.app;
const ipc = electron.ipcMain;
const log = require('../../log.js');
const logLevels = require('../../enums/logLevels.js');
const notify = require('./../electron-notify');
const eventEmitter = require('./../../eventEmitter');

const { updateConfigField } = require('../../config');

let configurationWindow;
let screens;
let position;
let display;
let sandboxed = false;

let windowConfig = {
    width: 460,
    height: 360,
    show: false,
    modal: true,
    autoHideMenuBar: true,
    resizable: false,
    webPreferences: {
        preload: path.join(__dirname, 'configure-notification-position-preload.js'),
        sandbox: sandboxed,
        nodeIntegration: false
    }
};

app.on('ready', () => {
    screens = electron.screen.getAllDisplays();

    // if display added/removed update the list of screens
    electron.screen.on('display-added', updateScreens);
    electron.screen.on('display-removed', updateScreens);
});

/**
 * Update all the screens
 */
function updateScreens() {
    screens = electron.screen.getAllDisplays();

    // Notifying renderer when a display is added/removed
    if (configurationWindow && screens && screens.length >= 0) {
        configurationWindow.webContents.send('screens', screens);
    }
}

/**
 * Gets the template path
 * @returns {string}
 */
function getTemplatePath() {
    let templatePath = path.join(__dirname, 'configure-notification-position.html');
    try {
        fs.statSync(templatePath).isFile();
    } catch (err) {
        log.send(logLevels.ERROR, 'configure-notification-position: Could not find template ("' + templatePath + '").');
    }
    return 'file://' + templatePath;
}

/**
 * Opens the configuration window for a specific window
 * @param windowName
 */
function openConfigurationWindow(windowName) {
    let allWindows = BrowserWindow.getAllWindows();
    allWindows = allWindows.find((window) => { return window.winName === windowName });

    // if we couldn't find any window matching the window name
    // it will render as a new window
    if (allWindows) {
        windowConfig.parent = allWindows;
    }

    configurationWindow = new BrowserWindow(windowConfig);
    configurationWindow.setVisibleOnAllWorkspaces(true);
    configurationWindow.loadURL(getTemplatePath());

    configurationWindow.once('ready-to-show', () => {
        configurationWindow.show();
    });

    configurationWindow.webContents.on('did-finish-load', () => {
        if (screens && screens.length >= 0) {
            configurationWindow.webContents.send('screens', screens);
        }
        configurationWindow.webContents.send('notificationSettings', {position: position, display: display});
    });

    configurationWindow.on('close', () => {
        destroyWindow();
    });

    configurationWindow.on('closed', () => {
        destroyWindow();
    });
}

/**
 * Destroys a window
 */
function destroyWindow() {
    configurationWindow = null;
}

/**
 * Method to save 'position' & 'display' to the config file
 */
function updateConfig() {
    let settings = {
        position: position,
        display: display
    };
    updateConfigField('notificationSettings', settings);
    updateNotification(position, display);
}

/**
 * Method to update the Notification class with the new 'position' & 'screen'
 * @param mPosition - position to display the notifications
 * ('upper-right, upper-left, lower-right, lower-left')
 * @param mDisplay - id of the selected display
 */
function updateNotification(mPosition, mDisplay) {
    notify.updateConfig({position: mPosition, display: mDisplay});
    notify.reset();
}

ipc.on('close-alert', function () {
    configurationWindow.close();
});

ipc.on('update-config', (event, config) => {

    if (config) {
        if (config.position) {
            position = config.position;
        }
        if (config.display) {
            display = config.display;
        }
    }

    updateConfig();
});

/**
 * Event to read 'Position' & 'Display' from config and
 * updated the configuration view
 */
eventEmitter.on('notificationSettings', (notificationSettings) => {
    position = notificationSettings.position;
    display = notificationSettings.display;
});

module.exports = {
    openConfigurationWindow: openConfigurationWindow
};