'use strict';

const electron = require('electron');

let ignoreAllCertErrors = false;

/**
 * If certificate error occurs allow user to deny or allow particular certificate
 * error.  If user selects 'Ignore All', then all subsequent certificate errors
 * will ignored during this session.
 *
 * Note: the dialog is synchronous so further processing is blocked until
 * user provides a response.
 */
electron.app.on('certificate-error', function(event, webContents, url, error,
        certificate, callback) {

    if (ignoreAllCertErrors) {
        event.preventDefault();
        callback(true);
        return;
    }

    const browserWin = electron.BrowserWindow.fromWebContents(webContents);
    const buttonId = electron.dialog.showMessageBox(browserWin, {
        type: 'warning',
        buttons: [ 'Allow', 'Deny', 'Ignore All' ],
        defaultId: 1,
        cancelId: 1,
        noLink: true,
        title: 'Certificate Error',
        message: 'Certificate Error: ' + error + '\nURL: ' + url,
    });

    event.preventDefault();

    if (buttonId === 2) {
        ignoreAllCertErrors = true;
    }

    callback(buttonId !== 1);
});
