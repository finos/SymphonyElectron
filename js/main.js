'use strict';

const electron = require('electron');
const app = electron.app;
const nodeURL = require('url');
const squirrelStartup = require('electron-squirrel-startup');
const AutoLaunch = require('auto-launch');
const { getConfigField } = require('./config.js');
const { isMac, isDevEnv } = require('./utils/misc.js');

const crashReporter = require('./crashReporter');
require('electron-dl')();

// exit early for squirrel installer
if (squirrelStartup) {
    return;
}

require('./mainApiMgr.js');

// monitor memory of main process
require('./memoryMonitor.js');

const windowMgr = require('./windowMgr.js');

// only allow a single instance of app.
const shouldQuit = app.makeSingleInstance(() => {
    // Someone tried to run a second instance, we should focus our window.
    let mainWin = windowMgr.getMainWindow();
    if (mainWin) {
        if (mainWin.isMinimized()) {
            mainWin.restore();
        }
        mainWin.focus();
    }
});

// quit if another instance is already running
if (shouldQuit) {
    app.quit();
}

var symphonyAutoLauncher = new AutoLaunch({
    name: 'Symphony',
    path: process.execPath,
});

/**
 * This method will be called when Electron has finished
 * initialization and is ready to create browser windows.
 * Some APIs can only be used after this event occurs.
 */
app.on('ready', getUrlAndOpenMainWindow);

/**
 * Get crash info from global config and setup crash reporter for Main Process.
 */
function initializeCrashReporter () {
    getConfigField('sendCrashReports').then(
      function (data) {
          crashReporter.setupCrashReporter({'window': 'main'}, data);
      }
    ).catch(function (err) {
        let title = 'Error loading configuration';
        electron.dialog.showErrorBox(title, title + ': ' + err);
    })
}

function getUrlAndOpenMainWindow() {
    let installMode = false;
    
    process.argv.some((val) => {
        let flag = '--install';
        if (val === flag) {
            installMode = true;
            getConfigField('launchOnStartup')
            .then(setStartup);
        }

        return false;
    });

    if (installMode === false){
        openMainWindow();
    }
}

function setStartup(lStartup){
    if (lStartup === true){
        symphonyAutoLauncher.isEnabled()
        .then(function(isEnabled){
            if(isEnabled){
                app.quit();
            }
            symphonyAutoLauncher.enable()
            .then(function (){
                app.quit();
            });
        })
    } else{
        symphonyAutoLauncher.isEnabled()
        .then(function(isEnabled){
            if(isEnabled){
                symphonyAutoLauncher.disable()
                .then(function (){
                    app.quit();
                });
            } else{
                app.quit();
            }
        })
    }
}

function openMainWindow(){
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
        .then(createWin).catch(function (err) {
            let title = 'Error loading configuration';
            electron.dialog.showErrorBox(title, title + ': ' + err);
        });
}

function createWin(urlFromConfig) {
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

app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (!isMac) {
        app.quit();
    }
});

app.on('activate', function () {
    if (windowMgr.isMainWindow(null)) {
        getUrlAndOpenMainWindow();
    } else {
        windowMgr.showMainWindow();
    }
});

// Initialize the crash reporter
initializeCrashReporter();