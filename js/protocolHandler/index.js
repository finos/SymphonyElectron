/**
 * Created by vishwas on 04/05/17.
 */
'use strict';

let protocolWindow;
var protocolUrl;

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

module.exports = {
    processProtocolAction: processProtocolAction,
    setProtocolWindow: setProtocolWindow,
    checkProtocolAction: checkProtocolAction,
    setProtocolUrl: setProtocolUrl
};
