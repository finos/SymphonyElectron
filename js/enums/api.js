'use strict';

let keyMirror = require('keymirror');

/**
 * Set of APIs exposed to the remote object
 * @type {Object}
 */
const cmds = keyMirror({
    isOnline: null,
    registerLogger: null,
    setBadgeCount: null,
    badgeDataUrl: null,
    activate: null,
    registerBoundsChange: null,
    registerProtocolHandler: null,
    registerActivityDetection: null,
    showNotificationSettings: null,
});

module.exports = {
    cmds: cmds,
    apiName: 'symphony-api'
};
