'use strict';

const electron = require('electron');
const BrowserWindow = electron.BrowserWindow;
const ipc = electron.ipcMain;
const path = require('path');
const fs = require('fs');
const log = require('../log.js');
const logLevels = require('../enums/logLevels.js');
const { isMac, isWindowsOS } = require('./../utils/misc.js');
const { initCrashReporterMain, initCrashReporterRenderer } = require('../crashReporter.js');
const i18n = require('../translation/i18n');

let screenPickerWindow;
let preloadWindow;
let eventId;

let windowConfig = {
    width: 580,
    height: isMac ? 519 : 523,
    show: false,
    modal: true,
    frame: false,
    autoHideMenuBar: true,
    resizable: false,
    alwaysOnTop: true,
    webPreferences: {
        preload: path.join(__dirname, 'renderer.js'),
        sandbox: true,
        nodeIntegration: false,
        devTools: false
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
 * @param eventSender {RTCRtpSender} - event sender window object
 * @param sources {Array} - list of object which has screens and applications
 * @param id {Number} - event emitter id
 */
function openScreenPickerWindow(eventSender, sources, id) {

    // prevent a new window from being opened if there is an
    // existing window / there is no event sender
    if (!eventSender || screenPickerWindow) {
        return;
    }

    // Screen picker will always be placed on top of the focused window
    const focusedWindow = BrowserWindow.getFocusedWindow();

    // As screen picker is an independent window this will make sure
    // it will open screen picker window center of the focused window
    if (focusedWindow) {
        const { x, y, width, height } = focusedWindow.getBounds();

        if (x !== undefined && y !== undefined) {
            const windowWidth = Math.round(width * 0.5);
            const windowHeight = Math.round(height * 0.5);

            // Calculating the center of the parent window
            // to place the configuration window
            const centerX = x + width / 2.0;
            const centerY = y + height / 2.0;
            windowConfig.x = Math.round(centerX - (windowWidth / 2.0));
            windowConfig.y = Math.round(centerY - (windowHeight / 2.0));
        }

        if (isWindowsOS) {
            windowConfig.parent = focusedWindow;
        }
    }

    // Store the window ref to send event
    preloadWindow = eventSender;
    eventId = id;

    screenPickerWindow = new BrowserWindow(windowConfig);
    screenPickerWindow.setVisibleOnAllWorkspaces(true);
    screenPickerWindow.loadURL(getTemplatePath());

    screenPickerWindow.once('ready-to-show', () => {
        screenPickerWindow.show();
    });

    screenPickerWindow.webContents.on('did-finish-load', () => {
        const screenPickerContent = i18n.getMessageFor('ScreenPicker');
        screenPickerWindow.webContents.send('i18n-screen-picker', screenPickerContent);
        // initialize crash reporter
        initCrashReporterMain({ process: 'desktop capture window' });
        initCrashReporterRenderer(screenPickerWindow, { process: 'render | desktop capture window' });
        screenPickerWindow.webContents.send('desktop-capturer-sources', sources, isWindowsOS);
    });

    screenPickerWindow.webContents.on('crashed', function (event, killed) {

        log.send(logLevels.INFO, `Screen Picker Window crashed! Killed? ${killed}`);

        if (killed) {
            return;
        }

        const options = {
            type: 'error',
            title: i18n.getMessageFor('Renderer Process Crashed'),
            message: i18n.getMessageFor('Oops! Looks like we have had a crash.'),
            buttons: ['Close']
        };

        electron.dialog.showMessageBox(options, function () {
            if (screenPickerWindow && !screenPickerWindow.isDestroyed()) {
                screenPickerWindow.close();
            }
        });
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
    openScreenPickerWindow
};
