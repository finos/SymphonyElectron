'use strict';

var keyMirror = require('keymirror');

const cmds = keyMirror({
    isOnline: null,
    open: null,
    registerLogger: null,
    setBadgeCount: null,
    badgeDataUrl: null,
});

module.exports = {
    cmds: cmds,
    apiName: 'symphony-api'
}
