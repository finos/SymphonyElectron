'use strict';
const { remote, ipcRenderer } = require('electron');

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

ipcRenderer.on('buildNumber', (event, buildNumber) => {
    let versionText = document.getElementById('version');
    const version = remote.app.getVersion();

    if (versionText) {
        versionText.innerHTML = version ? `Version ${version} (${version}.${buildNumber})` : 'N/A';
    }
});