'use strict';
const { ipcRenderer, crashReporter } = require('electron');

ipcRenderer.on('moreInfo', (event, moreInfo) => {

    const {
        electronVersion,
        chromiumVersion,
        v8Version,
        nodeVersion,
        opensslVersion,
        zlibVersion,
        uvVersion,
        aresVersion,
        httpparserVersion,
        localeContent,
    } = moreInfo;
    const electronV = document.getElementById('electron');
    const chromiumV = document.getElementById('chromium');
    const v8V = document.getElementById('v8');
    const nodeV = document.getElementById('node');
    const opensslV = document.getElementById('openssl');
    const zlibV = document.getElementById('zlib');
    const uvV = document.getElementById('uv');
    const aresV = document.getElementById('ares');
    const httpparserV = document.getElementById('httpparser');
    const heading = document.getElementById('heading');

    electronV.innerHTML = `<u>Electron</u> ${electronVersion || 'N/A'}`;
    chromiumV.innerHTML = `<u>Chromium</u> ${chromiumVersion || 'N/A'}`;
    v8V.innerHTML = `<u>V8</u> ${v8Version || 'N/A'}`;
    nodeV.innerHTML = `<u>Node</u> ${nodeVersion || 'N/A'}`;
    opensslV.innerHTML = `<u>OpenSSL</u> ${opensslVersion || 'N/A'}`;
    zlibV.innerHTML = `<u>ZLib</u> ${zlibVersion || 'N/A'}`;
    uvV.innerHTML = `<u>UV</u> ${uvVersion || 'N/A'}`;
    aresV.innerHTML = `<u>Ares</u> ${aresVersion || 'N/A'}`;
    httpparserV.innerHTML = `<u>HTTP Parser</u> ${httpparserVersion || 'N/A'}`;

    heading.innerHTML = `<b>${localeContent['Version Information']}</b>` || 'Version Information';
    document.title = localeContent['More Information'] || 'More Information';
});

ipcRenderer.on('register-crash-reporter', (event, arg) => {
    if (arg && typeof arg === 'object') {
        crashReporter.start(arg);
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
