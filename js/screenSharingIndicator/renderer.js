'use strict';

const { ipcRenderer, crashReporter } = require('electron');

let indicatorId;

function renderDom() {
    const stopSharingButton = document.getElementById('stop-sharing-button');
    stopSharingButton.addEventListener('click', () => {
        ipcRenderer.send('stop-sharing-clicked', indicatorId);
    }, false);

    const hideButton = document.getElementById('hide-button');
    hideButton.addEventListener('click', () => {
        window.close();
    }, false);
}

ipcRenderer.on('window-data', (event, content) => {
    indicatorId = content.id;
    const setText = (el, text) => {
        document.getElementById(el).innerHTML = (content.i18n[text] || text).replace('Symphony', '<b>Symphony</b>');
    };
    setText('stop-sharing-button', 'Stop sharing');
    setText('hide-button', 'Hide');
    setText('text-label', 'You are sharing your screen on Symphony');
    document.body.className = content.isMac ? 'mac' : '';
});

ipcRenderer.on('register-crash-reporter', (event, arg) => {
    if (arg && typeof arg === 'object') {
        crashReporter.start(arg);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    renderDom();
});
