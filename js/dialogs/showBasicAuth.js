'use strict';

const electron = require('electron');

const basicAuth = require('../basicAuth');
let currentAuthURL;
let tries = 0;

/**
 * Having a proxy or hosts that requires authentication will allow user to
 * enter their credentials 'username' & 'password'
 */
electron.app.on('login', (event, webContents, request, authInfo, callback) => {

    event.preventDefault();

    // This check is to determine whether the request is for the same
    // host if so then increase the login tries from which we can
    // display invalid credentials
    if (currentAuthURL !== request.url) {
        currentAuthURL = request.url;
    } else {
        tries++
    }

    // name of the host to display
    let hostname = authInfo.host || authInfo.realm;
    let browserWin = electron.BrowserWindow.fromWebContents(webContents);
    let windowName = browserWin.winName || '';

    /**
     * Method that resets currentAuthURL and tries
     * if user closes the auth window
     */
    function clearSettings() {
        callback();
        currentAuthURL = '';
        tries = 0;
    }

    /**
     * Opens an electron modal window in which
     * user can enter credentials fot the host
     */
    basicAuth.openBasicAuthWindow(windowName, hostname, tries === 0, clearSettings, callback);
});
