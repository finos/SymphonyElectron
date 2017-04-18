'use strict';

const electron = require('electron');
const app = electron.app;
const path = require('path');
const nodeURL = require('url');

const menuTemplate = require('./menus/menuTemplate.js');
const loadErrors = require('./dialogs/showLoadError.js');
const { isMac } = require('./utils/misc.js');
const getGuid = require('./utils/getGuid.js');
const log = require('./log.js')
const logLevels = require('./enums/logLevels.js');
const notify = require('./notify/electron-notify.js');

//context menu
const contextMenu = require('./menus/contextMenu.js');

// show dialog when certificate errors occur
require('./dialogs/showCertError.js');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let windows = {};
let willQuitApp = false;
let isOnline = true;

// note: this file is built using browserify in prebuild step.
const preloadMainScript = path.join(__dirname, 'preload/_preloadMain.js');

function addWindowKey(key, browserWin) {
    windows[ key ] = browserWin;
}

function removeWindowKey(key) {
    delete windows[ key ];
}

function getHostFromUrl(url) {
    let parsedUrl = nodeURL.parse(url);
    let UrlHost = parsedUrl.host;
    return UrlHost
}

function createMainWindow(initialUrl) {
    let url = initialUrl;
    let key = getGuid();

    let newWinOpts = {
        title: 'Symphony',
        width: 1024, height: 768,
        show: true,
        webPreferences: {
            sandbox: true,
            nodeIntegration: false,
            preload: preloadMainScript,

        }
    };

    // note: augmenting with some custom values
    newWinOpts.winKey = key;

    mainWindow = new electron.BrowserWindow(newWinOpts);
    mainWindow.winName = 'main';

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
        url = mainWindow.webContents.getURL();

        if (!isOnline) {
            loadErrors.showNetworkConnectivityError(mainWindow, url, retry);
        } else {
            // removes all existing notifications when main window reloads
            notify.reset();
            log.send(logLevels.INFO, 'main window loaded url: ' + url);
        }
    });

    mainWindow.webContents.on('did-fail-load', function(event, errorCode,
        errorDesc, validatedURL) {
        loadErrors.showLoadFailure(mainWindow, validatedURL, errorDesc, errorCode, retry);
    });

    addWindowKey(key, mainWindow);
    mainWindow.loadURL(url);

    const menu = electron.Menu.buildFromTemplate(menuTemplate(app));
    electron.Menu.setApplicationMenu(menu);

    mainWindow.on('close', function(e) {
        if (willQuitApp) {
            destroyAllWindows();
            return;
        }
        // mac should hide window when hitting x close
        if (isMac) {
            mainWindow.hide();
            e.preventDefault();
        }
    });

    function destroyAllWindows() {
        var keys = Object.keys(windows);
        for(var i = 0, len = keys.length; i < len; i++) {
            let winKey = keys[i];
            removeWindowKey(winKey);
        }

        mainWindow = null;
    }

    mainWindow.on('closed', destroyAllWindows);

    // open external links in default browser - a tag, window.open
    mainWindow.webContents.on('new-window', function(event, newWinUrl,
        frameName, disposition, newWinOptions) {
        let newWinHost = getHostFromUrl(newWinUrl);
        let mainWinHost = getHostFromUrl(url);

        // if host url doesn't match then open in external browser
        if (newWinHost !== mainWinHost) {
            event.preventDefault();
            electron.shell.openExternal(newWinUrl);
        } else if (disposition === 'foreground-tab' ||
            disposition === 'new-window') {
            // handle: window.open

            if (!frameName) {
                // abort - no frame name provided.
                return;
            }
            // reposition new window
            var mainWinPos = mainWindow.getPosition();
            if (mainWinPos && mainWinPos.length === 2) {
                let newWinKey = getGuid();

                /* eslint-disable no-param-reassign */
                newWinOptions.x = mainWinPos[0] + 50;
                newWinOptions.y = mainWinPos[1] + 50;

                newWinOptions.winKey = newWinKey;
                /* eslint-enable no-param-reassign */

                // note: will use code below later for saved layout impl.
                var webContents = newWinOptions.webContents;
                webContents.once('did-finish-load', function() {

                    var browserWin = electron.BrowserWindow.fromWebContents(webContents);
                    browserWin.winName = frameName;

                    addWindowKey(newWinKey, browserWin);

                    browserWin.once('close', function() {
                        removeWindowKey(newWinKey);
                    });

                    // note: will use later for save-layout feature
                    // browserWin.on('move', function() {
                    //     var newPos = browserWin.getPosition();
                    //     console.log('new pos=', newPos)
                    // });
                    // browserWin.on('resize', function() {
                    //     var newSize = browserWin.getSize();
                    //     console.log('new size=', newSize)
                    // });
                });
            }
        }
    });

    contextMenu(mainWindow);
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

function setIsOnline(status) {
    isOnline = status;
}

function activate(windowName) {
    var keys = Object.keys(windows);
    for(var i = 0, len = keys.length; i < len; i++) {
        var window = windows[keys[i]];
        if (window.winName === windowName) {
            window.show();
            return;
        }
    }
}

module.exports = {
    createMainWindow: createMainWindow,
    getMainWindow: getMainWindow,
    showMainWindow: showMainWindow,
    isMainWindow: isMainWindow,
    hasWindow: hasWindow,
    setIsOnline: setIsOnline,
    activate: activate
};
