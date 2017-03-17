'use strict';

var keyMirror = require('keymirror');

const cmds = keyMirror({
    isOnline: null,
    open: null,
    registerLogger: null,
    setBadgeCount: null,
    badgeDataUrl: null
});

const proxyCmds = keyMirror({
    createObject: null,
    addEvent: null,
    removeEvent: null,
    eventCallback: null,
    invokeMethod: null,
    invokeResult: null,
    get: null,
    getResult: null,
    set: null
});

module.exports = {
    cmds: cmds,
    proxyCmds: proxyCmds,
    apiName: 'symphony-api'
}
