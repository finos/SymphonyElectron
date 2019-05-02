import { ipcRenderer, remote } from 'electron';

import { buildNumber } from '../../package.json';
import { ICustomBrowserWindow } from '../app/window-handler';
import {
    apiCmds,
    apiName,
    IBadgeCount,
    IBoundsChange,
    ILogMsg,
    IScreenSharingIndicator,
    IScreenSharingIndicatorOptions,
    IScreenSnippet,
    IVersionInfo,
    KeyCodes,
    LogLevel,
} from '../common/api-interface';
import { i18n, LocaleType } from '../common/i18n-preload';
import { throttle } from '../common/utils';
import { getSource } from './desktop-capturer';
import { ScreenSnippetBcHandler } from './screen-snippet-bc-handler';

let isAltKey: boolean = false;
let isMenuOpen: boolean = false;

interface ICryptoLib {
    AESGCMEncrypt: (name: string, base64IV: string, base64AAD: string, base64Key: string, base64In: string) => string | null;
    AESGCMDecrypt: (base64IV: string, base64AAD: string, base64Key: string, base64In: string) => string | null;
}

export interface ILocalObject {
    ipcRenderer;
    logger?: (msg: ILogMsg, logLevel: LogLevel, showInConsole: boolean) => void;
    activityDetectionCallback?: (arg: number) => void;
    screenSnippetCallback?: (arg: IScreenSnippet) => void;
    boundsChangeCallback?: (arg: IBoundsChange) => void;
    screenSharingIndicatorCallback?: (arg: IScreenSharingIndicator) => void;
    protocolActionCallback?: (arg: string) => void;
}

const local: ILocalObject = {
    ipcRenderer,
};

// Throttle func
const throttledSetBadgeCount = throttle((count) => {
    local.ipcRenderer.send(apiName.symphonyApi, {
        cmd: apiCmds.setBadgeCount,
        count,
    });
}, 1000);

const throttledSetLocale = throttle((locale) => {
    local.ipcRenderer.send(apiName.symphonyApi, {
        cmd: apiCmds.setLocale,
        locale,
    });
}, 1000);

const throttledActivate = throttle((windowName) => {
    local.ipcRenderer.send(apiName.symphonyApi, {
        cmd: apiCmds.activate,
        windowName,
    });
}, 1000);

const throttledBringToFront = throttle((windowName, reason) => {
    local.ipcRenderer.send(apiName.symphonyApi, {
        cmd: apiCmds.bringToFront,
        windowName,
        reason,
    });
}, 1000);

const throttledCloseScreenShareIndicator = throttle((streamId) => {
    ipcRenderer.send(apiName.symphonyApi, {
        cmd: apiCmds.closeWindow,
        windowType: 'screen-sharing-indicator',
        winKey: streamId,
    });
}, 1000);

const throttledSetIsInMeetingStatus = throttle((isInMeeting) => {
    local.ipcRenderer.send(apiName.symphonyApi, {
        cmd: apiCmds.setIsInMeeting,
        isInMeeting,
    });
}, 1000);

let cryptoLib: ICryptoLib | null;
try {
    cryptoLib = remote.require('../app/crypto-handler.js').cryptoLibrary;
} catch (e) {
    cryptoLib = null;
    // tslint:disable-next-line
    console.warn('Failed to initialize Crypto Lib. You\'ll need to include the Crypto library. Contact the developers for more details');
}

let swiftSearch: any;
try {
    swiftSearch = remote.require('swift-search').Search;
} catch (e) {
    swiftSearch = null;
    // tslint:disable-next-line
    console.warn("Failed to initialize swift search. You'll need to include the search dependency. Contact the developers for more details");
}

let swiftSearchUtils: any;
try {
    swiftSearchUtils = remote.require('swift-search').SearchUtils;
} catch (e) {
    swiftSearchUtils = null;
    // tslint:disable-next-line
    console.warn("Failed to initialize swift search utils. You'll need to include the search dependency. Contact the developers for more details");
}

let nextIndicatorId = 0;

export class SSFApi {

    /**
     * Native encryption and decryption.
     */
    public CryptoLib: ICryptoLib | null = cryptoLib; // tslint:disable-line

    public Search: any = swiftSearch; // tslint:disable-line

    public SearchUtils: any = swiftSearchUtils; // tslint:disable-line

    /**
     * Implements equivalent of desktopCapturer.getSources - that works in
     * a sandboxed renderer process.
     * see: https://electron.atom.io/docs/api/desktop-capturer/
     * for interface: see documentation in desktopCapturer/getSource.js
     *
     * This opens a window and displays all the desktop sources
     * and returns selected source
     */
    public getMediaSource = getSource;

    /**
     * Brings window forward and gives focus.
     *
     * @param  {String} windowName - Name of window. Note: main window name is 'main'
     */
    public activate(windowName: string) {
        if (typeof windowName === 'string') {
            throttledActivate(windowName);
        }
    }

    /**
     * Brings window forward and gives focus.
     *
     * @param  {String} windowName Name of window. Note: main window name is 'main'
     * @param {String} reason, The reason for which the window is to be activated
     */
    public bringToFront(windowName: string, reason: string) {
        if (typeof windowName === 'string') {
            throttledBringToFront(windowName, reason);
        }
    }

    /**
     * Method that returns various version info
     */
    public getVersionInfo(): Promise<IVersionInfo> {
        const appName = remote.app.getName();
        const appVer = remote.app.getVersion();

        return Promise.resolve({
            containerIdentifier: appName,
            containerVer: appVer,
            buildNumber,
            apiVer: '2.0.0',
            searchApiVer: '3.0.0',
        });
    }

    /**
     * Allows JS to register a activity detector that can be used by electron main process.
     *
     * @param  {Object} period - minimum user idle time in millisecond
     * @param  {Object} activityDetectionCallback - function that can be called accepting
     * @example registerActivityDetection(40000, func)
     */
    public registerActivityDetection(period: number, activityDetectionCallback: (arg: number) => void): void {
        if (typeof activityDetectionCallback === 'function') {
            local.activityDetectionCallback = activityDetectionCallback;

            // only main window can register
            local.ipcRenderer.send(apiName.symphonyApi, {
                cmd: apiCmds.registerActivityDetection,
                period,
            });
        }
    }

    /**
     * Allows JS to register a callback to be invoked when size/positions
     * changes for any pop-out window (i.e., window.open). The main
     * process will emit IPC event 'boundsChange' (see below). Currently
     * only one window can register for bounds change.
     * @param  {Function} callback Function invoked when bounds changes.
     */
    public registerBoundsChange(callback: (arg: IBoundsChange) => void): void {
        if (typeof callback === 'function') {
            local.boundsChangeCallback = callback;
        }
    }

    /**
     * Allows JS to register a logger that can be used by electron main process.
     * @param  {Object} logger  function that can be called accepting
     * object: {
     *  logLevel: 'ERROR'|'CONFLICT'|'WARN'|'ACTION'|'INFO'|'DEBUG',
     *  logDetails: String
     *  }
     */
    public registerLogger(logger: (msg: ILogMsg, logLevel: LogLevel, showInConsole: boolean) => void) {
        if (typeof logger === 'function') {
            local.logger = logger;

            // only main window can register
            local.ipcRenderer.send(apiName.symphonyApi, {
                cmd: apiCmds.registerLogger,
            });
        }
    }

    /**
     * Allows JS to register a protocol handler that can be used by the
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
    public registerProtocolHandler(protocolHandler) {
        if (typeof protocolHandler === 'function') {

            local.protocolActionCallback = protocolHandler;

            local.ipcRenderer.send(apiName.symphonyApi, {
                cmd: apiCmds.registerProtocolHandler,
            });

        }
    }

    /**
     * Expose old screen snippet api to support backward compatibility
     *
     * @deprecated
     */
    // tslint:disable-next-line
    public ScreenSnippet = ScreenSnippetBcHandler;

    /**
     * Allow user to capture portion of screen
     *
     * @param screenSnippetCallback {function}
     */
    public openScreenSnippet(screenSnippetCallback: (arg: IScreenSnippet) => void): void {
        if (typeof screenSnippetCallback === 'function') {
            local.screenSnippetCallback = screenSnippetCallback;

            local.ipcRenderer.send(apiName.symphonyApi, {
                cmd: apiCmds.openScreenSnippet,
            });
        }
    }

    /**
     * Sets the count on the tray icon to the given number.
     *
     * @param {number} count  count to be displayed
     * note: count of 0 will remove the displayed count.
     * note: for mac the number displayed will be 1 to infinity
     * note: for windows the number displayed will be 1 to 99 and 99+
     */
    public setBadgeCount(count: number): void {
        throttledSetBadgeCount(count);
    }

    /**
     * Sets the language which updates the application locale
     *
     * @param {string} locale - language identifier and a region identifier
     * @example: setLocale(en-US | ja-JP)
     */
    public setLocale(locale): void {
        if (typeof locale === 'string') {
            i18n.setLocale(locale as LocaleType);
            throttledSetLocale(locale);
        }
    }

    /**
     * Sets if the user is in an active meeting
     * will be used to handle memory refresh functionality
     */
    public setIsInMeeting(isInMeeting): void {
        throttledSetIsInMeetingStatus(isInMeeting);
    }

    /**
     * Opens a modal window to configure notification preference.
     */
    public showNotificationSettings(): void {
        const windowName = (remote.getCurrentWindow() as ICustomBrowserWindow).winName;
        local.ipcRenderer.send(apiName.symphonyApi, {
            cmd: apiCmds.showNotificationSettings,
            windowName,
        });
    }

    /**
     * Shows a banner that informs user that the screen is being shared.
     *
     * @param options object with following fields:
     *    - stream https://developer.mozilla.org/en-US/docs/Web/API/MediaStream/MediaStream object.
     *             The indicator automatically destroys itself when stream becomes inactive (see MediaStream.active).
     *    - displayId id of the display that is being shared or that contains the shared app
     * @param callback callback function that will be called to handle events.
     * Callback receives event object { type: string }. Types:
     *    - 'error' - error occured. Event object contains 'reason' field.
     *    - 'stopRequested' - user clicked "Stop Sharing" button.
     */
    public showScreenSharingIndicator(options: IScreenSharingIndicatorOptions, callback): void {
        const { displayId, stream } = options;

        if (!stream || !stream.active || stream.getVideoTracks().length !== 1) {
            callback({type: 'error', reason: 'bad stream'});
            return;
        }
        if (displayId && typeof(displayId) !== 'string') {
            callback({type: 'error', reason: 'bad displayId'});
            return;
        }

        const destroy = () => {
            throttledCloseScreenShareIndicator(stream.id);
            stream.removeEventListener('inactive', destroy);
        };

        stream.addEventListener('inactive', destroy);

        if (typeof callback === 'function') {
            local.screenSharingIndicatorCallback = callback;
            ipcRenderer.send(apiName.symphonyApi, {
                cmd: apiCmds.openScreenSharingIndicator,
                displayId,
                id: ++nextIndicatorId,
                streamId: stream.id,
            });
        }
    }

    /**
     * Shows a banner that informs user that the screen is being shared.
     *
     * @param options object with following fields:
     *    - streamId unique id of stream
     *    - displayId id of the display that is being shared or that contains the shared app
     *    - requestId id to match the exact request
     * @param callback callback function that will be called to handle events.
     * Callback receives event object { type: string }. Types:
     *    - 'error' - error occured. Event object contains 'reason' field.
     *    - 'stopRequested' - user clicked "Stop Sharing" button.
     */
    public openScreenSharingIndicator(options: IScreenSharingIndicatorOptions, callback): void {
        const { displayId, requestId, streamId } = options;

        if (typeof callback === 'function') {
            local.screenSharingIndicatorCallback = callback;
            ipcRenderer.send(apiName.symphonyApi, {
                cmd: apiCmds.openScreenSharingIndicator,
                displayId,
                id: requestId,
                streamId,
            });
        }
    }

    /**
     * Closes the screen sharing indicator
     */
    public closeScreenSharingIndicator(winKey: string): void {
        throttledCloseScreenShareIndicator(winKey);
    }

}

/**
 * Ipc events
 */

/**
 * An event triggered by the main process
 * to construct a canvas for the Windows badge count image
 *
 * @param {IBadgeCount} arg {
 *     count: number
 * }
 */
local.ipcRenderer.on('create-badge-data-url', (_event: Event, arg: IBadgeCount) => {
    const count = arg && arg.count || 0;

    // create 32 x 32 img
    const radius = 16;
    const canvas = document.createElement('canvas');
    canvas.height = radius * 2;
    canvas.width = radius * 2;

    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(radius, radius, radius, 0, 2 * Math.PI, false);
        ctx.fill();
        ctx.textAlign = 'center';
        ctx.fillStyle = 'white';

        const text = count > 99 ? '99+' : count.toString();
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
        const dataUrl = canvas.toDataURL('image/png', 1.0);

        local.ipcRenderer.send(apiName.symphonyApi, {
            cmd: apiCmds.badgeDataUrl,
            count,
            dataUrl,
        });
    }
});

/**
 * An event triggered by the main process
 * when the snippet is complete
 *
 * @param {IScreenSnippet} arg {
 *     message: string,
 *     data: base64,
 *     type: 'ERROR' | 'image/jpg;base64',
 * }
 */
local.ipcRenderer.on('screen-snippet-data', (_event: Event, arg: IScreenSnippet) => {
    if (typeof arg === 'object' && typeof local.screenSnippetCallback === 'function') {
        local.screenSnippetCallback(arg);
    }
});

/**
 * An event triggered by the main process
 * for ever few minutes if the user is active
 *
 * @param {number} idleTime - current system idle tick
 */
local.ipcRenderer.on('activity', (_event: Event, idleTime: number) => {
    if (typeof idleTime === 'number' && typeof local.activityDetectionCallback === 'function') {
        local.activityDetectionCallback(idleTime);
    }
});

/**
 * An event triggered by the main process
 * Whenever some Window position or dimension changes
 *
 * @param {IBoundsChange} arg {
 *     x: number,
 *     y: number,
 *     height: number,
 *     width: number,
 *     windowName: string
 * }
 *
 */
local.ipcRenderer.on('boundsChange', (_event, arg: IBoundsChange): void => {
    const { x, y, height, width, windowName } = arg;
    if (x && y && height && width && windowName && typeof local.boundsChangeCallback === 'function') {
        local.boundsChangeCallback({
            x,
            y,
            height,
            width,
            windowName,
        });
    }
});

/**
 * An event triggered by the main process
 * when the screen sharing has been stopper
 */
local.ipcRenderer.on('screen-sharing-stopped', (_event, id) => {
    if (typeof local.screenSharingIndicatorCallback === 'function') {
        local.screenSharingIndicatorCallback({ type: 'stopRequested', requestId: id });
    }
});

/**
 * An event triggered by the main process
 * for send logs on to web app
 *
 * @param {object} arg {
 *      msgs: ILogMsg[],
 *      logLevel: LogLevel,
 *      showInConsole: boolean
 * }
 *
 */
local.ipcRenderer.on('log', (_event, arg) => {
    if (arg && local.logger) {
        local.logger(arg.msgs || [], arg.logLevel, arg.showInConsole);
    }
});

/**
 * An event triggered by the main process for processing protocol urls
 * @param {String} arg - the protocol url
 */
local.ipcRenderer.on('protocol-action', (_event, arg: string) => {
    if (typeof local.protocolActionCallback === 'function' && typeof arg === 'string') {
        local.protocolActionCallback(arg);
    }
});

// Invoked whenever the app is reloaded/navigated
const sanitize = (): void => {
    if (window.name === apiName.mainWindowName) {
        local.ipcRenderer.send(apiName.symphonyApi, {
            cmd: apiCmds.sanitize,
            windowName: window.name,
        });
    }
};

// listens for the online/offline events and updates the main process
const updateOnlineStatus = (): void => {
    local.ipcRenderer.send(apiName.symphonyApi, {
        cmd: apiCmds.isOnline,
        isOnline: window.navigator.onLine,
    });
};

// Handle key down events
const throttledKeyDown = throttle((event) => {
    isAltKey = event.keyCode === KeyCodes.Alt;
    if (event.keyCode === KeyCodes.Esc) {
        local.ipcRenderer.send(apiName.symphonyApi, {
            cmd: apiCmds.keyPress,
            keyCode: event.keyCode,
        });
    }
}, 500);

// Handle key up events
const throttledKeyUp = throttle((event) => {
    if (isAltKey && (event.keyCode === KeyCodes.Alt || KeyCodes.Esc)) {
        isMenuOpen = !isMenuOpen;
    }
    if (isAltKey && isMenuOpen && event.keyCode === KeyCodes.Alt) {
        local.ipcRenderer.send(apiName.symphonyApi, {
            cmd: apiCmds.keyPress,
            keyCode: event.keyCode,
        });
    }
}, 500);

// Handle mouse down event
const throttleMouseDown = throttle(() => {
    if (isAltKey && isMenuOpen) {
        isMenuOpen = !isMenuOpen;
    }
}, 500);

/**
 * Window Events
 */

window.addEventListener('beforeunload', sanitize, false);
window.addEventListener('offline', updateOnlineStatus, false);
window.addEventListener('online', updateOnlineStatus, false);
window.addEventListener('keyup', throttledKeyUp, true);
window.addEventListener('keydown', throttledKeyDown, true);
window.addEventListener('mousedown', throttleMouseDown, { capture: true });
