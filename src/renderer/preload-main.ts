import { ipcRenderer, webFrame } from 'electron';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { apiCmds, apiName } from '../common/api-interface';

import { i18n } from '../common/i18n-preload';
import './app-bridge';
import DownloadManager from './components/download-manager';
import NetworkError from './components/network-error';
import SnackBar from './components/snack-bar';
import WindowsTitleBar from './components/windows-title-bar';
import { SSFApi } from './ssf-api';

interface ISSFWindow extends Window {
    ssf?: SSFApi;
}

const ssfWindow: ISSFWindow = window;
const memoryInfoFetchInterval = 60 * 60 * 1000;
const snackBar = new SnackBar();

/**
 * creates API exposed from electron.
 */
const createAPI = () => {
    // iframes (and any other non-top level frames) get no api access
    // http://stackoverflow.com/questions/326069/how-to-identify-if-a-webpage-is-being-loaded-inside-an-iframe-or-directly-into-t/326076
    if (window.self !== window.top) {
        return;
    }

    // note: window.open from main window (if in the same domain) will get
    // api access.  window.open in another domain will be opened in the default
    // browser (see: handler for event 'new-window' in windowMgr.js)

    //
    // API exposed to renderer process.
    //
    // @ts-ignore
    ssfWindow.ssf = new SSFApi();
    Object.freeze(ssfWindow.ssf);
};

createAPI();

// When the window is completely loaded
ipcRenderer.on('page-load', (_event, { locale, resources, enableCustomTitleBar, isMainWindow }) => {

    i18n.setResource(locale, resources);

    if (enableCustomTitleBar) {
        // injects custom title bar
        const element = React.createElement(WindowsTitleBar);
        const div = document.createElement( 'div' );
        document.body.appendChild(div);
        ReactDOM.render(element, div);
    }

    webFrame.setSpellCheckProvider('en-US', {
        spellCheck(words, callback) {
            const misspelled = words.filter((word) => {
                return ipcRenderer.sendSync(apiName.symphonyApi, {
                    cmd: apiCmds.isMisspelled,
                    word,
                });
            });
            callback(misspelled);
        },
    });

    // injects snack bar
    snackBar.initSnackBar();

    // injects download manager contents
    const downloadManager = new DownloadManager();
    downloadManager.initDownloadManager();

    if (isMainWindow) {
        setInterval(async () => {
            const memoryInfo = await process.getProcessMemoryInfo();
            ipcRenderer.send(apiName.symphonyApi, {
                cmd: apiCmds.memoryInfo,
                memoryInfo,
            });
        }, memoryInfoFetchInterval);
    }
});

// When the window fails to load
ipcRenderer.on('page-load-failed', (_event, { locale, resources }) => {
    i18n.setResource(locale, resources);
});

// Injects network error content into the DOM
ipcRenderer.on('network-error', (_event, { error }) => {
    const networkErrorContainer = document.createElement( 'div' );
    networkErrorContainer.id = 'main-frame';
    networkErrorContainer.classList.add('content-wrapper');
    document.body.append(networkErrorContainer);
    const networkError = React.createElement(NetworkError, { error });
    ReactDOM.render(networkError, networkErrorContainer);
});
