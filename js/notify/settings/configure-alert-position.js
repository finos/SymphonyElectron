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

const { getConfigField, updateConfigField } = require('../../config');

let configurationWindow;
let screens;
let notfPosition;
let notfScreen;

let windowConfig = {
    width: 460,
    height: 360,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    frame: true,
    transparent: false,
    acceptFirstMouse: true,
    webPreferences: {
        preload: path.join(__dirname, 'configure-alert-position-preload.js'),
        sandbox: true,
        nodeIntegration: false
    }
};

app.on('ready', () => {
    screens = electron.screen.getAllDisplays();
});

function getTemplatePath() {
    let templatePath = path.join(__dirname, 'configure-alert-position.html');
    try {
        fs.statSync(templatePath).isFile();
    } catch (err) {
        log.send(logLevels.ERROR, 'configure-alert-position: Could not find template ("' + templatePath + '").');
    }
    return 'file://' + templatePath;
}

function openConfigurationWindow() {
    let mainWin = configurationWindow;
    if (mainWin && !mainWin.isDestroyed()) {
        if (mainWin.isMinimized()) {
            mainWin.restore();
        }
        mainWin.focus();
    } else {
        createWindow();
    }
}

function createWindow() {
    configurationWindow = new BrowserWindow(windowConfig);
    configurationWindow.setVisibleOnAllWorkspaces(true);
    configurationWindow.loadURL(getTemplatePath());
    configurationWindow.show();

    configurationWindow.webContents.on('did-finish-load', function () {
        configurationWindow.webContents.send('screens', screens);
        loadConfig();
    });

    configurationWindow.on('close', function () {
        destroyWindow();
    });

    configurationWindow.on('closed', function () {
        destroyWindow();
    });
}

function destroyWindow() {
    configurationWindow = null;
}

/**
 * Method to save 'notfPosition' & 'notfScreen' to the config file
 */
function updateConfig() {
    updateConfigField('notfPosition', notfPosition)
        .then(function () {
            updateConfigField('notfScreen', notfScreen);
        },
        function () {
            updateConfigField('notfScreen', notfScreen)
        });
    updateNotification(notfPosition, notfScreen);
}

/**
 * Method to read 'notfPosition' & 'notfScreen' from config and
 * updated the configuration view
 */
function loadConfig() {
    getConfigField('notfPosition')
        .then(function (value) {
            notfPosition = value;
            configurationWindow.webContents.send('notfPosition', {position: value})
        })
        .catch(function (err) {
            let title = 'Error loading configuration';
            electron.dialog.showErrorBox(title, title + ': ' + err);
        });

    getConfigField('notfScreen')
        .then(function (value) {
            notfScreen = value;
            configurationWindow.webContents.send('notfScreen', {screen: value})
        })
        .catch(function (err) {
            let title = 'Error loading configuration';
            electron.dialog.showErrorBox(title, title + ': ' + err);
        });
}

/**
 * Method to update the Notification class with the new 'position' & 'screen'
 * @param position - position to display the notifications
 * ('upper-right, upper-left, lower-right, lower-left')
 * @param screen - id of the selected screen
 */
function updateNotification(position, screen) {
    notify.updateConfig({notfPosition: position, notfScreen: screen});
    notify.reset();
}

ipc.on('close-alert', function () {
    configurationWindow.close();
});

ipc.on('update-config', (event, config) => {

    if (config) {
        if (config.notfPosition) {
            notfPosition = config.notfPosition;
        }
        if (config.notfScreen) {
            notfScreen = config.notfScreen;
        }
    }

    updateConfig();
});


module.exports = {
    openConfigurationWindow: openConfigurationWindow
};