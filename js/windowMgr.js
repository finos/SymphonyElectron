'use strict';

const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const path = require('path');
const nodeURL = require('url');
const querystring = require('querystring');
const filesize = require('filesize');

const { getTemplate, getMinimizeOnClose } = require('./menus/menuTemplate.js');
const loadErrors = require('./dialogs/showLoadError.js');
const isInDisplayBounds = require('./utils/isInDisplayBounds.js');
const getGuid = require('./utils/getGuid.js');
const log = require('./log.js');
const logLevels = require('./enums/logLevels.js');
const notify = require('./notify/electron-notify.js');
const eventEmitter = require('./eventEmitter');

const throttle = require('./utils/throttle.js');
const { getConfigField, updateConfigField } = require('./config.js');
const { isMac, isNodeEnv } = require('./utils/misc');

// show dialog when certificate errors occur
require('./dialogs/showCertError.js');

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

    log.send(logLevels.INFO, 'creating main window url: ' + url);

    let newWinOpts = {
        title: 'Symphony',
        show: true,
        minWidth: MIN_WIDTH,
        minHeight: MIN_HEIGHT,
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

    // will set the main window on top as per the user prefs
    if (alwaysOnTop){
        newWinOpts.alwaysOnTop = alwaysOnTop;
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
            // updates the notify config with user preference
            notify.updateConfig({position: position, display: display});
            // removes all existing notifications when main window reloads
            notify.reset();
            log.send(logLevels.INFO, 'loaded main window url: ' + url);

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

    // bug in electron is preventing this from working in sandboxed evt...
    // https://github.com/electron/electron/issues/8841
    mainWindow.webContents.on('will-navigate', function(event, willNavUrl) {
        if (!sandboxed) {
            return;
        }
        event.preventDefault();
        openUrlInDefaultBrower(willNavUrl);
    });

    // open external links in default browser - a tag with href='_blank' or window.open
    mainWindow.webContents.on('new-window', function (event, newWinUrl,
                                                      frameName, disposition, newWinOptions) {

        let newWinParsedUrl = getParsedUrl(newWinUrl);
        let mainWinParsedUrl = getParsedUrl(url);

        let newWinHost = newWinParsedUrl && newWinParsedUrl.host;
        let mainWinHost = mainWinParsedUrl && mainWinParsedUrl.host;

        // only allow window.open to succeed is if coming from same hsot,
        // otherwise open in default browser.
        if (disposition === 'new-window' && newWinHost === mainWinHost) {
            // handle: window.open

            if (!frameName) {
                // abort - no frame name provided.
                return;
            }

            log.send(logLevels.INFO, 'creating pop-out window url: ' + newWinParsedUrl);

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
            newWinOptions.alwaysOnTop = alwaysOnTop;

            let newWinKey = getGuid();

            newWinOptions.winKey = newWinKey;
            /* eslint-enable no-param-reassign */

            let webContents = newWinOptions.webContents;

            webContents.once('did-finish-load', function () {
                let browserWin = BrowserWindow.fromWebContents(webContents);

                if (browserWin) {
                    log.send(logLevels.INFO, 'loaded pop-out window url: ' + newWinParsedUrl);

                    browserWin.winName = frameName;
                    browserWin.setAlwaysOnTop(alwaysOnTop);

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
        } else {
            event.preventDefault();
            openUrlInDefaultBrower(newWinUrl)
        }
    });

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

function openUrlInDefaultBrower(urlToOpen) {
    if (urlToOpen) {
        electron.shell.openExternal(urlToOpen);
    }
}

/**
 * Called when an event is received from menu
 * @param boolean weather to enable or disable alwaysOnTop.
 */
function isAlwaysOnTop(boolean) {
    alwaysOnTop = boolean;
    let browserWins = BrowserWindow.getAllWindows();
    if (browserWins.length > 0) {
        browserWins.forEach(function (browser) {
            browser.setAlwaysOnTop(boolean);
        });
    }
}

// node event emitter to update always on top
eventEmitter.on('isAlwaysOnTop', (boolean) => {
    isAlwaysOnTop(boolean);
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
    if (!mainWindow || isMac){
        return;
    }

    const bounds = mainWindow.getBounds();
    if (bounds) {
        let isXAxisValid = true;
        let isYAxisValid = true;

        // checks to make sure the x,y are valid pairs
        if ((bounds.x === undefined && (bounds.y || bounds.y === 0))){
            isXAxisValid = false;
        }
        if ((bounds.y === undefined && (bounds.x || bounds.x === 0))){
            isYAxisValid = false;
        }

        if (!isXAxisValid && !isYAxisValid){
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
    const screen = electron.screen;

    // Loops through all the available displays and
    // verifies if the wrapper exists within the display bounds
    // returns false if not exists otherwise true
    return !!screen.getAllDisplays().find(({bounds}) => {

        const leftMost = x + (width * factor);
        const topMost = y + (height * factor);
        const rightMost = x + width - (width * factor);
        const bottomMost = y + height - (height * factor);

        if (leftMost < bounds.x || topMost < bounds.y) {
            return false;
        }

        if (rightMost > bounds.x + bounds.width || bottomMost > bounds.y + bounds.height) {
            return false;
        }

        return true;
    });
}

/**
 * Method that resets the main window bounds when an external display
 * was removed and if the wrapper was contained within that bounds
 */
function repositionMainWindow() {
    const screen = electron.screen;

    const {workArea} = screen.getPrimaryDisplay();
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

    let rectangle = {x, y, width: windowWidth, height: windowHeight};

    // resetting the main window bounds
    if (mainWindow){
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
    verifyDisplays: verifyDisplays
};
