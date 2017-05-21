'use strict';

const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const path = require('path');
const nodeURL = require('url');
const querystring = require('querystring');

const { getTemplate, getMinimizeOnClose } = require('./menus/menuTemplate.js');
const loadErrors = require('./dialogs/showLoadError.js');
const isInDisplayBounds = require('./utils/isInDisplayBounds.js');
const getGuid = require('./utils/getGuid.js');
const log = require('./log.js');
const logLevels = require('./enums/logLevels.js');
const notify = require('./notify/electron-notify.js');

const activityDetection = require('./activityDetection/activityDetection.js');

const throttle = require('./utils/throttle.js');
const { getConfigField, updateConfigField } = require('./config.js');

//context menu
const contextMenu = require('./menus/contextMenu.js');

// show dialog when certificate errors occur
require('./dialogs/showCertError.js');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let windows = {};
let willQuitApp = false;
let isOnline = true;
let boundsChangeWindow;

// note: this file is built using browserify in prebuild step.
const preloadMainScript = path.join(__dirname, 'preload/_preloadMain.js');

const MIN_WIDTH = 300;
const MIN_HEIGHT = 600;

function addWindowKey(key, browserWin) {
    windows[key] = browserWin;
}

function removeWindowKey(key) {
    delete windows[key];
}

function getParsedUrl(url) {
    return nodeURL.parse(url);
}

function createMainWindow(initialUrl) {
    getConfigField('mainWinPos').then(
        function (bounds) {
            doCreateMainWindow(initialUrl, bounds);
        },
        function () {
            // failed, use default bounds
            doCreateMainWindow(initialUrl, null);
        }
    )
}

function doCreateMainWindow(initialUrl, initialBounds) {
    let url = initialUrl;
    let key = getGuid();

    let newWinOpts = {
        title: 'Symphony',
        show: true,
        minWidth: MIN_WIDTH,
        minHeight: MIN_HEIGHT,
        webPreferences: {
            sandbox: true,
            nodeIntegration: false,
            preload: preloadMainScript,
        }
    };

    // set size and position
    let bounds = initialBounds;

    // if bounds if not fully contained in some display then use default size
    // and position.
    if (!isInDisplayBounds(bounds)) {
        bounds = null;
    }

    if (bounds && bounds.width && bounds.height) {
        newWinOpts.width = bounds.width;
        newWinOpts.height = bounds.height;
    } else {
        newWinOpts.width = 1024;
        newWinOpts.height = 768;
    }

    // will center on screen if values not provided
    if (bounds && bounds.x && bounds.y) {
        newWinOpts.x = bounds.x;
        newWinOpts.y = bounds.y;
    }

    // note: augmenting with some custom values
    newWinOpts.winKey = key;

    mainWindow = new BrowserWindow(newWinOpts);
    mainWindow.winName = 'main';

    let throttledMainWinBoundsChange = throttle(5000, saveMainWinBounds);
    mainWindow.on('move', throttledMainWinBoundsChange);
    mainWindow.on('resize', throttledMainWinBoundsChange);

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
        url = mainWindow.webContents.getURL();

        if (!isOnline) {
            loadErrors.showNetworkConnectivityError(mainWindow, url, retry);
        } else {
            // removes all existing notifications when main window reloads
            notify.reset();
            log.send(logLevels.INFO, 'main window loaded url: ' + url);

            // Initiate activity detection to monitor user activity status
            activityDetection.initiateActivityDetection();
        }
    });

    mainWindow.webContents.on('did-fail-load', function (event, errorCode,
                                                         errorDesc, validatedURL) {
        loadErrors.showLoadFailure(mainWindow, validatedURL, errorDesc, errorCode, retry);
    });

    addWindowKey(key, mainWindow);
    mainWindow.loadURL(url);

    const menu = electron.Menu.buildFromTemplate(getTemplate(app));
    electron.Menu.setApplicationMenu(menu);

    mainWindow.on('close', function(e) {
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
        for (var i = 0, len = keys.length; i < len; i++) {
            let winKey = keys[i];
            removeWindowKey(winKey);
        }

        mainWindow = null;
    }

    mainWindow.on('closed', destroyAllWindows);

    // open external links in default browser - a tag, window.open
    mainWindow.webContents.on('new-window', function (event, newWinUrl,
                                                      frameName, disposition, newWinOptions) {
        let newWinParsedUrl = getParsedUrl(newWinUrl);
        let mainWinParsedUrl = getParsedUrl(url);

        let newWinHost = newWinParsedUrl && newWinParsedUrl.host;
        let mainWinHost = mainWinParsedUrl && mainWinParsedUrl.host;

        // if host url doesn't match then open in external browser
        if (newWinHost !== mainWinHost) {
            event.preventDefault();
            electron.shell.openExternal(newWinUrl);
        } else if (disposition === 'foreground-tab' ||
            disposition === 'new-window') {
            // handle: window.open

            if (!frameName) {
                // abort - no frame name provided.
                return;
            }

            let x = 0;
            let y = 0;

            let width = newWinOptions.width || MIN_WIDTH;
            let height = newWinOptions.height || MIN_HEIGHT;

            // try getting x and y position from query parameters
            var query = newWinParsedUrl && querystring.parse(newWinParsedUrl.query);
            if (query && query.x && query.y) {
                let newX = Number.parseInt(query.x, 10);
                let newY = Number.parseInt(query.y, 10);

                let newWinRect = {x: newX, y: newY, width, height};

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
                ({x, y} = getWindowSizeAndPosition(mainWindow));
                x += 50;
                y += 50;
            }

            /* eslint-disable no-param-reassign */
            newWinOptions.x = x;
            newWinOptions.y = y;
            newWinOptions.width = Math.max(width, MIN_WIDTH);
            newWinOptions.height = Math.max(height, MIN_HEIGHT);
            newWinOptions.minWidth = MIN_WIDTH;
            newWinOptions.minHeight = MIN_HEIGHT;

            let newWinKey = getGuid();

            newWinOptions.winKey = newWinKey;
            /* eslint-enable no-param-reassign */

            let webContents = newWinOptions.webContents;

            webContents.once('did-finish-load', function () {
                let browserWin = BrowserWindow.fromWebContents(webContents);

                if (browserWin) {
                    browserWin.winName = frameName;

                    browserWin.once('closed', function () {
                        removeWindowKey(newWinKey);
                        browserWin.removeListener('move', throttledBoundsChange);
                        browserWin.removeListener('resize', throttledBoundsChange);
                    });

                    addWindowKey(newWinKey, browserWin);

                    // throttle changes so we don't flood client.
                    let throttledBoundsChange = throttle(1000,
                        sendChildWinBoundsChange.bind(null, browserWin));
                    browserWin.on('move', throttledBoundsChange);
                    browserWin.on('resize', throttledBoundsChange);
                }
            });
        }
    });

    contextMenu(mainWindow);
}

app.on('before-quit', function () {
    willQuitApp = true;
});

function saveMainWinBounds() {
    let newBounds = getWindowSizeAndPosition(mainWindow);

    if (newBounds) {
        updateConfigField('mainWinPos', newBounds);
    }
}

function getMainWindow() {
    return mainWindow;
}

function getWindowSizeAndPosition(window) {
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

    return null;
}

function showMainWindow() {
    mainWindow.show();
}

function isMainWindow(win) {
    return mainWindow === win;
}

function hasWindow(win, winKey) {
    if (win instanceof BrowserWindow) {
        let browserWin = windows[winKey];
        return browserWin && win === browserWin;
    }

    return false;
}

function setIsOnline(status) {
    isOnline = status;
}

/**
 * Tries finding a window we have created with given name.  If founds then
 * brings to front and gives focus.
 * @param  {String} windowName Name of target window. Note: main window has
 * name 'main'.
 */
function activate(windowName) {
    let keys = Object.keys(windows);
    for (let i = 0, len = keys.length; i < len; i++) {
        let window = windows[keys[i]];
        if (window && !window.isDestroyed() && window.winName === windowName) {
            if (window.isMinimized()) {
                window.restore();
            } else {
                window.show();
            }
            return;
        }
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

module.exports = {
    createMainWindow: createMainWindow,
    getMainWindow: getMainWindow,
    showMainWindow: showMainWindow,
    isMainWindow: isMainWindow,
    hasWindow: hasWindow,
    setIsOnline: setIsOnline,
    activate: activate,
    setBoundsChangeWindow: setBoundsChangeWindow
};
