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

// API exposed by Symphony to renderer processes:
// Note: certain cmds are only allowed on some windows, this is checked by
// main process.
window.SYM_API = {
    version: '1.0.0', // api version

    // only allowed by main window - enforced by main process.
    openWindow: function(url) {
        local.ipcRenderer.send('symphony-msg', {
            cmd: 'open',
            url: url
        });
    },
    networkStatusChange: function(isOnline) {
        local.ipcRenderer.send('symphony-msg', {
            cmd: 'isOnline',
            isOnline: isOnline
        });
    }
};

function updateOnlineStatus() {
    window.SYM_API.networkStatusChange(navigator.onLine);
}

window.addEventListener('offline', updateOnlineStatus, false);
window.addEventListener('online', updateOnlineStatus, false);

updateOnlineStatus();

Object.freeze(window.SYM_API);
