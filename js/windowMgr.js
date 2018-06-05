'use strict';

const fs = require('fs');
const electron = require('electron');
const app = electron.app;
const electronSession = electron.session;
const globalShortcut = electron.globalShortcut;
const BrowserWindow = electron.BrowserWindow;
const path = require('path');
const nodeURL = require('url');
const querystring = require('querystring');
const filesize = require('filesize');

const { getTemplate, getMinimizeOnClose, getTitleBarStyle } = require('./menus/menuTemplate.js');
const loadErrors = require('./dialogs/showLoadError.js');
const isInDisplayBounds = require('./utils/isInDisplayBounds.js');
const getGuid = require('./utils/getGuid.js');
const log = require('./log.js');
const logLevels = require('./enums/logLevels.js');
const notify = require('./notify/electron-notify.js');
const eventEmitter = require('./eventEmitter');
const throttle = require('./utils/throttle.js');
const { getConfigField, updateConfigField, readConfigFileSync, getMultipleConfigField } = require('./config.js');
const { isMac, isNodeEnv, isWindows10, isWindowsOS } = require('./utils/misc');
const { deleteIndexFolder } = require('./search/search.js');
const { isWhitelisted, parseDomain } = require('./utils/whitelistHandler');
const { initCrashReporterMain, initCrashReporterRenderer } = require('./crashReporter.js');

// show dialog when certificate errors occur
require('./dialogs/showCertError.js');
require('./dialogs/showBasicAuth.js');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let windows = {};
let willQuitApp = false;
let isOnline = true;
let boundsChangeWindow;
let alwaysOnTop = false;
let position = 'lower-right';
let display;
let sandboxed = false;
let isAutoReload = false;

// Application menu
let menu;

// note: this file is built using browserify in prebuild step.
const preloadMainScript = path.join(__dirname, 'preload/_preloadMain.js');

const MIN_WIDTH = 300;
const MIN_HEIGHT = 300;

// Default window size for pop-out windows
const DEFAULT_WIDTH = 300;
const DEFAULT_HEIGHT = 600;

// Certificate transparency whitelist
let ctWhitelist = [];

/**
 * Adds a window key
 * @param key
 * @param browserWin
 */
function addWindowKey(key, browserWin) {
    windows[key] = browserWin;
}

/**
 * Removes a window key
 * @param key
 */
function removeWindowKey(key) {
    delete windows[key];
}

/**
 * Gets the parsed url
 * @returns {Url}
 * @param appUrl
 */
function getParsedUrl(appUrl) {
    let parsedUrl = nodeURL.parse(appUrl);
    if (!parsedUrl.protocol || parsedUrl.protocol !== 'https:') {
        parsedUrl.protocol = 'https:';
        parsedUrl.slashes = true
    }
    let url = nodeURL.format(parsedUrl);
    return nodeURL.parse(url);
}

/**
 * Creates the main window
 * @param initialUrl
 */
function createMainWindow(initialUrl) {
    getMultipleConfigField([ 'mainWinPos', 'isCustomTitleBar' ])
        .then(configData => {
            doCreateMainWindow(initialUrl, configData.mainWinPos, configData.isCustomTitleBar);
        })
        .catch(() => {
            // failed use default bounds and frame
            doCreateMainWindow(initialUrl, null, false);
        });
}

/**
 * Creates the main window with bounds
 * @param initialUrl
 * @param initialBounds
 * @param isCustomTitleBar
 */
function doCreateMainWindow(initialUrl, initialBounds, isCustomTitleBar) {
    let url = initialUrl;
    let key = getGuid();

    const config = readConfigFileSync();

    // condition whether to enable custom Windows 10 title bar
    const isCustomTitleBarEnabled = typeof isCustomTitleBar === 'boolean'
        && isCustomTitleBar
        && isWindows10();
    log.send(logLevels.INFO, `we are configuring a custom title bar for windows -> ${isCustomTitleBarEnabled}`);
    
    ctWhitelist = config && config.ctWhitelist;
    log.send(logLevels.INFO, `we are configuring certificate transparency whitelist for the domains -> ${ctWhitelist}`);
    
    log.send(logLevels.INFO, `creating main window for ${url}`);
    
    if (config && config !== null && config.customFlags) {
        
        log.send(logLevels.INFO, 'Chrome flags config found!');
        
        if (config.customFlags.authServerWhitelist && config.customFlags.authServerWhitelist !== "") {
            log.send(logLevels.INFO, 'setting ntlm domains');
            electronSession.defaultSession.allowNTLMCredentialsForDomains(config.customFlags.authServerWhitelist);
        }
        
    }
    
    let newWinOpts = {
        title: 'Symphony',
        show: true,
        minWidth: MIN_WIDTH,
        minHeight: MIN_HEIGHT,
        frame: !isCustomTitleBarEnabled,
        alwaysOnTop: false,
        webPreferences: {
            sandbox: sandboxed,
            nodeIntegration: isNodeEnv,
            preload: preloadMainScript,
            nativeWindowOpen: true
        }
    };

    // set size and position
    let bounds = initialBounds;

    // if bounds if not fully contained in some display then use default size
    // and position.
    if (!isInDisplayBounds(bounds) || initialBounds.isMaximized || initialBounds.isFullScreen) {
        bounds = null;
    }

    if (bounds && bounds.width && bounds.height) {
        newWinOpts.width = bounds.width;
        newWinOpts.height = bounds.height;
    } else {
        newWinOpts.width = 900;
        newWinOpts.height = 900;
    }

    // will center on screen if values not provided
    if (bounds && bounds.x && bounds.y) {
        newWinOpts.x = bounds.x;
        newWinOpts.y = bounds.y;
    }

    // will set the main window on top as per the user prefs
    if (alwaysOnTop) {
        newWinOpts.alwaysOnTop = alwaysOnTop;
    }

    // note: augmenting with some custom values
    newWinOpts.winKey = key;

    mainWindow = new BrowserWindow(newWinOpts);
    mainWindow.winName = 'main';

    let throttledMainWinBoundsChange = throttle(1000, saveMainWinBounds);
    mainWindow.on('move', throttledMainWinBoundsChange);
    mainWindow.on('resize', throttledMainWinBoundsChange);

    if (initialBounds && !isNodeEnv) {
        // maximizes the application if previously maximized
        if (initialBounds.isMaximized) {
            mainWindow.maximize();
        }

        // Sets the application to full-screen if previously set to full-screen
        if (isMac && initialBounds.isFullScreen) {
            mainWindow.setFullScreen(true);
        }
    }

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
    // we might not have network connectivity, so warn the user.
    mainWindow.webContents.on('did-finish-load', function () {
        // Initialize crash reporter
        initCrashReporterMain({ process: 'main window' });
        initCrashReporterRenderer(mainWindow, { process: 'render | main window' });

        url = mainWindow.webContents.getURL();
        if (isCustomTitleBarEnabled || isWindows10()) {
            mainWindow.webContents.insertCSS(fs.readFileSync(path.join(__dirname, '/windowsTitleBar/style.css'), 'utf8').toString());
            // This is required to initiate Windows title bar only after insertCSS
            const titleBarStyle = getTitleBarStyle();
            mainWindow.webContents.send('initiate-windows-title-bar', titleBarStyle);
        }

        if (!isOnline) {
            loadErrors.showNetworkConnectivityError(mainWindow, url, retry);
        } else {
            // updates the notify config with user preference
            notify.updateConfig({ position: position, display: display });
            // removes all existing notifications when main window reloads
            notify.reset();
            log.send(logLevels.INFO, 'loaded main window url: ' + url);

        }
    });

    mainWindow.webContents.on('did-fail-load', function (event, errorCode,
        errorDesc, validatedURL) {
        loadErrors.showLoadFailure(mainWindow, validatedURL, errorDesc, errorCode, retry, false);
    });

    // In case a renderer process crashes, provide an
    // option for the user to either reload or close the window
    mainWindow.webContents.on('crashed', function () {
        const options = {
            type: 'error',
            title: 'Renderer Process Crashed',
            message: 'Oops! Looks like we have had a crash. Please reload or close this window.',
            buttons: ['Reload', 'Close']
        };

        electron.dialog.showMessageBox(options, function (index) {
            if (index === 0) {
                mainWindow.reload();
            }
            else {
                mainWindow.close();
            }
        });
    });
    
    registerShortcuts();
    handlePermissionRequests(mainWindow.webContents);

    addWindowKey(key, mainWindow);
    mainWindow.loadURL(url);

    menu = electron.Menu.buildFromTemplate(getTemplate(app));
    if (isWindows10()) {
        mainWindow.setMenu(menu);
    } else {
        electron.Menu.setApplicationMenu(menu);
    }

    mainWindow.on('close', function (e) {
        if (willQuitApp) {
            destroyAllWindows();
            return;
        }

        if (getMinimizeOnClose()) {
            e.preventDefault();
            mainWindow.minimize();
        } else {
            app.quit();
        }
    });

    function destroyAllWindows() {
        let keys = Object.keys(windows);
        for (let i = 0, len = keys.length; i < len; i++) {
            let winKey = keys[i];
            removeWindowKey(winKey);
        }

        mainWindow = null;
    }

    mainWindow.on('closed', destroyAllWindows);
    
    // Manage File Downloads
    mainWindow.webContents.session.on('will-download', (event, item, webContents) => {
        // When download is in progress, send necessary data to indicate the same
        webContents.send('downloadProgress');
        
        // Send file path when download is complete
        item.once('done', (e, state) => {
            if (state === 'completed') {
                let data = {
                    _id: getGuid(),
                    savedPath: item.getSavePath() ? item.getSavePath() : '',
                    total: filesize(item.getTotalBytes() ? item.getTotalBytes() : 0),
                    fileName: item.getFilename() ? item.getFilename() : 'No name'
                };
                webContents.send('downloadCompleted', data);
            }
        });
    });

    // open external links in default browser - a tag with href='_blank' or window.open
    mainWindow.webContents.on('new-window', handleNewWindow);
    mainWindow.webContents.session.setCertificateVerifyProc(handleCertificateTransparencyChecks);

    function handleNewWindow(event, newWinUrl, frameName, disposition, newWinOptions) {
        
        let newWinParsedUrl = getParsedUrl(newWinUrl);
        let mainWinParsedUrl = getParsedUrl(url);

        let newWinHost = newWinParsedUrl && newWinParsedUrl.host;
        let mainWinHost = mainWinParsedUrl && mainWinParsedUrl.host;

        let emptyUrlString = 'about:blank';
        let dispositionWhitelist = ['new-window', 'foreground-tab'];

        // only allow window.open to succeed is if coming from same hsot,
        // otherwise open in default browser.
        if ((newWinHost === mainWinHost || newWinUrl === emptyUrlString) && dispositionWhitelist.includes(disposition)) {
            // handle: window.open

            if (!frameName) {
                // abort - no frame name provided.
                return;
            }

            log.send(logLevels.INFO, 'creating pop-out window url: ' + newWinParsedUrl);

            let x = 0;
            let y = 0;

            let width = newWinOptions.width || DEFAULT_WIDTH;
            let height = newWinOptions.height || DEFAULT_HEIGHT;

            // try getting x and y position from query parameters
            let query = newWinParsedUrl && querystring.parse(newWinParsedUrl.query);
            if (query && query.x && query.y) {
                let newX = Number.parseInt(query.x, 10);
                let newY = Number.parseInt(query.y, 10);

                let newWinRect = { x: newX, y: newY, width, height };

                // only accept if both are successfully parsed.
                if (Number.isInteger(newX) && Number.isInteger(newY) &&
                    isInDisplayBounds(newWinRect)) {
                    x = newX;
                    y = newY;
                } else {
                    x = 0;
                    y = 0;
                }
            } else {
                // create new window at slight offset from main window.
                ({ x, y } = getWindowSizeAndPosition(mainWindow));
                x += 50;
                y += 50;
            }

            /* eslint-disable no-param-reassign */
            newWinOptions.x = x;
            newWinOptions.y = y;
            newWinOptions.width = Math.max(width, DEFAULT_WIDTH);
            newWinOptions.height = Math.max(height, DEFAULT_HEIGHT);
            newWinOptions.minWidth = MIN_WIDTH;
            newWinOptions.minHeight = MIN_HEIGHT;
            newWinOptions.alwaysOnTop = alwaysOnTop;
            newWinOptions.frame = true;

            let newWinKey = getGuid();

            newWinOptions.winKey = newWinKey;
            /* eslint-enable no-param-reassign */

            let webContents = newWinOptions.webContents;

            webContents.once('did-finish-load', function () {
                let browserWin = BrowserWindow.fromWebContents(webContents);

                if (browserWin) {
                    log.send(logLevels.INFO, 'loaded pop-out window url: ' + newWinParsedUrl);

                    if (!isMac) {
                        // Removes the menu bar from the pop-out window
                        // setMenu is currently only supported on Windows and Linux
                        browserWin.setMenu(null);
                    }

                    initCrashReporterMain({ process: 'pop-out window' });
                    initCrashReporterRenderer(browserWin, { process: 'render | pop-out window' });

                    browserWin.winName = frameName;
                    browserWin.setAlwaysOnTop(alwaysOnTop);

                    let handleChildWindowCrashEvent = (e) => {
                        const options = {
                            type: 'error',
                            title: 'Renderer Process Crashed',
                            message: 'Oops! Looks like we have had a crash. Please reload or close this window.',
                            buttons: ['Reload', 'Close']
                        };

                        let childBrowserWindow = BrowserWindow.fromWebContents(e.sender);
                        if (childBrowserWindow && !childBrowserWindow.isDestroyed()) {
                            electron.dialog.showMessageBox(childBrowserWindow, options, function (index) {
                                if (index === 0) {
                                    childBrowserWindow.reload();
                                } else {
                                    childBrowserWindow.close();
                                }
                            });
                        }
                    };

                    browserWin.webContents.on('crashed', handleChildWindowCrashEvent);

                    // In case we navigate to an external link from inside a pop-out,
                    // we open that link in an external browser rather than creating
                    // a new window
                    browserWin.webContents.on('new-window', handleNewWindow.bind(this));

                    addWindowKey(newWinKey, browserWin);

                    // Method that sends bound changes as soon
                    // as a new window is created
                    // issue https://perzoinc.atlassian.net/browse/ELECTRON-172
                    sendChildWinBoundsChange(browserWin);

                    // throttle changes so we don't flood client.
                    let throttledBoundsChange = throttle(1000,
                        sendChildWinBoundsChange.bind(null, browserWin));
                    browserWin.on('move', throttledBoundsChange);
                    browserWin.on('resize', throttledBoundsChange);
    
                    let handleChildWindowClosed = () => {
                        removeWindowKey(newWinKey);
                        browserWin.removeListener('move', throttledBoundsChange);
                        browserWin.removeListener('resize', throttledBoundsChange);
                    };
    
                    browserWin.on('close', () => {
                        browserWin.webContents.removeListener('new-window', handleNewWindow);
                        browserWin.webContents.removeListener('crashed', handleChildWindowCrashEvent);
                    });
    
                    browserWin.once('closed', () => {
                        handleChildWindowClosed();
                    });
                    
                    handlePermissionRequests(browserWin.webContents);
    
                    browserWin.webContents.session.setCertificateVerifyProc(handleCertificateTransparencyChecks);
                }
            });
        } else {
            event.preventDefault();
            openUrlInDefaultBrowser(newWinUrl);
        }
    }

    // whenever the main window is navigated for ex: window.location.href or url redirect
    mainWindow.webContents.on('will-navigate', function (event, navigatedURL) {
        deleteIndexFolder();
        isWhitelisted(navigatedURL)
            .catch(() => {
                event.preventDefault();
                electron.dialog.showMessageBox(mainWindow, {
                    type: 'warning',
                    buttons: ['Ok'],
                    title: 'Not Allowed',
                    message: `Sorry, you are not allowed to access this website (${navigatedURL}), please contact your administrator for more details`,
                });
            });
    });
    
    /**
     * Register shortcuts for the app
     */
    function registerShortcuts() {
        
        // Register dev tools shortcut
        globalShortcut.register(isMac ? 'Alt+Command+I' : 'Ctrl+Shift+I', () => {
            let focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow && !focusedWindow.isDestroyed()) {
                focusedWindow.webContents.toggleDevTools();
            }
        });
        
    }
    
    /**
     * Sets permission requests for the window
     * @param webContents Web contents of the window
     */
    function handlePermissionRequests(webContents) {

        let session = webContents.session;

        getConfigField('permissions')
            .then((permissions) => {

                if (!permissions) {
                    log.send(logLevels.ERROR, 'permissions configuration is invalid, so, everything will be true by default!');
                    return;
                }

                session.setPermissionRequestHandler((sessionWebContents, permission, callback) => {

                    function handleSessionPermissions(userPermission, message, cb) {

                        log.send(logLevels.INFO, 'permission is -> ' + userPermission);

                        if (!userPermission) {
                            let fullMessage = `Your administrator has disabled ${message}. Please contact your admin for help.`;
                            const browserWindow = BrowserWindow.getFocusedWindow();
                            if (browserWindow && !browserWindow.isDestroyed()) {
                                electron.dialog.showMessageBox(browserWindow, {type: 'error', title: 'Permission Denied!', message: fullMessage});
                            }
                        }

                        return cb(userPermission);

                    }

                    let PERMISSION_MEDIA = 'media';
                    let PERMISSION_LOCATION = 'geolocation';
                    let PERMISSION_NOTIFICATIONS = 'notifications';
                    let PERMISSION_MIDI_SYSEX = 'midiSysex';
                    let PERMISSION_POINTER_LOCK = 'pointerLock';
                    let PERMISSION_FULL_SCREEN = 'fullscreen';
                    let PERMISSION_OPEN_EXTERNAL = 'openExternal';

                    switch (permission) {

                        case PERMISSION_MEDIA:
                            return handleSessionPermissions(permissions.media, 'sharing your camera, microphone, and speakers', callback);

                        case PERMISSION_LOCATION:
                            return handleSessionPermissions(permissions.geolocation, 'sharing your location', callback);

                        case PERMISSION_NOTIFICATIONS:
                            return handleSessionPermissions(permissions.notifications, 'notifications', callback);

                        case PERMISSION_MIDI_SYSEX:
                            return handleSessionPermissions(permissions.midiSysex, 'MIDI Sysex', callback);

                        case PERMISSION_POINTER_LOCK:
                            return handleSessionPermissions(permissions.pointerLock, 'Pointer Lock', callback);

                        case PERMISSION_FULL_SCREEN:
                            return handleSessionPermissions(permissions.fullscreen, 'Full Screen', callback);

                        case PERMISSION_OPEN_EXTERNAL:
                            return handleSessionPermissions(permissions.openExternal, 'Opening External App', callback);

                        default:
                            return callback(false);
                    }

                });

            }).catch((error) => {
                log.send(logLevels.ERROR, 'unable to get permissions configuration, so, everything will be true by default! ' + error);
            })

    }
    
    function handleCertificateTransparencyChecks(request, callback) {
        
        const { hostname: hostUrl, errorCode } = request;
        
        if (errorCode === 0) {
            return callback(0);
        }
        
        let { tld, domain } = parseDomain(hostUrl);
        let host = domain + tld;
        
        if (ctWhitelist && Array.isArray(ctWhitelist) && ctWhitelist.length > 0 && ctWhitelist.indexOf(host) > -1) {
            return callback(0);
        }
        
        return callback(-2);
    }

}

/**
 * Handles the event before-quit emitted by electron
 */
app.on('before-quit', function () {
    willQuitApp = true;
});

/**
 * Saves the main window bounds
 */
function saveMainWinBounds() {
    let newBounds = getWindowSizeAndPosition(mainWindow);

    // set application full-screen and maximized state
    if (mainWindow && !mainWindow.isDestroyed()) {
        newBounds.isMaximized = mainWindow.isMaximized();
        newBounds.isFullScreen = mainWindow.isFullScreen();
    }

    if (newBounds) {
        updateConfigField('mainWinPos', newBounds);
    }
}

/**
 * Gets the main window
 * @returns {*}
 */
function getMainWindow() {
    return mainWindow;
}

/**
 * Gets the application menu
 * @returns {*}
 */
function getMenu() {
    return menu;
}

/**
 * Gets a window's size and position
 * @param window
 * @returns {*}
 */
function getWindowSizeAndPosition(window) {
    if (window) {
        let newPos = window.getPosition();
        let newSize = window.getSize();

        if (newPos && newPos.length === 2 &&
            newSize && newSize.length === 2) {
            return {
                x: newPos[0],
                y: newPos[1],
                width: newSize[0],
                height: newSize[1],
            };
        }
    }

    return null;
}

/**
 * Shows the main window
 */
function showMainWindow() {
    mainWindow.show();
}

/**
 * Tells if a window is the main window
 * @param win
 * @returns {boolean}
 */
function isMainWindow(win) {
    return mainWindow === win;
}

/**
 * Checks if the window and a key has a window
 * @param win
 * @param winKey
 * @returns {*}
 */
function hasWindow(win, winKey) {
    if (win instanceof BrowserWindow) {
        let browserWin = windows[winKey];
        return browserWin && win === browserWin;
    }

    return false;
}

/**
 * Sets if a user is online
 * @param status
 */
function setIsOnline(status) {
    isOnline = status;
}

/**
 * Tries finding a window we have created with given name.  If found, then
 * brings to front and gives focus.
 * @param  {String} windowName   Name of target window. Note: main window has
 * name 'main'.
 * @param {Boolean} shouldFocus  whether to get window to focus or just show
 * without giving focus
 */
function activate(windowName, shouldFocus = true) {

    // don't activate when the app is reloaded programmatically
    // Electron-136
    if (isAutoReload) {
        return null;
    }

    let keys = Object.keys(windows);
    for (let i = 0, len = keys.length; i < len; i++) {
        let window = windows[keys[i]];
        if (window && !window.isDestroyed() && window.winName === windowName) {

            // Flash task bar icon in Windows
            if (isWindowsOS && !shouldFocus) {
                return window.flashFrame(true);
            }

            // brings window without giving focus on mac
            if (isMac && !shouldFocus) {
                return window.showInactive();
            }

            if (window.isMinimized()) {
                return window.restore();
            }

            return window.show();
        }
    }
    return null;
}

/**
 * Sets if is auto reloading the app
 * @param reload
 */
function setIsAutoReload(reload) {
    if (typeof reload === 'boolean') {
        isAutoReload = reload
    }
}

/**
 * name of renderer window to notify when bounds of child window changes.
 * @param {object} window Renderer window to use IPC with to inform about size/
 * position change.
 */
function setBoundsChangeWindow(window) {
    boundsChangeWindow = window;
}

/**
 * Called when bounds of child window changes size/position
 * @param  {object} window Child window which has changed size/position.
 */
function sendChildWinBoundsChange(window) {
    let newBounds = getWindowSizeAndPosition(window);
    if (newBounds && boundsChangeWindow) {
        newBounds.windowName = window.winName;
        // ipc msg back to renderer to inform bounds has changed.
        boundsChangeWindow.send('boundsChange', newBounds);
    }
}

/**
 * Opens an external url in the system's default browser
 * @param urlToOpen
 */
function openUrlInDefaultBrowser(urlToOpen) {
    if (urlToOpen) {
        electron.shell.openExternal(urlToOpen);
    }
}

/**
 * Called when an event is received from menu
 * @param {boolean} boolean whether to enable or disable alwaysOnTop.
 * @param {boolean} shouldActivateMainWindow whether to activate main window
 */
function isAlwaysOnTop(boolean, shouldActivateMainWindow = true) {
    alwaysOnTop = boolean;
    let browserWins = BrowserWindow.getAllWindows();
    if (browserWins.length > 0) {
        browserWins
            .filter((browser) => typeof browser.notfyObj !== 'object')
            .forEach(function (browser) {
                browser.setAlwaysOnTop(boolean);
            });

        // An issue where changing the alwaysOnTop property
        // focus the pop-out window
        // Issue - Electron-209/470
        if (mainWindow && mainWindow.winName && shouldActivateMainWindow) {
            activate(mainWindow.winName);
        }
    }
}

// node event emitter to update always on top
eventEmitter.on('isAlwaysOnTop', (params) => {
    isAlwaysOnTop(params.isAlwaysOnTop, params.shouldActivateMainWindow);
});

// node event emitter for notification settings
eventEmitter.on('notificationSettings', (notificationSettings) => {
    position = notificationSettings.position;
    display = notificationSettings.display;
});

/**
 * Method that gets invoked when an external display
 * is removed using electron 'display-removed' event.
 */
function verifyDisplays() {

    // This is only for Windows, macOS handles this by itself
    if (!mainWindow || isMac) {
        return;
    }

    const bounds = mainWindow.getBounds();
    if (bounds) {
        let isXAxisValid = true;
        let isYAxisValid = true;

        // checks to make sure the x,y are valid pairs
        if ((bounds.x === undefined && (bounds.y || bounds.y === 0))) {
            isXAxisValid = false;
        }
        if ((bounds.y === undefined && (bounds.x || bounds.x === 0))) {
            isYAxisValid = false;
        }

        if (!isXAxisValid && !isYAxisValid) {
            return;
        }

        let externalDisplay = checkExternalDisplay(bounds);

        // If external window doesn't exists, reposition main window
        if (!externalDisplay) {
            repositionMainWindow();
        }
    }
}

/**
 * Method that verifies if wrapper exists in any of the available
 * external display by comparing the app bounds with the display bounds
 * if not exists returns false otherwise true
 * @param appBounds {Electron.Rectangle} - current electron wrapper bounds
 * @returns {boolean}
 */
function checkExternalDisplay(appBounds) {
    const x = appBounds.x;
    const y = appBounds.y;
    const width = appBounds.width;
    const height = appBounds.height;
    const factor = 0.2;
    
    // Loops through all the available displays and
    // verifies if the wrapper exists within the display bounds
    // returns false if not exists otherwise true
    return !!electron.screen.getAllDisplays().find(({ bounds }) => {

        const leftMost = x + (width * factor);
        const topMost = y + (height * factor);
        const rightMost = x + width - (width * factor);
        const bottomMost = y + height - (height * factor);

        if (leftMost < bounds.x || topMost < bounds.y) {
            return false;
        }

        return !(rightMost > bounds.x + bounds.width || bottomMost > bounds.y + bounds.height);

    });
}

/**
 * Method that resets the main window bounds when an external display
 * was removed and if the wrapper was contained within that bounds
 */
function repositionMainWindow() {
    
    const { workArea } = electron.screen.getPrimaryDisplay();
    const bounds = workArea;

    if (!bounds) {
        return;
    }

    const windowWidth = Math.round(bounds.width * 0.6);
    const windowHeight = Math.round(bounds.height * 0.8);

    // Calculating the center of the primary display
    // to place the wrapper
    const centerX = bounds.x + bounds.width / 2.0;
    const centerY = bounds.y + bounds.height / 2.0;
    const x = Math.round(centerX - (windowWidth / 2.0));
    const y = Math.round(centerY - (windowHeight / 2.0));

    let rectangle = { x, y, width: windowWidth, height: windowHeight };

    // resetting the main window bounds
    if (mainWindow) {
        if (!mainWindow.isVisible()) {
            mainWindow.show();
        }

        if (mainWindow.isMinimized()) {
            mainWindow.restore();
        }

        mainWindow.focus();
        mainWindow.flashFrame(false);
        mainWindow.setBounds(rectangle, true);
    }
}

module.exports = {
    createMainWindow: createMainWindow,
    getMainWindow: getMainWindow,
    showMainWindow: showMainWindow,
    isMainWindow: isMainWindow,
    hasWindow: hasWindow,
    setIsOnline: setIsOnline,
    activate: activate,
    setBoundsChangeWindow: setBoundsChangeWindow,
    verifyDisplays: verifyDisplays,
    getMenu: getMenu,
    setIsAutoReload: setIsAutoReload
};
