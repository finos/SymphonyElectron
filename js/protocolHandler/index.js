'use strict';

let protocolWindow;
let protocolUrl;

/**
 * processes a protocol uri
 * @param {String} uri - the uri opened in the format 'symphony://...'
 */
function processProtocolAction(uri) {

    if (uri && protocolWindow) {
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
    if (protocolUrl && protocolWindow) {
        protocolWindow.send('protocol-action', protocolUrl);
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
