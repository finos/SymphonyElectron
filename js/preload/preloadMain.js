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

const { ipcRenderer } = require('electron');

const apiEnums = require('../enums/api.js');
const apiCmds = apiEnums.cmds;
const apiName = apiEnums.apiName;

// hold ref so doesn't get GC'ed
const local = {
    ipcRenderer: ipcRenderer
};

//
// API exposed to renderer main window process.
//
window.SYM_API = {
    // api version
    version: '1.0.0',

    openWindow: function(url) {
        local.ipcRenderer.send(apiName, {
            cmd: apiCmds.open,
            url: url
        });
    },

    /**
     * sets the count on the tray icon to the given number.
     * @param {number} count  count to be displayed
     * note: count of 0 will remove the displayed count.
     * note: for mac the number displayed will be 0 to 49 and 50+
     * note: for windws the number displayed will be 0 to 9 and 10+ (since imgs
     * are used here).
     */
    setBadgeCount: function(count) {
        local.ipcRenderer.send(apiName, {
            cmd: apiCmds.setBadgeCount,
            count: count
        });
    },

    /**
     * allows JS to register a logger that can be used by electron main process.
     * @param  {Object} logger  function that can be called accepting
     * object: {
     *  logLevel: 'ERROR'|'CONFLICT'|'WARN'|'ACTION'|'INFO'|'DEBUG',
     *  logDetails: String
     *  }
     *
     *  note: only main window is allowed to register a logger, others are
     *  ignored.
     */
    registerLogger: function(logger) {
        if (typeof logger === 'function') {
            local.logger = logger;

            // only main window can register
            local.ipcRenderer.send(apiName, {
                cmd: apiCmds.registerLogger
            });
        }
    }
};

Object.freeze(window.SYM_API);

// listen for log message from main process
local.ipcRenderer.on('log', (arg) => {
    if (local.logger && arg && arg.level && arg.msg) {
        local.logger({
            logLevel: arg.level,
            logDetails: arg.msg
        });
    }
});

/**
 * Use render process to create badge count img and send back to main process.
 * If number is greater than 99 then 99+ img is returned.
 * note: with sandboxing turned on only get arg and no event passed in, so
 * need to use ipcRenderer to callback to main process.
 * @type {object}  arg.count - number: count to be displayed
 */
local.ipcRenderer.on('createBadgeDataUrl', (arg) => {
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

function updateOnlineStatus() {
    local.ipcRenderer.send(apiName, {
        cmd: apiCmds.isOnline,
        isOnline: window.navigator.onLine
    });
}

window.addEventListener('offline', updateOnlineStatus, false);
window.addEventListener('online', updateOnlineStatus, false);

updateOnlineStatus();
