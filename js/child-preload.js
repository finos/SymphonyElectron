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

// API exposed by Symphony to a child window:
window.SYM_API = {
};

Object.freeze(window.SYM_API);
