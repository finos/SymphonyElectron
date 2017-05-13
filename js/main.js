'use strict';

const electron = require('electron');
const app = electron.app;
const nodeURL = require('url');
const squirrelStartup = require('electron-squirrel-startup');
const AutoLaunch = require('auto-launch');
const urlParser = require('url');
const {getConfigField} = require('./config.js');
const {isMac, isDevEnv} = require('./utils/misc.js');
const protocolHandler = require('./protocolHandler');

// used to check if a url was opened when the app was already open
let isAppAlreadyOpen = false;

// exit early for squirrel installer
if (squirrelStartup) {
    return;
}

require('./mainApiMgr.js');

// monitor memory of main process
require('./memoryMonitor.js');

const windowMgr = require('./windowMgr.js');

// only allow a single instance of app.
const shouldQuit = app.makeSingleInstance((argv) => {
    // Someone tried to run a second instance, we should focus our window.
    let mainWin = windowMgr.getMainWindow();
    if (mainWin) {
        isAppAlreadyOpen = true;
        if (mainWin.isMinimized()) {
            mainWin.restore();
        }
        mainWin.focus();
    }
    processProtocolAction(argv);
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

function getUrlAndOpenMainWindow() {

    processProtocolAction(process.argv);

    isAppAlreadyOpen = true;

    // for dev env allow passing url argument
    let installMode = false;

    process.argv.some((val) => {

        let flag = '--install';
        if (val === flag) {
            installMode = true;
            getConfigField('launchOnStartup')
            .then(setStartup)
            .then(app.quit)
            .catch(app.quit);
        }

        return false;
    });

    if (installMode === false) {
        openMainWindow();
    }
}

function setStartup(lStartup){
    return symphonyAutoLauncher.isEnabled()
    .then(function(isEnabled){
        if (!isEnabled && lStartup) {
            return symphonyAutoLauncher.enable();
        }

        if (isEnabled && !lStartup) {
            return symphonyAutoLauncher.disable();
        }

        return true;
    });
}

function openMainWindow() {
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

/**
 * processes protocol action for windows clients
 * @param argv {Array} an array of command line arguments
 */
function processProtocolAction(argv) {

    // In case of windows, we need to handle protocol handler
    // manually because electron doesn't emit
    // 'open-url' event on windows
    if (!(process.platform === 'win32')) {
        return;
    }

    let protocolUri;

    for (let i = 0; i < argv.length; i++) {

        if (argv[i].startsWith("symphony://")) {
            protocolUri = argv[i];
            break;
        }

    }

    if (protocolUri) {

        const parsedURL = urlParser.parse(protocolUri);

        if (!parsedURL.protocol || !parsedURL.slashes) {
            return;
        }

        handleProtocolAction(protocolUri);

    }
}

function handleProtocolAction(uri) {
    if (!isAppAlreadyOpen) {
        // app is opened by the protocol url, cache the protocol url to be used later
        protocolHandler.setProtocolUrl(uri);
    } else {
        // app is already open, so, just trigger the protocol action method
        protocolHandler.processProtocolAction(uri);
    }
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

// adds 'symphony' as a protocol
// in the system. plist file in macOS
// and registry keys in windows
app.setAsDefaultProtocolClient('symphony');

// This event is emitted only on macOS
// at this moment, support for windows
// is in pipeline (https://github.com/electron/electron/pull/8052)
app.on('open-url', function (event, url) {
    handleProtocolAction(url);
});
