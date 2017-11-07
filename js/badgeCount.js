'use strict';

const electron = require('electron');
const app = electron.app;
const nativeImage = electron.nativeImage;

const { isMac } = require('./utils/misc.js');
const windowMgr = require('./windowMgr.js');
const maxCount = 1e8;
const log = require('./log.js');
const logLevels = require('./enums/logLevels.js');

/**
 * Shows the badge count
 * @param count
 */
function show(count) {
    if (typeof count !== 'number') {
        log.send(logLevels.WARN, 'badgeCount: invalid func arg, must be a number: ' + count);
        return;
    }

    if (isMac) {
        // too big of a number here and setBadgeCount crashes
        app.setBadgeCount(Math.min(maxCount, count));
        return;
    }

    // handle ms windows...
    const mainWindow = windowMgr.getMainWindow();

    if (mainWindow) {
        if (count > 0) {
            // get badge img from renderer process, will return
            // img dataUrl in setDataUrl func.
            mainWindow.send('createBadgeDataUrl', { count: count });
        } else {
            // clear badge count icon
            mainWindow.setOverlayIcon(null, '');
        }
    }
}

/**
 * Sets the data url
 * @param dataUrl
 * @param count
 */
function setDataUrl(dataUrl, count) {
    const mainWindow = windowMgr.getMainWindow();
    if (mainWindow && dataUrl && count) {
        let img = nativeImage.createFromDataURL(dataUrl);
        // for accessibility screen readers
        const desc = 'Symphony has ' + count + ' unread messages';
        mainWindow.setOverlayIcon(img, desc);
    }
}

module.exports = {
    show: show,
    setDataUrl: setDataUrl
};
