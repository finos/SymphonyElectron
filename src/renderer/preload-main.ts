import { ipcRenderer, webFrame } from 'electron';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { apiCmds, apiName } from '../common/api-interface';

import { i18n } from '../common/i18n-preload';
import AppBridge from './app-bridge';
import DownloadManager from './components/download-manager';
import SnackBar from './components/snack-bar';
import WindowsTitleBar from './components/windows-title-bar';
import { SSFApi } from './ssf-api';

interface ISSFWindow extends Window {
    ssf?: SSFApi;
}

const ssfWindow: ISSFWindow = window;
const appBridge = new AppBridge();
const memoryInfoFetchInterval = 60 * 60 * 1000;

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
ipcRenderer.on('page-load', (_event, { locale, resources, origin, enableCustomTitleBar, isMainWindow }) => {
    // origin for postMessage targetOrigin communication
    if (origin) {
        appBridge.origin = origin;
    }

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
    const snackBar = React.createElement(SnackBar);
    const snackBarContainer = document.createElement( 'div' );
    document.body.appendChild(snackBarContainer);
    ReactDOM.render(snackBar, snackBarContainer);

    // injects download manager contents
    const downloadManager = React.createElement(DownloadManager);
    const footerSFE = document.getElementById('footer');
    if (footerSFE) {
        ReactDOM.render(downloadManager, footerSFE);
    }

    if (isMainWindow) {
        ipcRenderer.send(apiName.symphonyApi, {
            cmd: apiCmds.initMainWindow,
        });

        setInterval(async () => {
            const memoryInfo = await process.getProcessMemoryInfo();
            ipcRenderer.send(apiName.symphonyApi, {
                cmd: apiCmds.memoryInfo,
                memoryInfo,
            });
        }, memoryInfoFetchInterval);
    }
});
