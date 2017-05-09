/**
 * Created by vishwas on 04/05/17.
 */
'use strict';

let protocolWindow;
var protocolUrl;

function processProtocolAction(uri) {

    if (uri && protocolWindow) {
        protocolWindow.send('protocol-action', uri);
    }

}

function setProtocolWindow(win) {
    protocolWindow = win;
}

function checkProtocolAction() {
    if (protocolUrl && protocolWindow) {
        protocolWindow.send('protocol-action', protocolUrl);
        protocolUrl = undefined;
    }
}

function setProtocolUrl(url) {
    protocolUrl = url;
}

module.exports = {
    processProtocolAction: processProtocolAction,
    setProtocolWindow: setProtocolWindow,
    checkProtocolAction: checkProtocolAction,
    setProtocolUrl: setProtocolUrl
};
