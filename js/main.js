'use strict';

const electron = require('electron');
const app = electron.app;
const nodeURL = require('url');
const squirrelStartup = require('electron-squirrel-startup');

const { getConfigField } = require('./config.js');
const { isMac, isDevEnv } = require('./utils/misc.js');
const protocolHandler = require('./protocolHandler');


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
    // for dev env allow passing url argument
    if (isDevEnv) {
        let url;
        process.argv.forEach((val) => {
            if (val.startsWith('--url=')) {
                url = val.substr(6);
            }
        });
        if (url) {
            windowMgr.createMainWindow(url);
            return;
        }
    }

    getConfigField('url')
    .then(createWin).catch(function (err){
        let title = 'Error loading configuration';
        electron.dialog.showErrorBox(title, title + ': ' + err);
    });
}

function createWin(urlFromConfig){
    let protocol = '';
    // add https protocol if none found.
    let parsedUrl = nodeURL.parse(urlFromConfig);
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

app.setAsDefaultProtocolClient('symphony');

app.on('open-url', function (event, url) {
    protocolHandler.processProtocolAction(url);
});