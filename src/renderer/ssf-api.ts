import { ipcRenderer } from 'electron';

import { apiCmds, apiName } from '../common/api-interface';
import { throttle } from '../common/utils';

const local = {
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

export class SSFApi {
    /**
     * sets the count on the tray icon to the given number.
     * @param {number} count  count to be displayed
     * note: count of 0 will remove the displayed count.
     * note: for mac the number displayed will be 1 to infinity
     * note: for windws the number displayed will be 1 to 99 and 99+
     */
    public setBadgeCount(count: number): void {
        throttledSetBadgeCount(count);
    }

    /**
     * Sets the language which updates the application locale
     * @param {string} locale - language identifier and a region identifier
     * Ex: en-US, ja-JP
     */
    public setLocale(locale): void {
        if (typeof locale === 'string') {
            throttledSetLocale(locale);
        }
    }

}

/**
 * Ipc events
 */

// Creates a data url
ipcRenderer.on('create-badge-data-url', (arg) => {
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