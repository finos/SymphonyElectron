'use strict';
const { remote, ipcRenderer, crashReporter } = require('electron');

renderDom();

/**
 * Method that renders application data
 */
function renderDom() {
    document.addEventListener('DOMContentLoaded', function () {
        const applicationName = remote.app.getName() || 'Symphony';
        let appName = document.getElementById('app-name');
        let copyright = document.getElementById('copyright');

        appName.innerHTML = applicationName;
        copyright.innerHTML = `Copyright &copy; ${new Date().getFullYear()} ${applicationName}`
    });
}

ipcRenderer.on('versionInfo', (event, versionInfo) => {
    const versionText = document.getElementById('version');
    const { version, clientVersion, buildNumber, i18n } = versionInfo;

    document.title = i18n['About Symphony'] || 'About Symphony';

    if (versionText) {
        versionText.innerHTML = version ? `${i18n.Version || 'Version'} ${clientVersion}-${version} (${buildNumber})` : 'N/A';
    }
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