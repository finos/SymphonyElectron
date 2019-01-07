import * as electron from 'electron';
import { i18n } from '../common/i18n';
import { logger } from '../common/logger';
import { ICustomBrowserWindow, windowHandler } from './window-handler';

let currentAuthURL;
let tries = 0;

electron.app.on('login', (event, webContents, request, authInfo, callback) => {
    event.preventDefault();

    // This check is to determine whether the request is for the same
    // host if so then increase the login tries from which we can
    // display invalid credentials
    if (currentAuthURL !== request.url) {
        currentAuthURL = request.url;
        tries = 0;
    } else {
        tries++;
    }

    // name of the host to display
    const hostname = authInfo.host || authInfo.realm;
    const browserWin: ICustomBrowserWindow = electron.BrowserWindow.fromWebContents(webContents) as ICustomBrowserWindow;

    /**
     * Method that resets currentAuthURL and tries
     * if user closes the auth window
     */
    const clearSettings = () => {
        currentAuthURL = '';
        tries = 0;
    };

    /**
     * Opens an electron modal window in which
     * user can enter credentials fot the host
     */
    windowHandler.createBasicAuthWindow(browserWin, hostname, tries === 0, clearSettings, callback);
});

/**
 * Show dialog pinned to given window when loading error occurs
 *
 * @param  browserWindow        {BrowserWindow} Window to host dialog
 * @param  url                  {String} Url that failed
 * @param  errorDesc            {String} Description of error
 * @param  errorCode            {Number} Error code
 * @param  retryCallback        {function} Callback when user clicks reload
 * @param  showDialog           {Boolean} Indicates if a dialog need to be show to a user
 */
export const showLoadFailure = (browserWindow: Electron.BrowserWindow, url: string, errorDesc: string, errorCode: number, retryCallback: () => void, showDialog: boolean): void => {
    let message = url ? `${i18n.t('Error loading URL')()}:\n${url}` : i18n.t('Error loading window')();
    if (errorDesc) message += `\n\n${errorDesc}`;
    if (errorCode) message += `\n\nError Code: ${errorCode}`;

    // async handle of user input
    const response = (buttonId: number): void => {
        // retry if hitting button index 0 (i.e., reload)
        if (buttonId === 0 && typeof retryCallback === 'function') {
            retryCallback();
        }
    };

    if (showDialog) {
        electron.dialog.showMessageBox(browserWindow, {
            type: 'error',
            buttons: [ i18n.t('Reload')(), i18n.t('Ignore')() ],
            defaultId: 0,
            cancelId: 1,
            noLink: true,
            title: i18n.t('Loading Error')(),
            message,
        }, response);
    }

    logger.warn(`Load failure msg: ${errorDesc} errorCode: ${errorCode} for url: ${url}`);
};

/**
 * Show message indicating network connectivity has been lost.
 *
 * @param  browserWindow  {BrowserWindow}   Window to host dialog
 * @param  url            {String}          Url that failed
 * @param  retryCallback  {function}        Callback when user clicks reload
 */
export const showNetworkConnectivityError = (browserWindow: Electron.BrowserWindow, url: string = '', retryCallback: () => void): void => {
    const errorDesc = i18n.t('Network connectivity has been lost. Check your internet connection.')();
    showLoadFailure(browserWindow, url, errorDesc, 0, retryCallback, true);
};