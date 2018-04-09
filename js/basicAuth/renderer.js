'use strict';
const { ipcRenderer, crashReporter } = require('electron');

renderDom();

/**
 * Method that renders application data
 */
function renderDom() {
    document.addEventListener('DOMContentLoaded', function () {
        loadContent();
    });
}

function loadContent() {
    let basicAuth = document.getElementById('basicAuth');
    let cancel = document.getElementById('cancel');

    if (basicAuth) {
        basicAuth.onsubmit = (e) => {
            e.preventDefault();
            submitForm();
        };
    }

    if (cancel) {
        cancel.addEventListener('click', () => {
            ipcRenderer.send('close-basic-auth');
        });
    }
}

/**
 * Method that gets invoked on submitting the form
 */
function submitForm() {
    let username = document.getElementById('username').value;
    let password = document.getElementById('password').value;

    if (username && password) {
        ipcRenderer.send('login', { username, password });
    }
}

/**
 * Updates the hosts name
 */
ipcRenderer.on('hostname', (event, host) => {
    let hostname = document.getElementById('hostname');

    if (hostname){
        hostname.innerHTML = host || 'unknown';
    }
});

/**
 * Triggered if user credentials are invalid
 */
ipcRenderer.on('isValidCredentials', (event, isValidCredentials) => {
    let credentialsError = document.getElementById('credentialsError');

    if (credentialsError){
        credentialsError.style.display = isValidCredentials ? 'none' : 'block'
    }
});

ipcRenderer.on('register-crash-reporter', (event, arg) => {
    if (arg && typeof arg === 'object') {
        crashReporter.start(arg);
    }
});