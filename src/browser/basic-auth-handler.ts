import * as electron from 'electron';
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
