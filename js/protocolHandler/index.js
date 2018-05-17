'use strict';

const log = require('../log.js');
const logLevels = require('../enums/logLevels.js');

let protocolWindow;
let protocolUrl;

/**
 * processes a protocol uri
 * @param {String} uri - the uri opened in the format 'symphony://...'
 */
function processProtocolAction(uri) {
    log.send(logLevels.INFO, `protocol action, uri ${uri}`);
    
    if (!protocolWindow) {
        log.send(logLevels.INFO, `protocol window not yet initialized, caching the uri ${uri}`);
        setProtocolUrl(uri);
        return;
    }
    
    if (uri && uri.startsWith('symphony://')) {
        protocolWindow.send('protocol-action', uri);
    }
}

/**
 * sets the protocol window
 * @param {Object} win - the renderer window
 */
function setProtocolWindow(win) {
    protocolWindow = win;
}

/**
 * checks to see if the app was opened by a uri
 */
function checkProtocolAction() {
    log.send(logLevels.INFO, `checking if we have a cached protocol url`);
    if (protocolUrl) {
        log.send(logLevels.INFO, `found a cached protocol url, processing it!`);
        processProtocolAction(protocolUrl);
        protocolUrl = undefined;
    }
}

/**
 * caches the protocol uri
 * @param {String} uri - the uri opened in the format 'symphony://...'
 */
function setProtocolUrl(uri) {
    protocolUrl = uri;
}

/**
 * gets the protocol url set against an instance
 * @returns {*}
 */
function getProtocolUrl() {
    return protocolUrl;
}

module.exports = {
    processProtocolAction: processProtocolAction,
    setProtocolWindow: setProtocolWindow,
    checkProtocolAction: checkProtocolAction,
    setProtocolUrl: setProtocolUrl,
    getProtocolUrl: getProtocolUrl
};
