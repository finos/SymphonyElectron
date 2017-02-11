// script run before others and still has access to node integration, even
// when turned off - also us to leak only what want into window object.
// see: http://electron.atom.io/docs/api/browser-window/
//
// to leak some node module into:
// https://medium.com/@leonli/securing-embedded-external-content-in-electron-node-js-8b6ef665cd8e#.fex4e68p7
// https://slack.engineering/building-hybrid-applications-with-electron-dc67686de5fb#.tp6zz1nrk
// as suggested above: consider injecting key into window that can be used to
// validate operations.
//
// also to bring pieces of node.js:
// https://github.com/electron/electron/issues/2984
//

const { ipcRenderer } = require('electron');

// hold ref so doesn't get GC'ed
const local = {
    ipcRenderer: ipcRenderer
}

// JS can detect if in wrapper mode by looking for window.ELECTRON_API obj
window.ELECTRON_API = {
};

Object.freeze(window.ELECTRON_API);
