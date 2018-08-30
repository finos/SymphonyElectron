'use strict';

// Third Party Dependencies
const electron = require('electron');
const app = electron.app;
const crashReporter = electron.crashReporter;
const nodeURL = require('url');
const shellPath = require('shell-path');
const squirrelStartup = require('electron-squirrel-startup');
const urlParser = require('url');
const nodePath = require('path');
const compareSemVersions = require('./utils/compareSemVersions.js');

// Local Dependencies
const {
    getConfigField,
    readConfigFileSync,
    updateUserConfigOnLaunch,
    getUserConfigField
} = require('./config.js');
const { setCheckboxValues } = require('./menus/menuTemplate.js');
const { isMac, isDevEnv } = require('./utils/misc.js');
const protocolHandler = require('./protocolHandler');
const getCmdLineArg = require('./utils/getCmdLineArg.js');
const log = require('./log.js');
const logLevels = require('./enums/logLevels.js');
const autoLaunch = require('./autoLaunch');

require('electron-dl')();

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
            crashReporter.start({ companyName: crashReporterConfig.companyName, submitURL: crashReporterConfig.submitURL, uploadToServer: crashReporterConfig.uploadToServer, extra: { 'process': 'main', podUrl: podUrl } });
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

/**
 * Sets chrome authentication flags in electron
 */
function setChromeFlags() {

    log.send(logLevels.INFO, 'setting chrome flags!');

    // Read the config parameters synchronously
    let config = readConfigFileSync();

    // If we cannot find any config, just skip setting any flags
    if (config && config !== null && config.customFlags) {

        if (config.customFlags.authServerWhitelist && config.customFlags.authServerWhitelist !== "") {
            log.send(logLevels.INFO, 'Setting auth server whitelist flag');
            app.commandLine.appendSwitch('auth-server-whitelist', config.customFlags.authServerWhitelist);
        }

        if (config.customFlags.authNegotiateDelegateWhitelist && config.customFlags.authNegotiateDelegateWhitelist !== "") {
            log.send(logLevels.INFO, 'Setting auth negotiate delegate whitelist flag');
            app.commandLine.appendSwitch('auth-negotiate-delegate-whitelist', config.customFlags.authNegotiateDelegateWhitelist);
        }

        if (config.customFlags.disableGpu) {
            log.send(logLevels.INFO, 'Setting disable gpu, gpu compositing and d3d11 flags to true');
            app.commandLine.appendSwitch("disable-gpu", true);
            app.commandLine.appendSwitch("disable-gpu-compositing", true);
            app.commandLine.appendSwitch("disable-d3d11", true);
        }

    }

    app.commandLine.appendSwitch("disable-background-timer-throttling", true);

    if (isDevEnv) {
        setChromeFlagsFromCommandLine();
    }

}

function setChromeFlagsFromCommandLine() {

    log.send(logLevels.INFO, 'Setting chrome flags from command line arguments!');

    let chromeFlagsFromCmd = getCmdLineArg(process.argv, '--chrome-flags=', false);
    if (!chromeFlagsFromCmd) {
        return;
    }

    let chromeFlagsArgs = chromeFlagsFromCmd.substr(15);
    if (!chromeFlagsArgs) {
        return;
    }

    let flags = chromeFlagsArgs.split(',');
    if (!flags || !Array.isArray(flags)) {
        return;
    }

    for (let key in flags) {

        if (!Object.prototype.hasOwnProperty.call(flags, key)) {
            continue;
        }

        if (!flags[key]) {
            return;
        }

        let flagArray = flags[key].split(':');

        if (flagArray && Array.isArray(flagArray) && flagArray.length > 0) {
            let chromeFlagKey = flagArray[0];
            let chromeFlagValue = flagArray[1];
            log.send(logLevels.INFO, `Setting chrome flag ${chromeFlagKey} to ${chromeFlagValue}`);
            app.commandLine.appendSwitch(chromeFlagKey, chromeFlagValue);
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
app.on('ready', () => {
    checkFirstTimeLaunch()
        .then(readConfigThenOpenMainWindow)
        .catch(readConfigThenOpenMainWindow);
});

/**
 * Is triggered when all the windows are closed
 * In which case we quit the app
 */
app.on('window-all-closed', function () {
    app.quit();
});

/**
 * Is triggered when the app is up & running
 */
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

/**
 * This event is emitted only on macOS
 * at this moment, support for windows
 * is in pipeline (https://github.com/electron/electron/pull/8052)
 */
app.on('open-url', function (event, url) {
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
    getUrlAndCreateMainWindow();

    // Allows a developer to set custom user data path from command line when
    // launching the app. Mostly used for running automation tests with
    // multiple instances
    let customDataArg = getCmdLineArg(process.argv, '--userDataPath=', false);
    let customDataFolder = customDataArg && customDataArg.substring(customDataArg.indexOf('=') + 1);

    if (customDataArg && customDataFolder) {
        app.setPath('userData', customDataFolder);
    }

    // Event that fixes the remote desktop issue in Windows
    // by repositioning the browser window
    electron.screen.on('display-removed', windowMgr.verifyDisplays);

}

function checkFirstTimeLaunch() {
    return getUserConfigField('configVersion')
        .then((configVersion) => {
            const appVersionString = app.getVersion().toString();
            const execPath = nodePath.dirname(app.getPath('exe'));
            const shouldUpdateUserConfig = execPath.indexOf('AppData\\Local\\Programs') !== -1 || isMac;

            if (!(configVersion
                && typeof configVersion === 'string'
                && (compareSemVersions.check(appVersionString, configVersion) !== 1)) && shouldUpdateUserConfig) {
                return setupFirstTimeLaunch();
            }
            log.send(logLevels.INFO, `not a first-time launch as 
            configVersion: ${configVersion} appVersion: ${appVersionString} shouldUpdateUserConfig: ${shouldUpdateUserConfig}`);
            return Promise.resolve();
        })
        .catch(() => {
            return setupFirstTimeLaunch();
        });
}

/**
 * Setup and update user config
 * on first time launch or if the latest app version
 *
 * @return {Promise<any>}
 */
function setupFirstTimeLaunch() {
    log.send(logLevels.INFO, 'setting first time launch config');
    return getConfigField('launchOnStartup')
        .then(setStartup)
        .then(updateUserConfigOnLaunch);
}

/**
 * Sets Symphony on startup
 * @param lStartup
 * @returns {Promise}
 */
function setStartup(lStartup) {
    log.send(logLevels.INFO, `launch on startup parameter value is ${lStartup}`);
    return new Promise((resolve) => {
        let launchOnStartup = (String(lStartup) === 'true');
        log.send(logLevels.INFO, `launchOnStartup value is ${launchOnStartup}`);
        if (launchOnStartup) {
            log.send(logLevels.INFO, `enabling launch on startup`);
            autoLaunch.enable();
            return resolve();
        }
        autoLaunch.disable();
        return resolve();
    });
}

/**
 * Checks for the url argument, processes it
 * and creates the main window
 */
function getUrlAndCreateMainWindow() {
    // allow passing url argument
    let url = getCmdLineArg(process.argv, '--url=', false);
    if (url) {
        windowMgr.createMainWindow(url.substr(6));
        return;
    }

    getConfigField('url')
        .then(createWin).catch(function (err) {
            log.send(logLevels.ERROR, `unable to create main window -> ${err}`);
            app.quit();
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
    log.send(logLevels.INFO, `Trying to process a protocol action for uri ${protocolUri}`);

    if (protocolUri) {
        const parsedURL = urlParser.parse(protocolUri);
        if (!parsedURL.protocol || !parsedURL.slashes) {
            return;
        }
        log.send(logLevels.INFO, `Parsing protocol url successful for ${parsedURL}`);
        handleProtocolAction(protocolUri);
    }
}

/**
 * Handles a protocol action based on the current state of the app
 * @param uri
 */
function handleProtocolAction(uri) {
    if (!isAppAlreadyOpen) {
        log.send(logLevels.INFO, `App started by protocol url ${uri}. We are caching this to be processed later!`);
        // app is opened by the protocol url, cache the protocol url to be used later
        protocolHandler.setProtocolUrl(uri);
    } else {
        // This is needed for mac OS as it brings pop-outs to foreground
        // (if it has been previously focused) instead of main window
        if (isMac) {
            const mainWindow = windowMgr.getMainWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
                windowMgr.activate(mainWindow.winName);
            }
        }
        // app is already open, so, just trigger the protocol action method
        log.send(logLevels.INFO, `App opened by protocol url ${uri}`);
        protocolHandler.processProtocolAction(uri);
    }
}
