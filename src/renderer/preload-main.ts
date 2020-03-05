import { ipcRenderer, webFrame } from 'electron';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { apiCmds, apiName } from '../common/api-interface';

import { i18n } from '../common/i18n-preload';
import './app-bridge';
import DownloadManager from './components/download-manager';
import MessageBanner from './components/message-banner';
import NetworkError from './components/network-error';
import SnackBar from './components/snack-bar';
import WindowsTitleBar from './components/windows-title-bar';
import { SSFApi } from './ssf-api';

interface ISSFWindow extends Window {
    ssf?: SSFApi;
}

const ssfWindow: ISSFWindow = window;
const minMemoryFetchInterval = 4 * 60 * 60 * 1000;
const maxMemoryFetchInterval = 12 * 60 * 60 * 1000;
const snackBar = new SnackBar();
const banner = new MessageBanner();

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

/**
 * Returns a random number that is between (min - max)
 * if min is 4hrs and max is 12hrs then the
 * returned value will be a random b/w 4 - 12 hrs
 *
 * @param min {number} - millisecond
 * @param max {number} - millisecond
 */
const getRandomTime = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Monitory memory with a randomized time
 *
 * @param time
 */
const monitorMemory = (time)  => {
    setTimeout(async () => {
        const memoryInfo = await process.getProcessMemoryInfo();
        ipcRenderer.send(apiName.symphonyApi, {
            cmd: apiCmds.memoryInfo,
            memoryInfo,
        });
        monitorMemory(getRandomTime(minMemoryFetchInterval, maxMemoryFetchInterval));
    }, time);
};

// When the window is completely loaded
ipcRenderer.on('page-load', (_event, { locale, resources, enableCustomTitleBar }) => {

    i18n.setResource(locale, resources);

    if (enableCustomTitleBar) {
        // injects custom title bar
        const element = React.createElement(WindowsTitleBar);
        const div = document.createElement( 'div' );
        document.body.appendChild(div);
        ReactDOM.render(element, div);

        document.body.classList.add('sda-title-bar');
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

    // initialize red banner
    banner.initBanner();
    banner.showBanner(false, 'error');
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

ipcRenderer.on('show-banner', (_event, { show, bannerType, url }) => {
    if (!!document.getElementsByClassName('sda-banner-show').length) {
        return;
    }
    banner.showBanner(show, bannerType, url);
});

ipcRenderer.on('initialize-memory-refresh', () => {
    monitorMemory(getRandomTime(minMemoryFetchInterval, maxMemoryFetchInterval));
});
