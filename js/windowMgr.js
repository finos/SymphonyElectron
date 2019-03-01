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
const { getConfigField, updateConfigField, readConfigFileSync, getMultipleConfigField, readConfigFromFile } = require('./config.js');
const { isMac, isWindowsOS, isDevEnv } = require('./utils/misc');
const { isWhitelisted, parseDomain } = require('./utils/whitelistHandler');
const { initCrashReporterMain, initCrashReporterRenderer } = require('./crashReporter.js');
const i18n = require('./translation/i18n');
const getCmdLineArg = require('./utils/getCmdLineArg');

const SpellChecker = require('./spellChecker').SpellCheckHelper;
const spellchecker = new SpellChecker();

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
let isAutoReload = false;
let devToolsEnabled = true;
let isCustomTitleBarEnabled = true;
let titleBarStyles;

const KeyCodes = {
    Esc: 27,
    Alt: 18,
};

// Application menu
let menu;
let lang;

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
 * Returns the Spellchecker instance
 * @returns {SpellCheckHelper}
 */
function getSpellchecker() {
    return spellchecker;
}

/**
 * Method that invokes native module that
 * verifies missed spelled word
 * @param text {string}
 * @returns {*}
 */
function isMisspelled(text) {
    if (!spellchecker) {
        return false;
    }
    return spellchecker.isMisspelled(text);
}

/**
 * Creates the main window
 * @param initialUrl
 */
function createMainWindow(initialUrl) {

    let configParams = ['mainWinPos', 'isCustomTitleBar', 'locale', 'devToolsEnabled'];

    getMultipleConfigField(configParams)
        .then(configData => {
            lang = configData && configData.locale || app.getLocale();
            devToolsEnabled = configData && configData.devToolsEnabled;
            doCreateMainWindow(initialUrl, configData.mainWinPos, configData.isCustomTitleBar);
        })
        .catch(() => {
            // failed use default bounds and frame
            lang = app.getLocale();
            doCreateMainWindow(initialUrl, null, false);
        });
}

/**
 * ELECTRON-955: Always on Top - Toast notification does not show on top (front) of the Electron app after it is minimized and maximized again
 * Bring to front all notification windows
 */
function bringToFrontNotification() {
    if (mainWindow && !mainWindow.isDestroyed()) {
        let allBrowserWindows = BrowserWindow.getAllWindows();
        const notificationWindow = allBrowserWindows.filter((item) => item.winName === 'notification-window');
        if (mainWindow.isAlwaysOnTop()) {
            notificationWindow.forEach((item) => {
                if (item && !item.isDestroyed()) {
                    item.setAlwaysOnTop(true);
                }
            });
        }
    }
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
    isCustomTitleBarEnabled = typeof isCustomTitleBar === 'boolean'
        && isCustomTitleBar
        && isWindowsOS;

    ctWhitelist = config && config.ctWhitelist;

    log.send(logLevels.INFO, `creating main window for ${url}`);

    if (config && config.customFlags) {

        if (config.customFlags.authServerWhitelist && config.customFlags.authServerWhitelist !== "") {
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
            sandbox: true,
            nodeIntegration: false,
            preload: preloadMainScript,
            backgroundThrottling: false
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
    logBrowserWindowEvents(mainWindow, mainWindow.winName);

    let throttledMainWinBoundsChange = throttle(1000, saveMainWinBounds);
    mainWindow.on('move', throttledMainWinBoundsChange);
    mainWindow.on('resize', throttledMainWinBoundsChange);
    mainWindow.on('enter-full-screen', () => {
        const snackBarContent = i18n.getMessageFor('SnackBar');
        // event sent to renderer process to show snack bar
        mainWindow.webContents.send('window-enter-full-screen', { snackBar: snackBarContent });
    });
    mainWindow.on('leave-full-screen', () => {
        // event sent to renderer process to remove snack bar
        mainWindow.webContents.send('window-leave-full-screen');
    });

    if (initialBounds) {
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

    // Event needed to hide native menu bar on Windows 10 as we use custom menu bar
    mainWindow.webContents.once('did-start-loading', () => {
        if ((isCustomTitleBarEnabled || isWindowsOS) && mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.setMenuBarVisibility(false);
        }
    });

    // content can be cached and will still finish load but
    // we might not have network connectivity, so warn the user.
    mainWindow.webContents.on('did-finish-load', function () {
        // Initialize crash reporter
        initCrashReporterMain({ process: 'main window' });
        initCrashReporterRenderer(mainWindow, { process: 'render | main window' });

        url = mainWindow.webContents.getURL();
        mainWindow.webContents.send('on-page-load');
        // initializes and applies styles required for snack bar
        mainWindow.webContents.insertCSS(fs.readFileSync(path.join(__dirname, '/snackBar/style.css'), 'utf8').toString());
        if (isCustomTitleBarEnabled) {
            if (!titleBarStyles) {
                let titleBarStylesPath;
                let stylesFileName = path.join('config', 'titleBarStyles.css');
                if (isDevEnv) {
                    titleBarStylesPath = path.join(app.getAppPath(), stylesFileName);
                } else {
                    const execPath = path.dirname(app.getPath('exe'));
                    titleBarStylesPath = path.join(execPath, stylesFileName);
                }
                if (fs.existsSync(titleBarStylesPath)) {
                    titleBarStyles = fs.readFileSync(titleBarStylesPath, 'utf8').toString();
                } else {
                    titleBarStyles = fs.readFileSync(path.join(__dirname, '/windowsTitleBar/style.css'), 'utf8').toString();
                }
            }
            mainWindow.webContents.insertCSS(titleBarStyles);
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

        // ELECTRON-540 - needed to automatically
        // select desktop capture source
        const screenShareArg = getCmdLineArg(process.argv, '--auto-select-desktop-capture-source', false);
        if (screenShareArg && typeof screenShareArg === 'string') {
            mainWindow.webContents.send('screen-share-argv', screenShareArg);
        }

        if (config && config.permissions) {
            const permission = ' screen sharing';
            const fullMessage = i18n.getMessageFor('Your administrator has disabled ') + permission + '. ' + i18n.getMessageFor('Please contact your admin for help');
            const dialogContent = { type: 'error', title: i18n.getMessageFor('Permission Denied') + '!', message: fullMessage };
            mainWindow.webContents.send('is-screen-share-enabled', config.permissions.media, dialogContent);
        }
    });

    mainWindow.webContents.on('did-fail-load', function (event, errorCode,
        errorDesc, validatedURL) {
        loadErrors.showLoadFailure(mainWindow, validatedURL, errorDesc, errorCode, retry, false);
    });

    // In case a renderer process crashes, provide an
    // option for the user to either reload or close the window
    mainWindow.webContents.on('crashed', function (event, killed) {

        log.send(logLevels.INFO, `Main Window crashed! Killed? ${killed}`);

        if (killed) {
            return;
        }

        const options = {
            type: 'error',
            title: i18n.getMessageFor('Renderer Process Crashed'),
            message: i18n.getMessageFor('Oops! Looks like we have had a crash. Please reload or close this window.'),
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

    setLocale(mainWindow, { language: lang });

    mainWindow.on('close', function (e) {
        if (willQuitApp) {
            destroyAllWindows();
            return;
        }

        if (getMinimizeOnClose()) {
            e.preventDefault();
            mainWindow.minimize();
        } else if (isMac) {
            e.preventDefault();
            mainWindow.hide();
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
    const enforceInheritance = (topWebContents) => {
        const handleNewWindow = (webContents) => {
            webContents.on('new-window', (event, newWinUrl, frameName, disposition, newWinOptions) => {
                log.send(logLevels.INFO, `Creating a pop-out window for the url ${newWinUrl} with frame name ${frameName}, disposition ${disposition} and options ${newWinOptions}`);
                if (!newWinOptions.webPreferences) {
                    // eslint-disable-next-line no-param-reassign
                    newWinOptions.webPreferences = {};
                }

                Object.assign(newWinOptions.webPreferences, topWebContents);

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
                    newWinOptions.parent = null;
                    newWinOptions.webPreferences.backgroundThrottling = false;

                    let newWinKey = getGuid();

                    newWinOptions.winKey = newWinKey;
                    /* eslint-enable no-param-reassign */

                    let childWebContents = newWinOptions.webContents;

                    // Event needed to hide native menu bar
                    childWebContents.once('did-start-loading', () => {
                        let browserWin = BrowserWindow.fromWebContents(childWebContents);
                        if (isWindowsOS && browserWin && !browserWin.isDestroyed()) {
                            browserWin.setMenuBarVisibility(false);
                        }
                    });

                    childWebContents.once('did-finish-load', function () {
                        let browserWin = BrowserWindow.fromWebContents(childWebContents);

                        if (browserWin) {
                            log.send(logLevels.INFO, `loaded pop-out window url: ${JSON.stringify(newWinParsedUrl)}`);

                            browserWin.webContents.send('on-page-load');
                            // applies styles required for snack bar
                            browserWin.webContents.insertCSS(fs.readFileSync(path.join(__dirname, '/snackBar/style.css'), 'utf8').toString());

                            initCrashReporterMain({ process: 'pop-out window' });
                            initCrashReporterRenderer(browserWin, { process: 'render | pop-out window' });

                            browserWin.winName = frameName;
                            browserWin.setAlwaysOnTop(alwaysOnTop);
                            logBrowserWindowEvents(browserWin, browserWin.winName);

                            let handleChildWindowCrashEvent = (e, killed) => {
                                log.send(logLevels.INFO, `Child Window crashed! Killed? ${killed}`);

                                if (killed) {
                                    return;
                                }
                                const options = {
                                    type: 'error',
                                    title: i18n.getMessageFor('Renderer Process Crashed'),
                                    message: i18n.getMessageFor('Oops! Looks like we have had a crash. Please reload or close this window.'),
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
                            browserWin.webContents.on('will-navigate', (e, navigatedURL) => {
                                if (!navigatedURL.startsWith('http' || 'https')) {
                                    e.preventDefault();
                                }
                            });

                            // In case we navigate to an external link from inside a pop-out,
                            // we open that link in an external browser rather than creating
                            // a new window
                            if (browserWin.webContents) {
                                handleNewWindow(browserWin.webContents);
                            }

                            addWindowKey(newWinKey, browserWin);

                            // Method that sends bound changes as soon
                            // as a new window is created
                            // issue https://perzoinc.atlassian.net/browse/ELECTRON-172
                            sendChildWinBoundsChange(browserWin);

                            // throttle full screen
                            let throttledFullScreen = throttle(1000,
                                handleChildWindowFullScreen.bind(null, browserWin));

                            // throttle leave full screen
                            let throttledLeaveFullScreen = throttle(1000,
                                handleChildWindowLeaveFullScreen.bind(null, browserWin));

                            // throttle changes so we don't flood client.
                            let throttledBoundsChange = throttle(1000,
                                sendChildWinBoundsChange.bind(null, browserWin));

                            browserWin.on('move', throttledBoundsChange);
                            browserWin.on('resize', throttledBoundsChange);
                            browserWin.on('enter-full-screen', throttledFullScreen);
                            browserWin.on('leave-full-screen', throttledLeaveFullScreen);

                            let handleChildWindowClosed = () => {
                                removeWindowKey(newWinKey);
                                browserWin.removeListener('move', throttledBoundsChange);
                                browserWin.removeListener('resize', throttledBoundsChange);
                                browserWin.removeListener('enter-full-screen', throttledFullScreen);
                                browserWin.removeListener('leave-full-screen', throttledLeaveFullScreen);
                            };

                            browserWin.on('close', () => {
                                browserWin.webContents.removeListener('crashed', handleChildWindowCrashEvent);
                            });

                            browserWin.once('closed', () => {
                                handleChildWindowClosed();
                            });

                            handlePermissionRequests(browserWin.webContents);

                            if (!isDevEnv) {
                                browserWin.webContents.session.setCertificateVerifyProc(handleCertificateTransparencyChecks);
                            }
                        }
                    });
                } else {
                    event.preventDefault();
                    openUrlInDefaultBrowser(newWinUrl);
                }
            });
        };
        handleNewWindow(topWebContents);
    };

    if (!isDevEnv) {
        mainWindow.webContents.session.setCertificateVerifyProc(handleCertificateTransparencyChecks);
    }

    // enforce main window's webPreferences to child windows
    if (mainWindow.webContents) {
        enforceInheritance(mainWindow.webContents);
    }

    // whenever the main window is navigated for ex: window.location.href or url redirect
    mainWindow.webContents.on('will-navigate', function (event, navigatedURL) {

        if (!navigatedURL.startsWith('http' || 'https')) {
            event.preventDefault();
            return;
        }

        isWhitelisted(navigatedURL)
            .catch(() => {
                event.preventDefault();
                electron.dialog.showMessageBox(mainWindow, {
                    type: 'warning',
                    buttons: ['Ok'],
                    title: i18n.getMessageFor('Not Allowed'),
                    message: i18n.getMessageFor('Sorry, you are not allowed to access this website') + ' (' + navigatedURL + '), ' + i18n.getMessageFor('please contact your administrator for more details'),
                });
            });
    });

    /**
     * Register shortcuts for the app
     */
    function registerShortcuts() {

        function devTools() {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            devToolsEnabled = readConfigFromFile('devToolsEnabled');
            if (focusedWindow && !focusedWindow.isDestroyed()) {
                if (devToolsEnabled) {
                    focusedWindow.webContents.toggleDevTools();
                } else {
                    log.send(logLevels.INFO, `dev tools disabled for ${focusedWindow.winName} window`);
                    focusedWindow.webContents.closeDevTools();
                    electron.dialog.showMessageBox(focusedWindow, {
                        type: 'warning',
                        buttons: ['Ok'],
                        title: i18n.getMessageFor('Dev Tools disabled'),
                        message: i18n.getMessageFor('Dev Tools has been disabled! Please contact your system administrator to enable it!'),
                    });
                }
            }
        }

        // This will initially register the global shortcut
        globalShortcut.register(isMac ? 'Cmd+Alt+I' : 'Ctrl+Shift+I', devTools);

        app.on('browser-window-focus', function () {
            globalShortcut.register(isMac ? 'Cmd+Alt+I' : 'Ctrl+Shift+I', devTools);
        });

        app.on('browser-window-blur', function () {
            globalShortcut.unregister(isMac ? 'Cmd+Alt+I' : 'Ctrl+Shift+I');
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
                            const fullMessage = `${i18n.getMessageFor('Your administrator has disabled')} ${message}. ${i18n.getMessageFor('Please contact your admin for help')}`;
                            const browserWindow = BrowserWindow.getFocusedWindow();
                            if (browserWindow && !browserWindow.isDestroyed()) {
                                electron.dialog.showMessageBox(browserWindow, { type: 'error', title: `${i18n.getMessageFor('Permission Denied')}!`, message: fullMessage });
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
 * ELECTRON-956: App is not minimized upon "Configure Desktop Alert Position" modal when "Always on Top" = True
 */
app.on('browser-window-created', (event, window) => {
    const parentWindow = window.getParentWindow();
    if (parentWindow && !parentWindow.isDestroyed()) {
        if (parentWindow.winName === 'main') {
            window.setMinimizable(false);
            window.setMaximizable(false);
        }
    }
});

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
        bringToFrontNotification();
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
    if (window && !window.isDestroyed()) {
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
    if (mainWindow) {
        mainWindow.show();
    }
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
 * Returns user's online status
 * @return {boolean}
 */
function getIsOnline() {
    return isOnline;
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

    for (const key in windows) {
        if (Object.prototype.hasOwnProperty.call(windows, key)) {
            const window = windows[ key ];
            if (window && !window.isDestroyed() && window.winName === windowName) {

                // Bring the window to the top without focusing
                // Flash task bar icon in Windows for windows
                if (!shouldFocus) {
                    return isMac ? window.showInactive() : window.flashFrame(true);
                }

                // Note: On window just focusing will preserve window snapped state
                // Hiding the window and just calling the focus() won't display the window
                if (isWindowsOS) {
                    return window.isMinimized() ? window.restore() : window.focus();
                }

                return window.isMinimized() ? window.restore() : window.show();
            }
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
 * Called when the child window is set to full screen
 */
function handleChildWindowFullScreen(browserWindow) {
    const snackBarContent = i18n.getMessageFor('SnackBar');
    browserWindow.webContents.send('window-enter-full-screen', { snackBar: snackBarContent });
}

/**
 * Called when the child window left full screen
 */
function handleChildWindowLeaveFullScreen(browserWindow) {
    browserWindow.webContents.send('window-leave-full-screen');
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
    log.send(logLevels.INFO, `Updating settings for always on top ${params}`);
});

// node event emitter for notification settings
eventEmitter.on('notificationSettings', (notificationSettings) => {
    position = notificationSettings.position;
    display = notificationSettings.display;
});

/**
 * Sets the locale settings
 *
 * @param browserWindow {Electron.BrowserWindow}
 * @param opts {Object}
 * @param opts.language {String} - locale string ex: en-US
 */
function setLocale(browserWindow, opts) {
    const language = opts && opts.language || app.getLocale();
    const localeContent = {};
    log.send(logLevels.INFO, `language changed to ${language}. Updating menu and user config`);

    setLanguage(language);
    if (browserWindow && !browserWindow.isDestroyed()) {
        if (isMainWindow(browserWindow)) {

            menu = electron.Menu.buildFromTemplate(getTemplate(app));
            electron.Menu.setApplicationMenu(menu);

            if (isWindowsOS) {
                browserWindow.setMenuBarVisibility(false);

                // update locale for custom title bar
                if (isCustomTitleBarEnabled) {
                    localeContent.titleBar = i18n.getMessageFor('TitleBar');
                }
            }
        }

        localeContent.contextMenu = i18n.getMessageFor('ContextMenu');

        localeContent.downloadManager = i18n.getMessageFor('DownloadManager');
        if (isMac) {
            localeContent.downloadManager['Show in Folder'] = localeContent.downloadManager['Reveal in Finder'];
        }

        browserWindow.webContents.send('locale-changed', localeContent);
    }

    updateConfigField('locale', language);
}

/**
 * Sets language for i18n
 * @param language {String} - locale string ex: en-US
 */
function setLanguage(language) {
    i18n.setLanguage(language);
}

/**
 * Method that gets invoked when an external display
 * is removed using electron 'display-removed' event.
 */
function verifyDisplays() {

    log.send(logLevels.INFO, `Display removed`);
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

/**
 * Method that handles key press
 * @param keyCode {number}
 */
function handleKeyPress(keyCode) {
    switch (keyCode) {
        case KeyCodes.Esc: {
            const focusedWindow = BrowserWindow.getFocusedWindow();

            if (focusedWindow && !focusedWindow.isDestroyed() && focusedWindow.isFullScreen()) {
                focusedWindow.setFullScreen(false);
            }
            break;
        }
        case KeyCodes.Alt:
            if (isWindowsOS && !isCustomTitleBarEnabled) {
                popupMenu();
            }
            break;
        default:
            break;
    }
}

/**
 * Finds all the child window and closes it
 */
function cleanUpChildWindows() {
    const browserWindows = BrowserWindow.getAllWindows();
    notify.resetAnimationQueue();
    if (browserWindows && browserWindows.length) {
        browserWindows.forEach(browserWindow => {
            // Closes only child windows
            if (browserWindow && !browserWindow.isDestroyed() && browserWindow.winName !== 'main') {
                // clean up notification windows
                if (browserWindow.winName === 'notification-window') {
                    notify.closeAll();
                } else {
                    browserWindow.close();
                }
            }
        });
    }
}

/**
 * Method that popup the menu on top of the native title bar
 * whenever Alt key is pressed
 */
function popupMenu() {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (mainWindow && !mainWindow.isDestroyed() && isMainWindow(focusedWindow)) {
        const { x, y } = mainWindow.isFullScreen() ? { x: 0, y: 0 } : { x: 10, y: -20 };
        const popupOpts = { browserWin: mainWindow, x, y };
        getMenu().popup(popupOpts);
    }
}

const logBrowserWindowEvents = (browserWindow, windowName) => {

    const events = [
        'page-title-updated', 'close', 'session-end', 'unresponsive', 'responsive', 'blur', 'focus',
        'show', 'hide', 'ready-to-show', 'maximize', 'unmaximize', 'minimize', 'restore', 'resize', 'move', 'moved',
        'enter-full-screen', 'leave-full-screen', 'enter-html-full-screen', 'leave-html-full-screen', 'app-command'
    ];

    events.forEach((browserWindowEvent) => {
        browserWindow.on(browserWindowEvent, () => {
            log.send(logLevels.INFO, `Browser Window Event Occurred for window (${windowName}) -> ${browserWindowEvent}`);
        });
    });

};

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
    setIsAutoReload: setIsAutoReload,
    handleKeyPress: handleKeyPress,
    cleanUpChildWindows: cleanUpChildWindows,
    setLocale: setLocale,
    getIsOnline: getIsOnline,
    getSpellchecker: getSpellchecker,
    isMisspelled: isMisspelled,
};
