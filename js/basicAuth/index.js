'use strict';

const electron = require('electron');
const BrowserWindow = electron.BrowserWindow;
const ipc = electron.ipcMain;
const path = require('path');
const fs = require('fs');
const log = require('../log.js');
const logLevels = require('../enums/logLevels.js');
const { isMac } = require('../utils/misc');
const { initCrashReporterMain, initCrashReporterRenderer } = require('../crashReporter.js');
const i18n = require('../translation/i18n');

let basicAuthWindow;

const local = {};

let windowConfig = {
    width: 360,
    height: isMac ? 270 : 295,
    show: false,
    modal: true,
    autoHideMenuBar: true,
    titleBarStyle: true,
    resizable: false,
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
 * @param {boolean} isValidCredentials - false if invalid username or password
 * @param {Function} clearSettings
 * @param {Function} callback
 */
function openBasicAuthWindow(windowName, hostname, isValidCredentials, clearSettings, callback) {

    // Register callback function
    if (typeof callback === 'function') {
        local.authCallback = callback;
    }
    // Register close function
    if (typeof clearSettings === 'function') {
        local.clearSettings = clearSettings;
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
        const basicAuthContent = i18n.getMessageFor('BasicAuth');
        basicAuthWindow.webContents.send('i18n-basic-auth', basicAuthContent);
        // initialize crash reporter
        initCrashReporterMain({ process: 'basic auth window' });
        initCrashReporterRenderer(basicAuthWindow, { process: 'render | basic auth window' });
        basicAuthWindow.webContents.send('hostname', hostname);
        basicAuthWindow.webContents.send('isValidCredentials', isValidCredentials);
        if (!isMac) {
            // prevents from displaying menu items when "alt" key is pressed
            basicAuthWindow.setMenu(null);
        }
    });

    basicAuthWindow.webContents.on('crashed', function (event, killed) {

        log.send(logLevels.INFO, `Basic Auth Window crashed! Killed? ${killed}`);

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
            closeAuthWindow(true);
        });
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
        closeAuthWindow(false);
    }
});

ipc.on('close-basic-auth', () => {
    closeAuthWindow(true);
});

/**
 * Destroys a window
 */
function destroyWindow() {
    basicAuthWindow = null;
}

/**
 * Method to close the auth window
 * @param {boolean} clearSettings - Whether to clear the auth settings
 */
function closeAuthWindow(clearSettings) {
    if (clearSettings && typeof local.clearSettings === 'function') {
        local.clearSettings();
    }

    if (basicAuthWindow) {
        basicAuthWindow.close();
    }
}

module.exports = {
    openBasicAuthWindow: openBasicAuthWindow
};
