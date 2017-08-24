'use strict';

let keyMirror = require('keymirror');

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
