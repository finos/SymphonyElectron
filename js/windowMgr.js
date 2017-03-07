'use strict';

const electron = require('electron');
const app = electron.app;
const path = require('path');

const menuTemplate = require('./menuTemplate.js');
const loadErrors = require('./dialogs/showLoadError.js');
const { isMac, getGuid } = require('./utils.js');
const log = require('./log.js')
const logLevels = require('./enums/logLevels.js');

// show dialog when certificate errors occur
require('./dialogs/showCertError.js');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let windows = {};
let willQuitApp = false;
let isOnline = true;
const preloadScript = path.join(__dirname, '/RendererPreload.js');

function addWindowKey(key, browserWin) {
    windows[ key ] = browserWin;
}

function removeWindowKey(key) {
    delete windows[ key ];
}

function createMainWindow(url) {
    let key = getGuid();

    mainWindow = new electron.BrowserWindow({
        title: 'Symphony',
        width: 1024, height: 768,
        show: true,
        webPreferences: {
            sandbox: true,
            nodeIntegration: false,
            preload: preloadScript,
            winKey: key
        }
    });

    function retry() {
        if (!isOnline) {
            loadErrors.showNetworkConnectivityError(mainWindow, url, retry);
            return;
        }

        if (mainWindow.webContents) {
            mainWindow.webContents.reload();
        }
    }

    // content can be cached and will still finish load but
    // we might not have netowrk connectivity, so warn the user.
    mainWindow.webContents.on('did-finish-load', function() {
        if (!isOnline) {
            loadErrors.showNetworkConnectivityError(mainWindow, url, retry);
        } else {
            log.send(logLevels.INFO, 'main window loaded');
        }
    });

    mainWindow.webContents.on('did-fail-load', function(event, errorCode,
        errorDesc) {
        loadErrors.showLoadFailure(mainWindow, url, errorDesc, errorCode, retry);
    });

    addWindowKey(key, mainWindow);
    mainWindow.loadURL(url);

    const menu = electron.Menu.buildFromTemplate(menuTemplate(app));
    electron.Menu.setApplicationMenu(menu);

    mainWindow.on('close', function(e) {
        if (willQuitApp) {
            destroyMainWindow();
            return;
        }
        // mac should hide window when hitting x close
        if (isMac) {
            mainWindow.hide();
            e.preventDefault();
        }
    });

    function destroyMainWindow() {
        removeWindowKey(key);
        if (mainWindow) {
            mainWindow.removeAllListeners();
            if (mainWindow.webContents) {
                mainWindow.webContents.removeAllListeners();
            }
            mainWindow = null;
        }
    }

    mainWindow.on('closed', destroyMainWindow);

    // open external links in default browser - window.open
    mainWindow.webContents.on('new-window', function(event, newWinUrl) {
        event.preventDefault();
        electron.shell.openExternal(newWinUrl);
    });
}

app.on('before-quit', function() {
    willQuitApp = true;
});

function getMainWindow() {
    return mainWindow;
}

function showMainWindow() {
    mainWindow.show();
}

function isMainWindow(win) {
    return mainWindow === win;
}

function hasWindow(win, winKey) {
    if (win instanceof electron.BrowserWindow) {
        let browserWin = windows[ winKey ];
        return browserWin && win === browserWin;
    }

    return false;
}

function createChildWindow(url, title, width, height) {
    let winKey = getGuid();

    let childWindow = new electron.BrowserWindow({
        title: title,
        width: width,
        height: height,
        webPreferences: {
            sandbox: true,
            nodeIntegration: false,
            preload: preloadScript,
            winKey: winKey
        }
    });

    addWindowKey(winKey, childWindow);
    childWindow.loadURL(url);

    childWindow.on('closed', function() {
        removeWindowKey(winKey);
        if (childWindow) {
            childWindow.removeAllListeners();
            if (childWindow.webContents) {
                childWindow.webContents.removeAllListeners();
            }
        }
    });
}

function setIsOnline(status) {
    isOnline = status;
}

module.exports = {
    createMainWindow: createMainWindow,
    getMainWindow: getMainWindow,
    showMainWindow: showMainWindow,
    isMainWindow: isMainWindow,
    hasWindow: hasWindow,
    createChildWindow: createChildWindow,
    setIsOnline: setIsOnline
};
