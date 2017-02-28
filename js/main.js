'use strict';

const electron = require('electron');
const packageJSON = require('../package.json');
const menuTemplate = require('./menuTemplate.js');
const path = require('path');
const app = electron.app;
const nodeURL = require('url');
const getConfig = require('./getConfig.js');
const { isMac, isDevEnv, getGuid } = require('./utils.js');
const loadErrors = require('./dialogs/showLoadError.js');

// show dialog when certificate errors occur
require('./dialogs/showCertError.js');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let windows = {};
let willQuitApp = false;
let isOnline = true;

if (require('electron-squirrel-startup')) {
    return;
}

function createMainWindow (url) {
    let key = getGuid();

    mainWindow = new electron.BrowserWindow({
        title: 'Symphony',
        width: 1024, height: 768,
        show: true,
        webPreferences: {
            sandbox: true,
            nodeIntegration: false,
            preload: path.join(__dirname, '/preload.js'),
            winKey: key
        }
    });

    function retry() {
        if (isOnline) {
            mainWindow.webContents && mainWindow.webContents.reload();
        } else {
            loadErrors.showNetworkConnectivityError(mainWindow, url, retry);
        }
    }

    // content can be cached and will still finish load but
    // we might not have netowrk connectivity, so warn the user.
    mainWindow.webContents.once('did-finish-load', function() {
        if (!isOnline) {
            loadErrors.showNetworkConnectivityError(mainWindow, url, retry);
        }
    });

    mainWindow.webContents.once('did-fail-load', function(event, errorCode,
        errorDesc, validatedURL, isMainFrame) {
        loadErrors.showLoadFailure(mainWindow, url, errorDesc, errorCode, retry);
    });

    storeWindowKey(key, mainWindow);
    mainWindow.loadURL(url);

    const menu = electron.Menu.buildFromTemplate(menuTemplate(app));
    electron.Menu.setApplicationMenu(menu);

    mainWindow.on('close', function(e) {
        if (willQuitApp) {
            mainWindow = null;
            return;
        }
        // mac should hide window when hitting x close
        if (isMac) {
            mainWindow.hide();
            e.preventDefault();
        }
    });

    mainWindow.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });

    // open external links in default browser - window.open
    mainWindow.webContents.on('new-window', function(event, url) {
        event.preventDefault();
        electron.shell.openExternal(url);
    });
}

function storeWindowKey(key, browserWin) {
    windows[key] = browserWin;
}

/**
 * Ensure events comes from a window that we have created.
 * @param  {EventEmitter} event  node emitter event to be tested
 * @return {Boolean} returns true if exists otherwise false
 */
function isValidWindow(event) {
    if (event && event.sender) {
        // validate that event sender is from window we created
        let browserWin = electron.BrowserWindow.fromWebContents(event.sender);
        let winKey = event.sender.browserWindowOptions &&
            event.sender.browserWindowOptions.webPreferences &&
            event.sender.browserWindowOptions.webPreferences.winKey;

        if (browserWin instanceof electron.BrowserWindow) {
            let win = windows[winKey];
            return win && win === browserWin;
        }
    }

    return false;
}

/**
 * Only permit certain cmds for some windows
 * @param  {EventEmitter} event  node emitter event to be tested
 * @param  {String}  cmd   cmd name
 * @return {Boolean}       true if cmd is allowed for window, otherwise false
 */
function isCmdAllowed(event, cmd) {
    if (event && event.sender && cmd) {
        // validate that event sender is from window we created
        let browserWin = electron.BrowserWindow.fromWebContents(event.sender);

        if (browserWin === mainWindow) {
            // allow all commands for main window
            return true;
        } else {
            // allow only certain cmds for child windows
            // e.g., open cmd not allowed for child windows
            return (arg.cmd !== 'open');
        }
    }

    return false;
}

/**
 * Handle ipc messages from renderers. Only messages from windows we have
 * created are allowed.
 */
electron.ipcMain.on('symphony-msg', (event, arg) => {
    if (!isValidWindow(event)) {
        console.log('invalid window try to perform action, ignoring action.');
        return;
    }

    if (!isCmdAllowed(event, arg && arg.cmd)) {
        console.log('cmd not allowed for this window: ' + arg.cmd);
        return;
    }

    if (arg && arg.cmd === 'isOnline') {
        isOnline = arg.isOnline;
        return;
    }

    if (arg && arg.cmd === 'open' && arg.url) {
        let width = arg.width || 1024;
        let height = arg.height || 768;
        let title = arg.title || 'Symphony';
        let winKey = getGuid();

        let childWindow = new electron.BrowserWindow({
            title: title,
            width: width,
            height: height,
            webPreferences: {
                sandbox: true,
                nodeIntegration: false,
                preload: path.join(__dirname, '/preload.js'),
                winKey: winKey
            }
        });

        storeWindowKey(winKey, childWindow);
        childWindow.loadURL(arg.url);
        return;
    }
});

/**
 * This method will be called when Electron has finished
 * initialization and is ready to create browser windows.
 * Some APIs can only be used after this event occurs.
 */
app.on('ready', getUrlAndOpenMainWindow);

function getUrlAndOpenMainWindow() {
    getConfig().then(function(config) {
        let protocol = '';
        // add https protocol if none found.
        let parsedUrl = nodeURL.parse(config.url);
        if (!parsedUrl.protocol) {
            protocol = 'https';
        }
        var url = nodeURL.format({
            protocol: protocol,
            slahes: true,
            pathname: parsedUrl.href
        });
        createMainWindow(url);
    }).catch(function(err) {
        let title = 'Error loading configuration';
        electron.dialog.showErrorBox(title, title + ': ' + err);
    });
}

app.on('before-quit', function() {
    willQuitApp = true;
});

app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (!isMac) {
        app.quit();
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        getUrlAndOpenMainWindow();
    } else {
        mainWindow.show();
    }
});
