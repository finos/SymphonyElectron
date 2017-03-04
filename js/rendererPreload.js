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

// hold ref so doesn't get GC'ed
const local = {
    ipcRenderer: ipcRenderer
};

const api = 'symphony-api';

// API exposed by Symphony to renderer processes:
// Note: certain cmds are only allowed on some windows, this is checked by
// main process.
window.SYM_API = {
    // api version
    version: '1.0.0',

    // only allowed by main window - enforced by main process.
    openWindow: function(url) {
        local.ipcRenderer.send(api, {
            cmd: 'open',
            url: url
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
            local.ipcRenderer.send(api, {
                cmd: 'registerLogger'
            });
        }
    }
};

// listen for log message from main process
local.ipcRenderer.on('log', (event, arg) => {
    if (local.logger && arg && arg.level && arg.msg) {
        local.logger({
            logLevel: arg.level,
            logDetails: arg.msg
        });
    }
});

function updateOnlineStatus() {
    local.ipcRenderer.send(api, {
        cmd: 'isOnline',
        isOnline: window.navigator.onLine
    });
}

window.addEventListener('offline', updateOnlineStatus, false);
window.addEventListener('online', updateOnlineStatus, false);

updateOnlineStatus();

Object.freeze(window.SYM_API);
