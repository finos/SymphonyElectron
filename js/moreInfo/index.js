'use strict';

const electron = require('electron');
const BrowserWindow = electron.BrowserWindow;
const path = require('path');
const fs = require('fs');
const log = require('../log.js');
const logLevels = require('../enums/logLevels.js');
const { version, clientVersion, buildNumber } = require('../../package.json');
const { initCrashReporterMain, initCrashReporterRenderer } = require('../crashReporter.js');
const i18n = require('../translation/i18n');
const { isMac } = require('../utils/misc');

let moreInfoWindow;

let windowConfig = {
    width: 800,
    height: 600,
    show: false,
    modal: true,
    autoHideMenuBar: true,
    titleBarStyle: true,
    resizable: false,
    fullscreenable: false,
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
    let templatePath = path.join(__dirname, 'more-info.html');
    try {
        fs.statSync(templatePath).isFile();
    } catch (err) {
        log.send(logLevels.ERROR, 'more-info: Could not find template ("' + templatePath + '").');
    }
    return 'file://' + templatePath;
}

/**
 * Opens the about application window for a specific window
 * @param {String} windowName - name of the window upon
 * which this window should show
 */
function openMoreInfoWindow(windowName) {

    // This prevents creating multiple instances of the
    // about window
    if (moreInfoWindow) {
        if (moreInfoWindow.isMinimized()) {
            moreInfoWindow.restore();
        }
        moreInfoWindow.focus();
        return;
    }
    let allWindows = BrowserWindow.getAllWindows();
    allWindows = allWindows.find((window) => { return window.winName === windowName });

    // if we couldn't find any window matching the window name
    // it will render as a new window
    if (allWindows) {
        windowConfig.parent = allWindows;
    }

    moreInfoWindow = new BrowserWindow(windowConfig);
    moreInfoWindow.setVisibleOnAllWorkspaces(true);
    moreInfoWindow.loadURL(getTemplatePath());

    // sets the AlwaysOnTop property for the about window
    // if the main window's AlwaysOnTop is true
    let focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow && focusedWindow.isAlwaysOnTop()) {
        moreInfoWindow.setAlwaysOnTop(true);
    }

    moreInfoWindow.once('ready-to-show', () => {
        moreInfoWindow.show();
    });

    moreInfoWindow.webContents.on('did-finish-load', () => {
        // initialize crash reporter
        initCrashReporterMain({ process: 'more info window' });
        initCrashReporterRenderer(moreInfoWindow, { process: 'render | more info window' });
        moreInfoWindow.webContents.send('versionInfo', { version, clientVersion, buildNumber });
        if (!isMac) {
            // prevents from displaying menu items when "alt" key is pressed
            moreInfoWindow.setMenu(null);
        }
    });

    moreInfoWindow.webContents.on('crashed', function (event, killed) {

        log.send(logLevels.INFO, `More Info Window crashed! Killed? ${killed}`);

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
            if (moreInfoWindow && !moreInfoWindow.isDestroyed()) {
                moreInfoWindow.close();
            }
        });
    });

    moreInfoWindow.on('close', () => {
        destroyWindow();
    });

    moreInfoWindow.on('closed', () => {
        destroyWindow();
    });
}

/**
 * Destroys a window
 */
function destroyWindow() {
    moreInfoWindow = null;
}


module.exports = {
    openMoreInfoWindow: openMoreInfoWindow
};
