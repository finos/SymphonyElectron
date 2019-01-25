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

let aboutWindow;

let windowConfig = {
    width: 350,
    height: 260,
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
    let templatePath = path.join(__dirname, 'about-app.html');
    try {
        fs.statSync(templatePath).isFile();
    } catch (err) {
        log.send(logLevels.ERROR, 'about-window: Could not find template ("' + templatePath + '").');
    }
    return 'file://' + templatePath;
}

/**
 * Opens the about application window for a specific window
 * @param {String} windowName - name of the window upon
 * which this window should show
 */
function openAboutWindow(windowName) {

    // This prevents creating multiple instances of the
    // about window
    if (aboutWindow) {
        if (aboutWindow.isMinimized()) {
            aboutWindow.restore();
        }
        aboutWindow.focus();
        return;
    }
    let allWindows = BrowserWindow.getAllWindows();
    allWindows = allWindows.find((window) => { return window.winName === windowName });

    // if we couldn't find any window matching the window name
    // it will render as a new window
    if (allWindows) {
        windowConfig.parent = allWindows;
    }

    aboutWindow = new BrowserWindow(windowConfig);
    aboutWindow.setVisibleOnAllWorkspaces(true);
    aboutWindow.loadURL(getTemplatePath());

    // sets the AlwaysOnTop property for the about window
    // if the main window's AlwaysOnTop is true
    let focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow && focusedWindow.isAlwaysOnTop()) {
        aboutWindow.setAlwaysOnTop(true);
    }

    aboutWindow.once('ready-to-show', () => {
        aboutWindow.show();
    });

    aboutWindow.webContents.on('did-finish-load', () => {
        // initialize crash reporter
        initCrashReporterMain({ process: 'about app window' });
        initCrashReporterRenderer(aboutWindow, { process: 'render | about app window' });
        aboutWindow.webContents.send('versionInfo', { 
            version,
            clientVersion,
            buildNumber,
            i18n: i18n.getMessageFor('AboutSymphony')
        });
        if (!isMac) {
            // prevents from displaying menu items when "alt" key is pressed
            aboutWindow.setMenu(null);
        }
    });

    aboutWindow.webContents.on('crashed', function (event, killed) {

        log.send(logLevels.INFO, `About Window crashed! Killed? ${killed}`);

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
            if (aboutWindow && !aboutWindow.isDestroyed()) {
                aboutWindow.close();
            }
        });
    });

    aboutWindow.on('close', () => {
        destroyWindow();
    });

    aboutWindow.on('closed', () => {
        destroyWindow();
    });
}

/**
 * Destroys a window
 */
function destroyWindow() {
    aboutWindow = null;
}


module.exports = {
    openAboutWindow: openAboutWindow
};
