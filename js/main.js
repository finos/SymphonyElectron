'use strict';

const electron = require('electron');
const app = electron.app;
const nodeURL = require('url');
const squirrelStartup = require('electron-squirrel-startup');
const AutoLaunch = require('auto-launch');
const urlParser = require('url');
const { getConfigField } = require('./config.js');
const { isMac, isDevEnv } = require('./utils/misc.js');
const protocolHandler = require('./protocolHandler');
const getCmdLineArg = require('./utils/getCmdLineArg.js');
const childProcess = require('child_process');
const path = require('path');
const AppDirectory = require('appdirectory');
const dirs = new AppDirectory('Symphony');

require('electron-dl')();

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

// quit if another instance is already running, ignore for dev env
if (!isDevEnv && shouldQuit) {
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
app.on('ready', setupThenOpenMainWindow);

app.on('window-all-closed', function () {
    app.quit();
});

app.on('activate', function () {
    if (windowMgr.isMainWindow(null)) {
        setupThenOpenMainWindow();
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

function setupThenOpenMainWindow() {

    processProtocolAction(process.argv);

    isAppAlreadyOpen = true;

    // allows installer to launch app and set auto startup mode then
    // immediately quit.
    let hasInstallFlag = getCmdLineArg(process.argv, '--install', true);
    if (!isMac && hasInstallFlag) {
        getConfigField('launchOnStartup')
            .then(setStartup)
            .then(updateUserConfigWin)
            .then(app.quit)
            .catch(app.quit);
        return;
    }

    // allows mac installer to overwrite user config
    if (isMac && hasInstallFlag) {
        updateUserConfigMac()
            .then(app.quit)
            .catch(app.quit);
        return;
    }

    getUrlAndCreateMainWindow();

    // Event that fixes the remote desktop issue in Windows
    // by repositioning the browser window
    electron.screen.on('display-removed', windowMgr.verifyDisplays);
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

// Method to overwrite user config on mac installer
function updateUserConfigMac() {
    return new Promise((resolve, reject) => {
        let userConfigPath = dirs.userConfig() + '/';
        let globalConfigPath = process.argv[2];
        let userName = process.env.USER;

        childProcess.exec(`rsync -r "${globalConfigPath}" "${userConfigPath}" && chown -R "${userName}" "${userConfigPath}"`, {timeout: 60000}, (err) => {
            if (err) {
                reject(err);
            }
            resolve();
        });
    });
}

// Method to overwrite user config on windows installer
function updateUserConfigWin() {
    return new Promise((resolve, reject) => {
        let userConfigPath = app.getPath('userData');
        let globalConfigPath = path.join(__dirname, '..', '..', '..', 'config/Symphony.config');

        childProcess.exec(`echo D|xcopy /y /e /s /c "${globalConfigPath}" "${userConfigPath}"`, {timeout: 60000}, (err) => {
            if (err) {
                reject(err);
            }
            resolve();
        });
    });
}

function getUrlAndCreateMainWindow() {
    // for dev env allow passing url argument
    if (isDevEnv) {
        let url = getCmdLineArg(process.argv, '--url=')
        if (url) {
            windowMgr.createMainWindow(url.substr(6));
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

    let protocolUri = getCmdLineArg(argv, 'symphony://');

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
