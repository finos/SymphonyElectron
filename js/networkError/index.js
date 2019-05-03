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
        const retryButton = errorContent.getElementById('retry-button');
        const retry = () => {
            retryButton.classList.add('disabled');
            retryButton.removeEventListener('click', retry);
            ipcRenderer.send(apiName, {
                cmd: apiCmds.reloadWindow
            });
        };
        retryButton.addEventListener('click', retry);
        
        const quitButton = errorContent.getElementById('quit-button');
        quitButton.addEventListener('click', () => {
            ipcRenderer.send(apiName, {
                cmd: apiCmds.quitWindow
            });
        });

        const mainFrame = errorContent.getElementById('main-frame');
        document.body.appendChild(mainFrame);
    }
}

module.exports = {
    NetworkError,
};
