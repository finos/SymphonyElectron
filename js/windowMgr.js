'use strict';

const fs = require('fs');
const electron = require('electron');
const app = electron.app;
const crashReporter = electron.crashReporter;
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

// By default, we set the user's default download directory
let defaultDownloadsDirectory = app.getPath("downloads");
let downloadsDirectory = defaultDownloadsDirectory;

// note: this file is built using browserify in prebuild step.
const preloadMainScript = path.join(__dirname, 'preload/_preloadMain.js');

const MIN_WIDTH = 300;
const MIN_HEIGHT = 300;

// Default window size for pop-out windows
const DEFAULT_WIDTH = 300;
const DEFAULT_HEIGHT = 600;

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
 * @param url
 * @returns {Url}
 */
function getParsedUrl(url) {
    return nodeURL.parse(url);
}

/**
 * Creates the main window
 * @param initialUrl
 */
function createMainWindow(initialUrl) {
    getConfigField('mainWinPos').then(
        function (bounds) {
            doCreateMainWindow(initialUrl, bounds);
        },
        function () {
            // failed, use default bounds
            doCreateMainWindow(initialUrl, null);
        }
    );
}

/**
 * Creates the main window with bounds
 * @param initialUrl
 * @param initialBounds
 */
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
        for (let i = 0, len = keys.length; i < len; i++) {
            let winKey = keys[i];
            removeWindowKey(winKey);
        }

        mainWindow = null;
    }

    mainWindow.on('closed', destroyAllWindows);
    
    // if an user has set a custom downloads directory,
    // we get that data from the user config file
    getConfigField('downloadsDirectory')
        .then((value) => {
            downloadsDirectory = value;
        })
        .catch((error) => {
            log.send(logLevels.ERROR, 'Could not find the downloads directory config -> ' + error);
        });
    
    // Manage File Downloads
    mainWindow.webContents.session.on('will-download', (event, item, webContents) => {
        
        // When download is in progress, send necessary data to indicate the same
        webContents.send('downloadProgress');
        
        // An extra check to see if the user created downloads directory has been deleted
        // This scenario can occur when user doesn't quit electron and continues using it
        // across days and then deletes the folder.
        if (downloadsDirectory !== defaultDownloadsDirectory && !fs.existsSync(downloadsDirectory)) {
            downloadsDirectory = defaultDownloadsDirectory;
            updateConfigField("downloadsDirectory", downloadsDirectory);
        }
        
        // We check the downloads directory to see if a file with the similar name
        // already exists and get a unique filename if that's the case
        let newFileName = getUniqueFileName(item.getFilename());
        item.setSavePath(downloadsDirectory + "/" + newFileName);
        
        // Send file path to construct the DOM in the UI when the download is complete
        item.once('done', (e, state) => {
            if (state === 'completed') {
                let data = {
                    _id: getGuid(),
                    savedPath: item.getSavePath() ? item.getSavePath() : '',
                    total: filesize(item.getTotalBytes() ? item.getTotalBytes() : 0),
                    fileName: newFileName
                };
                webContents.send('downloadCompleted', data);
            }
        });
    });

    getConfigField('url')
    .then(initializeCrashReporter)
    .catch(app.quit);
    
    function initializeCrashReporter(podUrl) {        
        getConfigField('crashReporter')
        .then((crashReporterConfig) => {
            log.send(logLevels.INFO, 'Initializing crash reporter on the main window!');
            crashReporter.start({companyName: crashReporterConfig.companyName, submitURL: crashReporterConfig.submitURL, uploadToServer: crashReporterConfig.uploadToServer, extra: {'process': 'renderer / main window', podUrl: podUrl}});
            log.send(logLevels.INFO, 'initialized crash reporter on the main window!');
            mainWindow.webContents.send('register-crash-reporter', {companyName: crashReporterConfig.companyName, submitURL: crashReporterConfig.submitURL, uploadToServer: crashReporterConfig.uploadToServer, process: 'preload script / main window renderer'});
        })
        .catch((err) => {                        
            log.send(logLevels.ERROR, 'Unable to initialize crash reporter in the main window. Error is -> ' + err);
        });
    }    

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

            let width = newWinOptions.width || DEFAULT_WIDTH;
            let height = newWinOptions.height || DEFAULT_HEIGHT;

            // try getting x and y position from query parameters
            let query = newWinParsedUrl && querystring.parse(newWinParsedUrl.query);
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
            newWinOptions.width = Math.max(width, DEFAULT_WIDTH);
            newWinOptions.height = Math.max(height, DEFAULT_HEIGHT);
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

                    if (!isMac) {
                        // Removes the menu bar from the pop-out window
                        // setMenu is currently only supported on Windows and Linux
                        browserWin.setMenu(null);
                    }

                    getConfigField('url')
                    .then((podUrl) => {
                        getConfigField('crashReporter')
                        .then((crashReporterConfig) => {                            
                            crashReporter.start({companyName: crashReporterConfig.companyName, submitURL: crashReporterConfig.submitURL, uploadToServer: crashReporterConfig.uploadToServer, extra: {'process': 'renderer / child window', podUrl: podUrl}});
                            log.send(logLevels.INFO, 'initialized crash reporter on a child window!');
                            browserWin.webContents.send('register-crash-reporter', {companyName: crashReporterConfig.companyName, submitURL: crashReporterConfig.submitURL, uploadToServer: crashReporterConfig.uploadToServer, process: 'preload script / child window renderer'});
                        })
                        .catch((err) => {
                            log.send(logLevels.ERROR, 'Unable to initialize crash reporter in the child window. Error is -> ' + err);
                        });
                    })
                    .catch(app.quit);

                    browserWin.winName = frameName;
                    browserWin.setAlwaysOnTop(alwaysOnTop);

                    let handleChildWindowClosed = () => {
                        removeWindowKey(newWinKey);
                        browserWin.removeListener('move', throttledBoundsChange);
                        browserWin.removeListener('resize', throttledBoundsChange);                        
                    };

                    browserWin.once('closed', () => {
                        handleChildWindowClosed();
                    });

                    browserWin.on('close', () => {
                        browserWin.webContents.removeListener('new-window', handleChildNewWindowEvent);
                        browserWin.webContents.removeListener('crashed', handleChildWindowCrashEvent);
                    });

                    let handleChildWindowCrashEvent = () => {
                        const options = {
                            type: 'error',
                            title: 'Renderer Process Crashed',
                            message: 'Oops! Looks like we have had a crash. Please reload or close this window.',
                            buttons: ['Reload', 'Close']
                        };

                        electron.dialog.showMessageBox(options, function (index) {
                            if (index === 0) {
                                browserWin.reload();
                            }
                            else {
                                browserWin.close();
                            }
                        });
                    };

                    browserWin.webContents.on('crashed', handleChildWindowCrashEvent);

                    let handleChildNewWindowEvent = (childEvent, childWinUrl) => {
                        childEvent.preventDefault();
                        openUrlInDefaultBrowser(childWinUrl);
                    };
                    
                    // In case we navigate to an external link from inside a pop-out,
                    // we open that link in an external browser rather than creating
                    // a new window
                    browserWin.webContents.on('new-window', handleChildNewWindowEvent);                

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
                }
            });
        } else {
            event.preventDefault();
            openUrlInDefaultBrowser(newWinUrl);
        }
    });

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
 * @param boolean weather to enable or disable alwaysOnTop.
 */
function isAlwaysOnTop(boolean) {
    alwaysOnTop = boolean;
    let browserWins = BrowserWindow.getAllWindows();
    if (browserWins.length > 0) {
        browserWins.forEach(function (browser) {
            browser.setAlwaysOnTop(boolean);
        });

        // An issue where changing the alwaysOnTop property
        // focus the pop-out window
        // Issue - Electron-209
        if (mainWindow && mainWindow.winName) {
            activate(mainWindow.winName);
        }
    }
}

// node event emitter to update always on top
eventEmitter.on('isAlwaysOnTop', (boolean) => {
    isAlwaysOnTop(boolean);
});

// set downloads directory
eventEmitter.on('setDownloadsDirectory', (newDirectory) => {
    downloadsDirectory = newDirectory;
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

        return !(rightMost > bounds.x + bounds.width || bottomMost > bounds.y + bounds.height);

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

/**
 * Creates a unique filename like Chrome
 * from a user's download directory
 * @param filename filename passed by the remote server
 * @returns {String} the new filename
 */
function getUniqueFileName(filename) {
    
    // By default, we assume that the file exists
    const fileExists = true;
    
    // We break the file from it's extension to get the name
    const actualFilename = filename.substr(0, filename.lastIndexOf('.')) || filename;
    const fileType = filename.split('.').pop();
    
    // We use this to set the new file name with an increment on the previous existing file
    let fileNumber = 0;
    let newPath;
    
    while (fileExists) {
        
        let fileNameString = fileNumber.toString();
        
        // By default, we know if the file doesn't exist,
        // we can use the filename sent by the remote server
        let current = filename;
        
        // If the file already exists, we know that the
        // file number variable is increased, so,
        // we construct a new file name with the file number
        if (fileNumber > 0) {
            current = actualFilename + " (" + fileNameString + ")." + fileType;
        }
        
        // If the file exists, increment the file number and repeat the loop
        if (fs.existsSync(downloadsDirectory + "/" + current)) {
            fileNumber++;
        } else {
            newPath = current;
            break;
        }
        
    }
    
    return newPath;
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
