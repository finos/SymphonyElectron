'use strict';

// Third Party Dependencies
const electron = require('electron');
const app = electron.app;
const crashReporter = electron.crashReporter;
const nodeURL = require('url');
const squirrelStartup = require('electron-squirrel-startup');
const AutoLaunch = require('auto-launch');
const urlParser = require('url');

// Local Dependencies
const {getConfigField, updateUserConfigWin, updateUserConfigMac} = require('./config.js');
const { isMac, isDevEnv } = require('./utils/misc.js');
const protocolHandler = require('./protocolHandler');
const getCmdLineArg = require('./utils/getCmdLineArg.js');

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

crashReporter.start({companyName: 'Symphony', submitURL: 'http://localhost:3000', uploadToServer: false, extra: {'process': 'main'}});

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

let symphonyAutoLauncher;

if (isMac) {
    symphonyAutoLauncher = new AutoLaunch({
        name: 'Symphony',
        mac: {
            useLaunchAgent: true,
        },
        path: process.execPath,
    });
} else {
    symphonyAutoLauncher = new AutoLaunch({
        name: 'Symphony',
        path: process.execPath,
    });
}

/**
 * This method will be called when Electron has finished
 * initialization and is ready to create browser windows.
 * Some APIs can only be used after this event occurs.
 */
app.on('ready', setupThenOpenMainWindow);

/**
 * Is triggered when all the windows are closed
 * In which case we quit the app
 */
app.on('window-all-closed', function() {
    app.quit();
});

/**
 * Is triggered when the app is up & running
 */
app.on('activate', function() {
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

/**
 * This event is emitted only on macOS
 * at this moment, support for windows
 * is in pipeline (https://github.com/electron/electron/pull/8052)
 */
app.on('open-url', function(event, url) {
    handleProtocolAction(url);
});

/**
 * Sets up the app (to handle various things like config changes, protocol handling etc.)
 * and opens the main window
 */
function setupThenOpenMainWindow() {

    processProtocolAction(process.argv);

    isAppAlreadyOpen = true;

    // allows installer to launch app and set appropriate global / user config params.
    let hasInstallFlag = getCmdLineArg(process.argv, '--install', true);
    let perUserInstall = getCmdLineArg(process.argv, '--peruser', true);
    if (!isMac && hasInstallFlag) {
        getConfigField('launchOnStartup')
            .then(setStartup)
            .then(() => updateUserConfigWin(perUserInstall))
            .then(app.quit)
            .catch(app.quit);
        return;
    }

    // allows mac installer to overwrite user config
    if (isMac && hasInstallFlag) {
        // This value is being sent from post install script
        // as the app is launched as a root user we don't get
        // access to the config file
        let launchOnStartup = process.argv[3];
        // We wire this in via the post install script
        // to get the config file path where the app is installed
        let appGlobalConfigPath = process.argv[2];
        setStartup(launchOnStartup)
            .then(() => updateUserConfigMac(appGlobalConfigPath))
            .then(app.quit)
            .catch(app.quit);
        return;
    }

    getUrlAndCreateMainWindow();

    // Event that fixes the remote desktop issue in Windows
    // by repositioning the browser window
    electron.screen.on('display-removed', windowMgr.verifyDisplays);
}

/**
 * Sets Symphony on startup
 * @param lStartup
 * @returns {Promise}
 */
function setStartup(lStartup) {
    return symphonyAutoLauncher.isEnabled()
        .then(function(isEnabled) {
            if (!isEnabled && lStartup) {
                return symphonyAutoLauncher.enable();
            }

            if (isEnabled && !lStartup) {
                return symphonyAutoLauncher.disable();
            }

            return true;
        });
}

/**
 * Checks for the url argument, processes it
 * and creates the main window
 */
function getUrlAndCreateMainWindow() {
    // for dev env allow passing url argument
    if (isDevEnv) {
        let url = getCmdLineArg(process.argv, '--url=', false);
        if (url) {
            windowMgr.createMainWindow(url.substr(6));
            return;
        }
    }

    getConfigField('url')
        .then(createWin).catch(function(err) {
            let title = 'Error loading configuration';
            electron.dialog.showErrorBox(title, title + ': ' + err);
        });
}

/**
 * Creates a window
 * @param urlFromConfig
 */
function createWin(urlFromConfig) {
    let protocol = '';
    // add https protocol if none found.
    let parsedUrl = nodeURL.parse(urlFromConfig);
    if (!parsedUrl.protocol) {
        protocol = 'https';
    }
    let url = nodeURL.format({
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

    let protocolUri = getCmdLineArg(argv, 'symphony://', false);

    if (protocolUri) {

        const parsedURL = urlParser.parse(protocolUri);

        if (!parsedURL.protocol || !parsedURL.slashes) {
            return;
        }

        handleProtocolAction(protocolUri);

    }
}

/**
 * Handles a protocol action based on the current state of the app
 * @param uri
 */
function handleProtocolAction(uri) {
    if (!isAppAlreadyOpen) {
        // app is opened by the protocol url, cache the protocol url to be used later
        protocolHandler.setProtocolUrl(uri);
    } else {
        // app is already open, so, just trigger the protocol action method
        protocolHandler.processProtocolAction(uri);
    }
}