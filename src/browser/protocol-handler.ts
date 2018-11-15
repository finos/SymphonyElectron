import * as url from 'url';

import { isMac } from '../common/env';
import {logger} from '../common/logger';
import { getCommandLineArgs } from '../common/utils';
import { windowHandler } from './window-handler';

let protocolWindow: Electron.WebContents;
let protocolUrl: string | undefined;

/**
 * Caches the protocol uri
 * @param {String} uri - the uri opened in the format 'symphony://...'
 */
const setProtocolUrl = (uri: string): void => {
    logger.info(`Setting the property protocol url to ${uri}`);
    protocolUrl = uri;
};

/**
 * Processes a protocol uri
 * @param {String} uri - the uri opened in the format 'symphony://abc?def=ghi'
 */
const processProtocolUri = (uri: string): void => {

    logger.info(`Processing protocol action, uri ${uri}`);
    if (!protocolWindow) {
        logger.info(`protocol window not yet initialized, caching the uri ${uri}`);
        setProtocolUrl(uri);
        return;
    }

    if (uri && uri.startsWith('symphony://')) {
        logger.info(`triggering the protocol action for the uri ${uri}`);
        protocolWindow.send('protocol-action', uri);
    }
};

/**
 * Handles a protocol action based on the current state of the app
 * @param uri
 * @param isAppAlreadyOpen {Boolean} whether the app is already open
 */
const handleProtocolAction = (uri: string, isAppAlreadyOpen: boolean): void => {

    if (!isAppAlreadyOpen) {

        logger.info(`App started by protocol url ${uri}. We are caching this to be processed later!`);

        // app is opened by the protocol url, cache the protocol url to be used later
        setProtocolUrl(uri);
        return;
    }

    // This is needed for mac OS as it brings pop-outs to foreground
    // (if it has been previously focused) instead of main window
    if (isMac) {
        logger.info('Bringing the main window to foreground for focus and processing the protocol url (macOS)');
        const mainWindow = windowHandler.getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            // windowMgr.activate(mainWindow.winName);
        }
    }

    // app is already open, so, just trigger the protocol action method
    logger.info(`App opened by protocol url ${uri}`);
    processProtocolUri(uri);
};

/**
 * Processes protocol action for windows clients
 * @param argv {Array} an array of command line arguments
 * @param isAppAlreadyOpen {Boolean} whether the app is already open
 */
const processProtocolArgv = (argv: string[], isAppAlreadyOpen: boolean): void => {

    // In case of windows, we need to handle protocol handler
    // manually because electron doesn't emit
    // 'open-url' event on windows
    if (!(process.platform === 'win32')) {
        logger.info('This is windows, not processing protocol url through arguments');
        return;
    }

    const protocolUri = getCommandLineArgs(argv, 'symphony://', false);
    logger.info(`Trying to process a protocol action for uri ${protocolUri}`);

    if (protocolUri) {
        const parsedURL = url.parse(protocolUri);
        if (!parsedURL.protocol || !parsedURL.slashes) {
            return;
        }
        logger.info(`Successfully parsed protocol url for ${parsedURL}`);
        handleProtocolAction(protocolUri, isAppAlreadyOpen);
    }
};

/**
 * Sets the protocol window
 * @param {Object} win - the renderer window
 */
const setProtocolWindow = (win: Electron.WebContents): void => {
    logger.info(`Setting protocol window ${win}`);
    protocolWindow = win;
};

/**
 * Checks to see if the app was opened by a uri
 */
const checkProtocolAction = (): void => {
    logger.info('Checking if we have a cached protocol url');
    if (protocolUrl) {
        logger.info(`Found a cached protocol url (${protocolUrl}), processing it`);
        processProtocolUri(protocolUrl);
        logger.info('Resetting the protocol url to undefined post processing it');
        protocolUrl = undefined;
    }
};

/**
 * Gets the protocol url set against an instance
 * @returns {*}
 */
const getProtocolUrl = (): string | undefined => {
    logger.info(`Getting the property protocol url ${protocolUrl}`);
    return protocolUrl;
};

export {processProtocolUri, processProtocolArgv, setProtocolWindow, checkProtocolAction, getProtocolUrl};