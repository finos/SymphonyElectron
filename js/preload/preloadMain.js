'use strict';

// script run before others and still has access to node integration, even
// when turned off - allows us to leak only what want into window object.
// see: http://electron.atom.io/docs/api/browser-window/
//
// to leak some node module into:
// https://medium.com/@leonli/securing-embedded-external-content-in-electron-node-js-8b6ef665cd8e#.fex4e68p7
// https://slack.engineering/building-hybrid-applications-with-electron-dc67686de5fb#.tp6zz1nrk
//
// also to bring pieces of node.js:
// https://github.com/electron/electron/issues/2984
//
const { ipcRenderer, remote, crashReporter, webFrame } = require('electron');

const throttle = require('../utils/throttle.js');
const apiEnums = require('../enums/api.js');
const apiCmds = apiEnums.cmds;
const apiName = apiEnums.apiName;
const getMediaSources = require('../desktopCapturer/getSources');
const getMediaSource = require('../desktopCapturer/getSource');
const showScreenSharingIndicator = require('../screenSharingIndicator/showScreenSharingIndicator');
const { TitleBar } = require('../windowsTitlebar');
const titleBar = new TitleBar();
const { buildNumber } = require('../../package.json');
const SnackBar = require('../snackBar').SnackBar;
const KeyCodes = {
    Esc: 27,
    Alt: 18,
};

let Search;
let SearchUtils;
let CryptoLib;
let isAltKey = false;
let isMenuOpen = false;

try {
    Search = remote.require('swift-search').Search;
} catch (e) {
    // eslint-disable-next-line no-console
    console.warn("Failed to initialize swift search. You'll need to include the search dependency. Contact the developers for more details");
}

try {
    SearchUtils = remote.require('swift-search').SearchUtils;
} catch (e) {
    // eslint-disable-next-line no-console
    console.warn("Failed to initialize swift search (Utils). You'll need to include the search dependency. Contact the developers for more details");
}

try {
    CryptoLib = remote.require('./cryptoLib.js');
} catch (e) {
    CryptoLib = null;
    // eslint-disable-next-line no-console
    console.warn("Failed to initialize Crypto Lib. You'll need to include the Crypto library. Contact the developers for more details");
}

require('../downloadManager');
let snackBar;

// hold ref so doesn't get GC'ed
const local = {
    ipcRenderer: ipcRenderer
};

// throttle calls to this func to at most once per sec, called on leading edge.
const throttledSetBadgeCount = throttle(1000, function (count) {
    local.ipcRenderer.send(apiName, {
        cmd: apiCmds.setBadgeCount,
        count: count
    });
});

const throttledSetIsInMeetingStatus = throttle(1000, function (isInMeeting) {
    local.ipcRenderer.send(apiName, {
        cmd: apiCmds.setIsInMeeting,
        isInMeeting
    });
});

/**
 * an event triggered by the main process onload event
 */
local.ipcRenderer.on('on-page-load', () => {
    snackBar = new SnackBar();

    webFrame.setSpellCheckProvider('en-US', true, {
        spellCheck(text) {
            return !local.ipcRenderer.sendSync(apiName, {
                cmd: apiCmds.isMisspelled,
                text
            });
        }
    });

    // only registers main window's preload
    if (window.name === 'main') {
        local.ipcRenderer.send(apiName, {
            cmd: apiCmds.optimizeMemoryRegister,
        });
    }
});

const throttledActivate = throttle(1000, function (windowName) {
    local.ipcRenderer.send(apiName, {
        cmd: apiCmds.activate,
        windowName: windowName
    });
});

const throttledBringToFront = throttle(1000, function (windowName, reason) {
    local.ipcRenderer.send(apiName, {
        cmd: apiCmds.bringToFront,
        windowName: windowName,
        reason: reason
    });
});

const throttledSetLocale = throttle(1000, function (locale) {
    local.ipcRenderer.send(apiName, {
        cmd: apiCmds.setLocale,
        locale,
    });
});

createAPI();

// creates API exposed from electron.
// wrapped in a function so we can abort early in function coming from an iframe
function createAPI() {
    // iframes (and any other non-top level frames) get no api access
    // http://stackoverflow.com/questions/326069/how-to-identify-if-a-webpage-is-being-loaded-inside-an-iframe-or-directly-into-t/326076
    if (window.self !== window.top) {
        return;
    }

    // note: window.open from main window (if in the same domain) will get
    // api access.  window.open in another domain will be opened in the default
    // browser (see: handler for event 'new-window' in windowMgr.js)

    //
    // API exposed to renderer process.
    //
    window.ssf = {
        getVersionInfo: function () {
            return new Promise(function (resolve) {
                let appName = remote.app.getName();
                let appVer = remote.app.getVersion();

                const verInfo = {
                    containerIdentifier: appName,
                    containerVer: appVer,
                    buildNumber: buildNumber,
                    apiVer: '2.0.0',
                    searchApiVer: '3.0.0'
                };
                resolve(verInfo);
            });
        },

        /**
         * sets the count on the tray icon to the given number.
         * @param {number} count  count to be displayed
         * note: count of 0 will remove the displayed count.
         * note: for mac the number displayed will be 1 to infinity
         * note: for windws the number displayed will be 1 to 99 and 99+
         */
        setBadgeCount: function (count) {
            throttledSetBadgeCount(count);
        },

        /**
         * provides api similar to html5 Notification, see details
         * in notify/notifyImpl.js
         */
        Notification: remote.require('./notify/notifyImpl.js'),

        /**
         * provides api to allow user to capture portion of screen, see api
         * details in screenSnipper/index.js
         */
        ScreenSnippet: remote.require('./screenSnippet/index.js').ScreenSnippet,

        /**
         * Provides api for client side searching
         * using the SymphonySearchEngine library
         * details in ./search/search.js & ./search/searchLibrary.js
         */
        Search: Search || null,

        /**
         * Provides api for search module utils
         * like checking free space / search user config data to the client app
         * details in ./search/searchUtils.js & ./search/searchConfig.js
         */
        SearchUtils: SearchUtils || null,

        /**
         * Native encryption and decryption.
         */
        CryptoLib: CryptoLib,

        /**
         * Brings window forward and gives focus.
         * @param  {String} windowName Name of window. Note: main window name is 'main'
         */
        activate: function (windowName) {
            if (typeof windowName === 'string') {
                throttledActivate(windowName);
            }
        },

        /**
         * Brings window forward and gives focus.
         * @param  {String} windowName Name of window. Note: main window name is 'main'
         * @param {String} reason, The reason for which the window is to be activated
         */
        bringToFront: function (windowName, reason) {
            if (typeof windowName === 'string') {
                throttledBringToFront(windowName, reason);
            }
        },

        /**
         * Allows JS to register a callback to be invoked when size/positions
         * changes for any pop-out window (i.e., window.open). The main
         * process will emit IPC event 'boundsChange' (see below). Currently
         * only one window can register for bounds change.
         * @param  {Function} callback Function invoked when bounds changes.
         */
        registerBoundsChange: function (callback) {
            if (typeof callback === 'function') {
                local.boundsChangeCallback = callback;
                local.ipcRenderer.send(apiName, {
                    cmd: apiCmds.registerBoundsChange
                });
            }
        },

        /**
         * allows JS to register a logger that can be used by electron main process.
         * @param  {Object} logger  function that can be called accepting
         * object: {
         *  logLevel: 'ERROR'|'CONFLICT'|'WARN'|'ACTION'|'INFO'|'DEBUG',
         *  logDetails: String
         *  }
         */
        registerLogger: function (logger) {
            if (typeof logger === 'function') {
                local.logger = logger;

                // only main window can register
                local.ipcRenderer.send(apiName, {
                    cmd: apiCmds.registerLogger
                });
            }
        },

        /**
         * allows JS to register a protocol handler that can be used by the
         * electron main process.
         *
         * @param protocolHandler {Function} callback will be called when app is
         * invoked with registered protocol (e.g., symphony). The callback
         * receives a single string argument: full uri that the app was
         * invoked with e.g., symphony://?streamId=xyz123&streamType=chatroom
         *
         * Note: this function should only be called after client app is fully
         * able for protocolHandler callback to be invoked.  It is possible
         * the app was started using protocol handler, in this case as soon as
         * this registration func is invoked then the protocolHandler callback
         * will be immediately called.
         */
        registerProtocolHandler: function (protocolHandler) {
            if (typeof protocolHandler === 'function') {

                local.processProtocolAction = protocolHandler;

                local.ipcRenderer.send(apiName, {
                    cmd: apiCmds.registerProtocolHandler
                });

            }
        },

        /**
         * allows JS to register a activity detector that can be used by electron main process.
         * @param  {Object} activityDetection - function that can be called accepting
         * @param  {Object} period - minimum user idle time in millisecond
         * object: {
         *  period: Number
         *  systemIdleTime: Number
         *  }
         */
        registerActivityDetection: function (period, activityDetection) {
            if (typeof activityDetection === 'function') {
                local.activityDetection = activityDetection;

                // only main window can register
                local.ipcRenderer.send(apiName, {
                    cmd: apiCmds.registerActivityDetection,
                    period: period
                });
            }
        },

        /**
         * Implements equivalent of desktopCapturer.getSources - that works in
         * a sandboxed renderer process.
         * see: https://electron.atom.io/docs/api/desktop-capturer/
         * for interface: see documentation in desktopCapturer/getSources.js
         *
         * @deprecated instead use getMediaSource
         */
        getMediaSources: getMediaSources,

        /**
         * Implements equivalent of desktopCapturer.getSources - that works in
         * a sandboxed renderer process.
         * see: https://electron.atom.io/docs/api/desktop-capturer/
         * for interface: see documentation in desktopCapturer/getSource.js
         *
         * This opens a window and displays all the desktop sources
         * and returns selected source
         */
        getMediaSource: getMediaSource,

        /**
         * Shows a banner that informs user that the screen is being shared.
         *
         * @param params object with following fields:
         *    - stream https://developer.mozilla.org/en-US/docs/Web/API/MediaStream/MediaStream object.
         *             The indicator automatically destroys itself when stream becomes inactive (see MediaStream.active).
         *    - displayId id of the display that is being shared or that contains the shared app
         * @param callback callback function that will be called to handle events.
         * Callback receives event object { type: string }. Types:
         *    - 'error' - error occured. Event object contains 'reason' field.
         *    - 'stopRequested' - user clicked "Stop Sharing" button.
         */
        showScreenSharingIndicator: showScreenSharingIndicator,

        /**
         * Opens a modal window to configure notification preference.
         */
        showNotificationSettings: function () {
            let windowName = remote.getCurrentWindow().winName;
            local.ipcRenderer.send(apiName, {
                cmd: apiCmds.showNotificationSettings,
                windowName: windowName
            });
        },

        /**
         * Sets if the user is in an active meeting
         * will be used to handle memory refresh functionality
         */
        setIsInMeeting: function (isInMeeting) {
            throttledSetIsInMeetingStatus(isInMeeting);
        },

        /**
         * Sets the language which updates the application locale
         * @param {string} locale - language identifier and a region identifier
         * Ex: en-US, ja-JP
         */
        setLocale: function (locale) {
            if (typeof locale === 'string') {
                throttledSetLocale(locale);
            }
        },

        /**
         * Allows JS to register activeRequests that can be used by electron to
         * get the active network request from the client
         *
         * @param activeRequests
         */
        registerActiveRequests: function (activeRequests) {
            if (typeof activeRequests === 'function') {
                local.activeRequests = activeRequests;
            }
        },
    };

    // add support for both ssf and SYM_API name-space.
    window.SYM_API = window.ssf;
    Object.freeze(window.ssf);
    Object.freeze(window.SYM_API);

    // listen for log message from main process
    local.ipcRenderer.on('log', (event, arg) => {
        if (arg && local.logger) {
            local.logger(arg.msgs || [], arg.logLevel, arg.showInConsole);
        }
    });

    // listen for notifications that some window size/position has changed
    local.ipcRenderer.on('boundsChange', (event, arg) => {
        if (local.boundsChangeCallback && arg.windowName &&
            arg.x && arg.y && arg.width && arg.height) {
            local.boundsChangeCallback({
                x: arg.x,
                y: arg.y,
                width: arg.width,
                height: arg.height,
                windowName: arg.windowName
            });
        }
    });

    // listen for user activity from main process
    local.ipcRenderer.on('activity', (event, arg) => {
        if (local.activityDetection && arg && typeof arg.systemIdleTime === 'number') {
            local.activityDetection(arg.systemIdleTime);
        }
    });

    /**
     * Use render process to create badge count img and send back to main process.
     * If number is greater than 99 then 99+ img is returned.
     * note: with sandboxing turned on only get arg and no event passed in, so
     * need to use ipcRenderer to callback to main process.
     * @type {object}  arg.count - number: count to be displayed
     */
    local.ipcRenderer.on('createBadgeDataUrl', (event, arg) => {
        const count = arg && arg.count || 0;

        // create 32 x 32 img
        let radius = 16;
        let canvas = document.createElement('canvas');
        canvas.height = radius * 2;
        canvas.width = radius * 2;

        let ctx = canvas.getContext('2d');

        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(radius, radius, radius, 0, 2 * Math.PI, false);
        ctx.fill();

        ctx.textAlign = 'center';
        ctx.fillStyle = 'white';

        let text = count > 99 ? '99+' : count.toString();

        if (text.length > 2) {
            ctx.font = 'bold 18px sans-serif';
            ctx.fillText(text, radius, 22);
        } else if (text.length > 1) {
            ctx.font = 'bold 24px sans-serif';
            ctx.fillText(text, radius, 24);
        } else {
            ctx.font = 'bold 26px sans-serif';
            ctx.fillText(text, radius, 26);
        }

        let dataUrl = canvas.toDataURL('image/png', 1.0);

        local.ipcRenderer.send(apiName, {
            cmd: apiCmds.badgeDataUrl,
            dataUrl: dataUrl,
            count: count
        });
    });

    /**
     * an event triggered by the main process for processing protocol urls
     * @type {String} arg - the protocol url
     */
    local.ipcRenderer.on('protocol-action', (event, arg) => {
        if (local.processProtocolAction && arg) {
            local.processProtocolAction(arg);
        }

    });

    /**
     * an event triggered by the main process to start crash reporter
     * in the render thread
     */
    local.ipcRenderer.on('register-crash-reporter', (event, arg) => {
        if (arg && typeof arg === 'object') {
            crashReporter.start(arg);
        }
    });

    // Adds custom title bar style for Windows 10 OS
    local.ipcRenderer.on('initiate-windows-title-bar', (event, arg) => {
        if (arg && typeof arg === 'string') {
            titleBar.initiateWindowsTitleBar(arg);
        }
    });

    /**
     * an event triggered by the main process when
     * the locale is changed
     * @param dataObj {Object} - locale content
     */
    local.ipcRenderer.on('locale-changed', (event, dataObj) => {
        if (dataObj && typeof dataObj === 'object') {
            if (dataObj.titleBar) {
                titleBar.updateLocale(dataObj.titleBar);
            }
        }
    });

    /**
     * an event triggered by the main process when
     * the window enters full screen
     */
    local.ipcRenderer.on('window-enter-full-screen', (event, arg) => {
        if (snackBar && typeof arg === 'object' && arg.snackBar) {
            setTimeout(() => snackBar.showSnackBar(arg.snackBar), 500);
        }
    });

    /**
     * an event triggered by the main process when
     * the window leave full screen
     */
    local.ipcRenderer.on('window-leave-full-screen', () => {
        if (snackBar) {
            snackBar.removeSnackBar();
        }
    });

    local.ipcRenderer.on('memory-info-request', () => {
        if (window.name === 'main') {
            const activeRequests = typeof local.activeRequests === 'function' ? local.activeRequests() : 0;
            local.ipcRenderer.send(apiName, {
                cmd: apiCmds.optimizeMemoryConsumption,
                activeRequests,
            });
        }
    });

    function updateOnlineStatus() {
        local.ipcRenderer.send(apiName, {
            cmd: apiCmds.isOnline,
            isOnline: window.navigator.onLine
        });
    }

    // Invoked whenever the app is reloaded/navigated
    function sanitize() {
        local.ipcRenderer.send(apiName, {
            cmd: apiCmds.sanitize,
            windowName: window.name || 'main'
        });
    }

    // Handle key down events
    const throttledKeyDown = throttle(500, (event) => {
        isAltKey = event.keyCode === KeyCodes.Alt;
        if (event.keyCode === KeyCodes.Esc) {
            local.ipcRenderer.send(apiName, {
                cmd: apiCmds.keyPress,
                keyCode: event.keyCode
            });
        }
    });

    // Handle key up events
    const throttledKeyUp = throttle(500, (event) => {
        if (isAltKey && (event.keyCode === KeyCodes.Alt || KeyCodes.Esc)) {
            isMenuOpen = !isMenuOpen;
        }
        if (isAltKey && isMenuOpen && event.keyCode === KeyCodes.Alt) {
            local.ipcRenderer.send(apiName, {
                cmd: apiCmds.keyPress,
                keyCode: event.keyCode
            });
        }
    });

    const throttleMouseDown = throttle(500, () => {
        if (isAltKey && isMenuOpen) {
            isMenuOpen = !isMenuOpen;
        }
    });

    window.addEventListener('offline', updateOnlineStatus, false);
    window.addEventListener('online', updateOnlineStatus, false);
    window.addEventListener('beforeunload', sanitize, false);
    window.addEventListener('keyup', throttledKeyUp, true);
    window.addEventListener('keydown', throttledKeyDown, true);
    window.addEventListener('mousedown', throttleMouseDown, { capture: true });

    updateOnlineStatus();
}
