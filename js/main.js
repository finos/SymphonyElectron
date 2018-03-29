'use strict';

// Third Party Dependencies
const electron = require('electron');
const app = electron.app;
const crashReporter = electron.crashReporter;
const nodeURL = require('url');
const shellPath = require('shell-path');
const squirrelStartup = require('electron-squirrel-startup');
const AutoLaunch = require('auto-launch');
const urlParser = require('url');

// Local Dependencies
const {getConfigField, updateUserConfigWin, updateUserConfigMac, readConfigFileSync} = require('./config.js');
const {setCheckboxValues} = require('./menus/menuTemplate.js');
const { isMac, isDevEnv } = require('./utils/misc.js');
const protocolHandler = require('./protocolHandler');
const getCmdLineArg = require('./utils/getCmdLineArg.js');
const log = require('./log.js');
const logLevels = require('./enums/logLevels.js');
const { deleteIndexFolder } = require('./search/search.js');

require('electron-dl')();

// ELECTRON-261: On Windows, due to gpu issues, we need to disable gpu
// to ensure screen sharing works effectively with multiple monitors
// https://github.com/electron/electron/issues/4380

//setting the env path child_process issue https://github.com/electron/electron/issues/7688
shellPath()
    .then((path) => {
        process.env.PATH = path
    })
    .catch(() => {
        process.env.PATH = [
            './node_modules/.bin',
            '/usr/local/bin',
            process.env.PATH
        ].join(':');
    });

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

getConfigField('url')
.then(initializeCrashReporter)
.catch(app.quit);

function initializeCrashReporter(podUrl) {

    getConfigField('crashReporter')
    .then((crashReporterConfig) => {
        crashReporter.start({companyName: crashReporterConfig.companyName, submitURL: crashReporterConfig.submitURL, uploadToServer: crashReporterConfig.uploadToServer, extra: {'process': 'main', podUrl: podUrl}});
        log.send(logLevels.INFO, 'initialized crash reporter on the main process!');
    })
    .catch((err) => {
        log.send(logLevels.ERROR, 'Unable to initialize crash reporter in the main process. Error is -> ' + err);
    });

}

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

let allowMultiInstance = getCmdLineArg(process.argv, '--multiInstance', true) || isDevEnv;

// quit if another instance is already running, ignore for dev env or if app was started with multiInstance flag
if (!allowMultiInstance && shouldQuit) {
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
 * Sets chrome authentication flags in electron
 */
function setChromeFlags() {

    log.send(logLevels.INFO, 'checking if we need to set custom chrome flags!');

    // Read the config parameters synchronously
    let config = readConfigFileSync();

    // If we cannot find any config, just skip setting any flags
    if (config && config !== null && config.customFlags) {

        log.send(logLevels.INFO, 'Chrome flags config found!');

        if (config.customFlags.authServerWhitelist && config.customFlags.authServerWhitelist !== "") {
            log.send(logLevels.INFO, 'Setting auth server whitelist flag');
            app.commandLine.appendSwitch('auth-server-whitelist', config.customFlags.authServerWhitelist);
        }

        if (config.customFlags.authNegotiateDelegateWhitelist && config.customFlags.authNegotiateDelegateWhitelist !== "") {
            log.send(logLevels.INFO, 'Setting auth negotiate delegate whitelist flag');
            app.commandLine.appendSwitch('auth-negotiate-delegate-whitelist', config.customFlags.authNegotiateDelegateWhitelist);
        }

        // ELECTRON-261: Windows 10 Screensharing issues. We set chrome flags
        // to disable gpu which fixes the black screen issue observed on
        // multiple monitors
        if (config.customFlags.disableGpu) {
            log.send(logLevels.INFO, 'Setting disable gpu, gpu compositing and d3d11 flags to true');
            app.commandLine.appendSwitch("disable-gpu", true);
            app.commandLine.appendSwitch("disable-gpu-compositing", true);
            app.commandLine.appendSwitch("disable-d3d11", true);
        }

    }
}

// Set the chrome flags
setChromeFlags();

/**
 * This method will be called when Electron has finished
 * initialization and is ready to create browser windows.
 * Some APIs can only be used after this event occurs.
 */
app.on('ready', readConfigThenOpenMainWindow);

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

app.on('will-quit', function (e) {
    e.preventDefault();
    deleteIndexFolder();
    app.exit();
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
 * Reads the config fields that are required for the menu items
 * then opens the main window
 *
 * This is a workaround for the issue where the menu template was returned
 * even before the config data was populated
 * https://perzoinc.atlassian.net/browse/ELECTRON-154
 */
function readConfigThenOpenMainWindow() {
    setCheckboxValues()
        .then(setupThenOpenMainWindow)
        .catch(setupThenOpenMainWindow)
}

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
    let customDataArg = getCmdLineArg(process.argv, '--userDataPath=', false);

    if (customDataArg && customDataArg.split('=').length > 1) {
        let customDataFolder = customDataArg.split('=')[1];
        app.setPath('userData', customDataFolder);
    }
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
        setStartup(launchOnStartup)
            .then(updateUserConfigMac)
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
    return new Promise((resolve) => {
        let launchOnStartup = (lStartup === 'true');
        if (launchOnStartup) {
            symphonyAutoLauncher.enable();
            return resolve();
        }
        symphonyAutoLauncher.disable();
        return resolve();
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
    // add https protocol if none found.
    let parsedUrl = nodeURL.parse(urlFromConfig);

    if (!parsedUrl.protocol || parsedUrl.protocol !== 'https') {
        parsedUrl.protocol = 'https:';
        parsedUrl.slashes = true
    }
    let url = nodeURL.format(parsedUrl);

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
