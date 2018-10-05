import * as url from 'url';

// import log from '../logs';
// import { LogLevels } from '../logs/interface';
import getCmdLineArg from '../common/get-command-line-args';
import { isMac } from '../common/mics';
import { windowHandler } from './window-handler';

let protocolWindow: Electron.WebContents;
let protocolUrl: string | undefined;

/**
 * processes a protocol uri
 * @param {String} uri - the uri opened in the format 'symphony://...'
 */
export function processProtocolUri(uri: string): void {
    // log.send(LogLevels.INFO, `protocol action, uri ${uri}`);
    if (!protocolWindow) {
        // log.send(LogLevels.INFO, `protocol window not yet initialized, caching the uri ${uri}`);
        setProtocolUrl(uri);
        return;
    }

    if (uri && uri.startsWith('symphony://')) {
        protocolWindow.send('protocol-action', uri);
    }
}

/**
 * processes protocol action for windows clients
 * @param argv {Array} an array of command line arguments
 * @param isAppAlreadyOpen {Boolean} whether the app is already open
 */
export function processProtocolArgv(argv: string[], isAppAlreadyOpen: boolean): void {
    // In case of windows, we need to handle protocol handler
    // manually because electron doesn't emit
    // 'open-url' event on windows
    if (!(process.platform === 'win32')) {
        return;
    }

    const protocolUri = getCmdLineArg(argv, 'symphony://', false);
    // log.send(LogLevels.INFO, `Trying to process a protocol action for uri ${protocolUri}`);

    if (protocolUri) {
        const parsedURL = url.parse(protocolUri);
        if (!parsedURL.protocol || !parsedURL.slashes) {
            return;
        }
        // log.send(LogLevels.INFO, `Parsing protocol url successful for ${parsedURL}`);
        handleProtocolAction(protocolUri, isAppAlreadyOpen);
    }
}

/**
 * Handles a protocol action based on the current state of the app
 * @param uri
 * @param isAppAlreadyOpen {Boolean} whether the app is already open
 */
export function handleProtocolAction(uri: string, isAppAlreadyOpen: boolean): void {
    if (!isAppAlreadyOpen) {
        // log.send(LogLevels.INFO, `App started by protocol url ${uri}. We are caching this to be processed later!`);
        // app is opened by the protocol url, cache the protocol url to be used later
        setProtocolUrl(uri);
        return;
    }

    // This is needed for mac OS as it brings pop-outs to foreground
    // (if it has been previously focused) instead of main window
    if (isMac) {
        const mainWindow = windowHandler.getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            // windowMgr.activate(mainWindow.winName);
        }
    }
    // app is already open, so, just trigger the protocol action method
    // log.send(LogLevels.INFO, `App opened by protocol url ${uri}`);
    processProtocolUri(uri);
}

/**
 * sets the protocol window
 * @param {Object} win - the renderer window
 */
export function setProtocolWindow(win: Electron.WebContents): void {
    protocolWindow = win;
}

/**
 * checks to see if the app was opened by a uri
 */
export function checkProtocolAction(): void {
    // log.send(LogLevels.INFO, `checking if we have a cached protocol url`);
    if (protocolUrl) {
        // log.send(LogLevels.INFO, `found a cached protocol url, processing it!`);
        processProtocolUri(protocolUrl);
        protocolUrl = undefined;
    }
}

/**
 * caches the protocol uri
 * @param {String} uri - the uri opened in the format 'symphony://...'
 */
export function setProtocolUrl(uri: string): void {
    protocolUrl = uri;
}

/**
 * gets the protocol url set against an instance
 * @returns {*}
 */
export function getProtocolUrl(): string | undefined {
    return protocolUrl;
}