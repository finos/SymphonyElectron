'use strict';

const electron = require('electron');

const log = require('../log.js');
const logLevels = require('../enums/logLevels.js');
const i18n = require('../translation/i18n');

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

    log.send(logLevels.WARNING, 'Certificate error: ' + error + ' for url: ' + url);

    const browserWin = electron.BrowserWindow.fromWebContents(webContents);
    const buttonId = electron.dialog.showMessageBox(browserWin, {
        type: 'warning',
        buttons: [ 'Allow', 'Deny', 'Ignore All' ],
        defaultId: 1,
        cancelId: 1,
        noLink: true,
        title: i18n.getMessageFor('Certificate Error'),
        message: i18n.getMessageFor('Certificate Error') + `: ${error}\nURL: ${url}`,
    });

    event.preventDefault();

    if (buttonId === 2) {
        ignoreAllCertErrors = true;
    }

    callback(buttonId !== 1);
});
