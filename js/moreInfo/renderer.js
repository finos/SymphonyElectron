'use strict';
const { ipcRenderer, crashReporter } = require('electron');

renderDom();

/**
 * Method that renders application data
 */
function renderDom() {
    document.addEventListener('DOMContentLoaded', function () {
        const electronV = document.getElementById('electron');
        const chromiumV = document.getElementById('chromium');
        const v8V = document.getElementById('v8');
        const nodeV = document.getElementById('node');
        const opensslV = document.getElementById('openssl');
        const zlibV = document.getElementById('zlib');
        const uvV = document.getElementById('uv');
        const aresV = document.getElementById('ares');
        const httpparserV = document.getElementById('httpparser');

        electronV.innerHTML = `<u>Electron</u> ${process.versions.electron}`;
        chromiumV.innerHTML = `<u>Chromium</u> ${process.versions.chrome}`;
        v8V.innerHTML = `<u>V8</u> ${process.versions.v8}`;
        nodeV.innerHTML = `<u>Node</u> ${process.versions.node}`;
        opensslV.innerHTML = `<u>OpenSSL</u> ${process.versions.openssl}`;
        zlibV.innerHTML = `<u>ZLib</u> ${process.versions.zlib}`;
        uvV.innerHTML = `<u>UV</u> ${process.versions.uv}`;
        aresV.innerHTML = `<u>Ares</u> ${process.versions.ares}`;
        httpparserV.innerHTML = `<u>HTTP Parser</u> ${process.versions.http_parser}`;
    });
}

ipcRenderer.on('register-crash-reporter', (event, arg) => {
    if (arg && typeof arg === 'object') {
        crashReporter.start(arg);
    }
});

ipcRenderer.on('i18n-more-info', (event, content) => {
    if (content && typeof content === 'object') {
        const i18nNodes = document.querySelectorAll('[data-i18n-text]');

        for (let node of i18nNodes) {
            if (node.attributes['data-i18n-text'] && node.attributes['data-i18n-text'].value) {
                node.innerText = content[node.attributes['data-i18n-text'].value] || node.attributes['data-i18n-text'].value;
            }
        }
    }
});

// note: this is a workaround until
// https://github.com/electron/electron/issues/8841
// is fixed on the electron. where 'will-navigate'
// is never fired in sandbox mode
//
// This is required in order to prevent from loading
// dropped content
window.addEventListener('drop', function(e) {
    e.preventDefault();
    e.stopPropagation();
});

window.addEventListener('dragover', function(e) {
    e.preventDefault();
    e.stopPropagation();
});