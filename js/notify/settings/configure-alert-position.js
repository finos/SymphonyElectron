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

let windowConfig = {
    width: 460,
    height: 360,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    frame: true,
    transparent: false,
    titleBarStyle: 'hidden',
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
        getConfigField('notfPosition')
            .then(loadConfig)
            .catch(function (err) {
                let title = 'Error loading configuration';
                electron.dialog.showErrorBox(title, title + ': ' + err);
            });

        configurationWindow.webContents.send('screens', screens);
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

function updateConfig(event, configObj) {
    updateConfigField(configObj.fieldName, configObj.value)
        .then(updateNotification(configObj.value))
        .catch(function (err){
            let title = 'Error updating configuration';
            electron.dialog.showErrorBox(title, title + ': ' + err);
        });
}

function loadConfig(position) {
    configurationWindow.webContents.send('notfConfig', {position: position})
}

function updateNotification(position) {
    notify.updateConfig({startCorner: position});
    notify.reset();
}

ipc.on('close-alert', function () {
    configurationWindow.close();
});

ipc.on('update-config', updateConfig);

module.exports = {
    openConfigurationWindow: openConfigurationWindow
};