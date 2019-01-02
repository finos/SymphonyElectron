import { ipcRenderer, remote } from 'electron';

import { ICryptoLib } from '../browser/crypto-library-handler';
import {
    apiCmds,
    apiName,
    IActivityDetection,
    IBadgeCount,
    IBoundsChange, IScreenSharingIndicator,
    IScreenSnippet, KeyCodes,
} from '../common/api-interface';
import { i18n, LocaleType } from '../common/i18n-preload';
import { throttle } from '../common/throttle';
import { getSource } from './desktop-capturer';

let isAltKey: boolean = false;
let isMenuOpen: boolean = false;
let nextId = 0;

interface ILocalObject {
    ipcRenderer;
    activityDetectionCallback?: (arg: IActivityDetection) => void;
    screenSnippetCallback?: (arg: IScreenSnippet) => void;
    boundsChangeCallback?: (arg: IBoundsChange) => void;
    screenSharingIndicatorCallback?: (arg: IScreenSharingIndicator) => void;
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

let cryptoLib: ICryptoLib | null;
try {
    cryptoLib = remote.require('../browser/crypto-library-handler.js').cryptoLibrary;
} catch (e) {
    cryptoLib = null;
    // tslint:disable-next-line
    console.warn('Failed to initialize Crypto Lib. You\'ll need to include the Crypto library. Contact the developers for more details');
}

export class SSFApi {

    /**
     * Native encryption and decryption.
     */
    public CryptoLib: ICryptoLib | null = cryptoLib; // tslint:disable-line

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
     * Allows JS to register a activity detector that can be used by electron main process.
     *
     * @param  {Object} period - minimum user idle time in millisecond
     * @param  {Object} activityDetectionCallback - function that can be called accepting
     * @example registerActivityDetection(40000, func)
     */
    public registerActivityDetection(period: number, activityDetectionCallback: Partial<ILocalObject>): void {
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
    public registerBoundsChange(callback: () => void): void {
        if (typeof callback === 'function') {
            local.boundsChangeCallback = callback;
        }
    }

    /**
     * Allow user to capture portion of screen
     *
     * @param screenSnippetCallback {function}
     */
    public openScreenSnippet(screenSnippetCallback: Partial<IScreenSnippet>): void {
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
    public showScreenSharingIndicator(options, callback): void {
        const { stream, displayId } = options;

        if (typeof callback === 'function') {
            if (!stream || !stream.active || stream.getVideoTracks().length !== 1) {
                callback({ type: 'error', reason: 'bad stream' });
                return;
            }
            if (displayId && typeof (displayId) !== 'string') {
                callback({ type: 'error', reason: 'bad displayId' });
                return;
            }

            local.screenSharingIndicatorCallback = callback;
            const id = ++nextId;
            ipcRenderer.send(apiName.symphonyApi, {
                cmd: apiCmds.openScreenSharingIndicator,
                displayId: options.displayId,
                id,
            });
        }
    }

}

/**
 * Ipc events
 */

// Creates a data url
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

local.ipcRenderer.on('screen-snippet-data', (_event: Event, arg: IScreenSnippet) => {
    if (typeof arg === 'object' && typeof local.screenSnippetCallback === 'function') {
        local.screenSnippetCallback(arg);
    }
});

local.ipcRenderer.on('activity', (_event: Event, arg: IActivityDetection) => {
    if (typeof arg === 'object' && typeof local.activityDetectionCallback === 'function') {
        local.activityDetectionCallback(arg);
    }
});

// listen for notifications that some window size/position has changed
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

local.ipcRenderer.on('screen-sharing-stopped', () => {
    if (typeof local.screenSharingIndicatorCallback === 'function') {
        local.screenSharingIndicatorCallback({ type: 'stopRequested' });
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
const throttledKeyDown = throttle( (event) => {
    isAltKey = event.keyCode === KeyCodes.Alt;
}, 500);

// Handle key up events
const throttledKeyUp = throttle( (event) => {
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