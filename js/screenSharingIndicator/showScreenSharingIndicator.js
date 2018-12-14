'use strict';

const { ipcRenderer } = require('electron');
const apiEnums = require('../enums/api.js');
const apiCmds = apiEnums.cmds;
const apiName = apiEnums.apiName;

let nextIndicatorId = 0;

function showScreenSharingIndicator(options, callback) {
    const { stream, displayId } = options;

    if (!stream || !stream.active || stream.getVideoTracks().length !== 1) {
        callback({type: 'error', reason: 'bad stream'});
        return;
    }
    if (displayId && typeof(displayId) !== 'string') {
        callback({type: 'error', reason: 'bad displayId'});
        return;
    }

    const id = ++nextIndicatorId;
    ipcRenderer.send(apiName, {
        cmd: apiCmds.openScreenSharingIndicator,
        displayId: options.displayId,
        id
    });

    const handleStopRequest = (e, indicatorId) => {
        if (indicatorId === id) {
            callback({type: 'stopRequested'});
        }
    }

    const destroy = () => {
        ipcRenderer.send('destroy-screensharing-indicator', id);
        options.stream.removeEventListener('inactive', destroy);
        ipcRenderer.removeListener('stop-sharing-requested', handleStopRequest);
    };

    ipcRenderer.on('stop-sharing-requested', handleStopRequest);
    options.stream.addEventListener('inactive', destroy);
}


module.exports = showScreenSharingIndicator;