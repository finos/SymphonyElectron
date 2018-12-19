import { ipcRenderer, remote } from 'electron';

import { ICryptoLib } from '../browser/crypto-library-handler';
import {
    apiCmds,
    apiName,
    IActivityDetection,
    IBadgeCount,
    IScreenSnippet,
} from '../common/api-interface';
import { i18n, LocaleType } from '../common/i18n';
import { throttle } from '../common/utils';
import { getSource } from './desktop-capturer';

interface ILocalObject {
    ipcRenderer;
    activityDetection?: (arg: IActivityDetection) => void;
    screenSnippet?: (arg: IScreenSnippet) => void;
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
     * @param  {Object} activityDetection - function that can be called accepting
     * @example registerActivityDetection(40000, func)
     */
    public registerActivityDetection(period: number, activityDetection: Partial<ILocalObject>): void {
        if (typeof activityDetection === 'function') {
            local.activityDetection = activityDetection;

            // only main window can register
            local.ipcRenderer.send(apiName.symphonyApi, {
                cmd: apiCmds.registerActivityDetection,
                period,
            });
        }
    }

    /**
     * Allow user to capture portion of screen
     *
     * @param screenSnippet {function}
     */
    public openScreenSnippet(screenSnippet: Partial<IScreenSnippet>): void {
        if (typeof screenSnippet === 'function') {
            local.screenSnippet = screenSnippet;

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

}

/**
 * Ipc events
 */

// Creates a data url
ipcRenderer.on('create-badge-data-url', (_event: Event, arg: IBadgeCount) => {
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

ipcRenderer.on('screen-snippet-data', (_event: Event, arg: IScreenSnippet) => {
    if (typeof arg === 'object' && typeof local.screenSnippet === 'function') {
        local.screenSnippet(arg);
    }
});

ipcRenderer.on('activity', (_event: Event, arg: IActivityDetection) => {
    if (typeof arg === 'object' && typeof local.activityDetection === 'function') {
        local.activityDetection(arg);
    }
});

// Invoked whenever the app is reloaded/navigated
const sanitize = (): void => {
    local.ipcRenderer.send(apiName, {
        cmd: apiCmds.sanitize,
        windowName: window.name || 'main',
    });
};

/**
 * Window Events
 */

window.addEventListener('beforeunload', sanitize, false);