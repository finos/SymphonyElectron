'use strict';

const electron = require('electron');
const app = electron.app;
const nodeURL = require('url');
const squirrelStartup = require('electron-squirrel-startup');

const getConfig = require('./getConfig.js');
const { isMac } = require('./utils/misc.js');

// exit early for squirrel installer
if (squirrelStartup) {
    return;
}

require('./mainApiMgr.js');

// monitor memory of main process
require('./memoryMonitor.js');

const windowMgr = require('./windowMgr.js');

/**
 * This method will be called when Electron has finished
 * initialization and is ready to create browser windows.
 * Some APIs can only be used after this event occurs.
 */
app.on('ready', getUrlAndOpenMainWindow);

function getUrlAndOpenMainWindow() {
    getConfig()
    .then(createWin).catch(function (err){
        let title = 'Error loading configuration';
        electron.dialog.showErrorBox(title, title + ': ' + err);            
    });
}

function createWin(config){
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
    windowMgr.createMainWindow(url);
}

app.on('window-all-closed', function() {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (!isMac) {
        app.quit();
    }
});

app.on('activate', function() {
    if (windowMgr.isMainWindow(null)) {
        getUrlAndOpenMainWindow();
    } else {
        windowMgr.showMainWindow();
    }
});
