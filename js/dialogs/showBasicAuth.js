'use strict';

const electron = require('electron');

const basicAuth = require('../basicAuth');

/**
 * Having a proxy or hosts that requires authentication will allow user to
 * enter their credentials 'username' & 'password'
 */
electron.app.on('login', (event, webContents, request, authInfo, callback) => {

    event.preventDefault();

    // name of the host to display
    let hostname = authInfo.host || authInfo.realm;
    let browserWin = electron.BrowserWindow.fromWebContents(webContents);
    let windowName = browserWin.winName || '';

    /**
     * Opens an electron modal window in which
     * user can enter credentials fot the host
     */
    basicAuth.openBasicAuthWindow(windowName, hostname, callback);
});
