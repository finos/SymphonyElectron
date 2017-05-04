/**
 * Created by vishwas on 04/05/17.
 */
'use strict';

let protocolWindow;

function processProtocolAction(uri) {

    const resultJson = {
        uri: uri
    };

    if (resultJson && protocolWindow) {
        protocolWindow.send('protocol-action', resultJson);
    }

}

function setProtocolWindow(win) {
    protocolWindow = win;
}

module.exports = {
    processProtocolAction: processProtocolAction,
    setProtocolWindow: setProtocolWindow
};
