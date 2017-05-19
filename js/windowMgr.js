'use strict';

const electron = require('electron');
const app = electron.app;
const path = require('path');
const nodeURL = require('url');
const querystring = require('querystring');
const {dialog} = require('electron');

const menuTemplate = require('./menus/menuTemplate.js');
const loadErrors = require('./dialogs/showLoadError.js');
const {isMac} = require('./utils/misc.js');
const isInDisplayBounds = require('./utils/isInDisplayBounds.js');
const getGuid = require('./utils/getGuid.js');
const log = require('./log.js');
const logLevels = require('./enums/logLevels.js');
const notify = require('./notify/electron-notify.js');

const activityDetection = require('./activityDetection/activityDetection.js');

const throttle = require('./utils/throttle.js');
const {getConfigField, updateConfigField} = require('./config.js');

const electronDl = require('electron-dl');

const crashReporter = require('./crashReporter');

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
let downloadWindow;

// note: this file is built using browserify in prebuild step.
const preloadMainScript = path.join(__dirname, 'preload/_preloadMain.js');

function addWindowKey(key, browserWin) {
    windows[key] = browserWin;
}

function removeWindowKey(key) {
    delete windows[key];
}

function getParsedUrl(url) {
    let parsedUrl = nodeURL.parse(url);
    return parsedUrl;
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

    /**
     * Get crash info from global config and setup crash reporter.
     */
    getConfigField('sendCrashReports').then(
        function (data) {
            crashReporter.setupCrashReporter({'window': 'main'}, data);
        }
    ).catch(function (err) {
        let title = 'Error loading configuration';
        electron.dialog.showErrorBox(title, title + ': ' + err);
    });

    let newWinOpts = {
        title: 'Symphony',
        show: true,
        webPreferences: {
            sandbox: true,
            nodeIntegration: false,
            preload: preloadMainScript,

        }
    };

    // set size and postion
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

    mainWindow = new electron.BrowserWindow(newWinOpts);
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
    // we might not have netowrk connectivity, so warn the user.
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

    // In case a renderer process crashes, provide an
    // option for the user to either reload or close the window
    mainWindow.webContents.on('crashed', function () {

        const options = {
            type: 'error',
            title: 'Renderer Process Crashed',
            message: 'Uh oh! Looks like we have had a crash. Please reload or close this window.',
            buttons: ['Reload', 'Close']
        };

        dialog.showMessageBox(options, function (index) {
            if (index === 0) {
                mainWindow.reload();
            }
            else {
                // Don't just close the app, quit it
                app.quit();
            }
        })
    });

    addWindowKey(key, mainWindow);
    mainWindow.loadURL(url);

    const menu = electron.Menu.buildFromTemplate(menuTemplate(app));
    electron.Menu.setApplicationMenu(menu);

    mainWindow.on('close', function (e) {
        if (willQuitApp) {
            destroyAllWindows();
            return;
        }
        // mac should hide window when hitting x close
        if (isMac) {
            mainWindow.hide();
            e.preventDefault();
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

    mainWindow.webContents.session.on('will-download', (event, item, webContents) => {
        item.on('updated', (event, state) => {
            if (state === 'interrupted') {
                console.log('Download is interrupted but can be resumed')
            } else if (state === 'progressing') {
                if (item.isPaused()) {
                    console.log('Download is paused')
                } else {
                    var val = {
                        progress: item.getReceivedBytes(),
                        total: item.getTotalBytes()
                    };
                    downloadWindow.send('downloadProgress', val)
                }
            }
        });

        // When download is complete
        item.once('done', (event, state) => {
            var filePath = item.getSavePath();
            if (state === 'completed') {
                const options = {
                    type: 'info',
                    title: 'Download completed',
                    message: 'Download completed',
                    buttons: ['Open', 'Close', 'Show in finder']
                };
                dialog.showMessageBox(options, function (index) {
                    if (index === 0) {
                        // Open file in default app
                        electron.shell.openExternal(`file:///${filePath}`)
                    }
                    if (index === 2) {
                        // Open file in finder/explorer
                        electron.shell.showItemInFolder(filePath)
                    }
                })
            } else {
                console.log(`Download failed: ${state}`)
            }
        });
    });

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

            let width = newWinOptions.width || 300;
            let height = newWinOptions.height || 600;

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
            newWinOptions.width = width;
            newWinOptions.height = height;

            let newWinKey = getGuid();

            newWinOptions.winKey = newWinKey;
            /* eslint-enable no-param-reassign */

            let webContents = newWinOptions.webContents;

            webContents.once('did-finish-load', function () {
                let browserWin = electron.BrowserWindow.fromWebContents(webContents);

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
    if (win instanceof electron.BrowserWindow) {
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
 * Executes file downloads when a URL is passed and saves it to the default
 * downloads folder on Windows and Mac
 * @param  {String} window Name of target window.
 * @param  {String} url URL of file to download.
 */
function downloadManager(url, window) {
    downloadWindow = window;

    // Send file URL for download
    electronDl.download(electron.BrowserWindow.getFocusedWindow(), url)
        .then(dl => console.log(dl.getSavePath()))
        .catch(console.error);
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
    downloadManager: downloadManager,
    setBoundsChangeWindow: setBoundsChangeWindow
};
