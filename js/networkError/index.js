const { ipcRenderer } = require('electron');

const apiEnums = require('../enums/api.js');
const apiCmds = apiEnums.cmds;
const apiName = apiEnums.apiName;
const htmlContents = require('./contents');

class NetworkError {

    constructor() {
        this.domParser = new DOMParser();
    }

    showError(data) {
        if (!data) {
            return;
        }
        const { message, error } = data;
        const errorContent = this.domParser.parseFromString(htmlContents.errorContent(message), 'text/html');
        errorContent.getElementById('error-code').innerText = error || "UNKNOWN_ERROR";

        // Add event listeners for buttons
        const cancelRetryButton = errorContent.getElementById('cancel-retry-button');
        cancelRetryButton.addEventListener('click', () => {
            ipcRenderer.send(apiName, {
                cmd: apiCmds.cancelNetworkStatusCheck
            });
        });
        
        const quitButton = errorContent.getElementById('quit-button');
        quitButton.addEventListener('click', () => {
            ipcRenderer.send(apiName, {
                cmd: apiCmds.quitWindow
            })
        });

        const mainFrame = errorContent.getElementById('main-frame');
        document.body.appendChild(mainFrame);
    }
}

module.exports = {
    NetworkError,
};