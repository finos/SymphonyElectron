'use strict';
const { remote } = require('electron');

renderDom();

/**
 * Method that renders application data
 */
function renderDom() {
    document.addEventListener('DOMContentLoaded', function () {
        const applicationName = remote.app.getName() || 'Symphony';
        const version = remote.app.getVersion();
        let appName = document.getElementById('app-name');
        let versionText = document.getElementById('version');
        let copyright = document.getElementById('copyright');

        appName.innerHTML = applicationName;
        versionText.innerHTML = version ? `Version ${version} (${version})` : null;
        copyright.innerHTML = `Copyright &copy; ${new Date().getFullYear()} ${applicationName}`
    });
}
