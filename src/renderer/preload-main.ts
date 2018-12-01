import * as React from 'react';
import * as ReactDOM from 'react-dom';

import WindowsTitleBar from '../renderer/windows-title-bar';
import { SSFApi } from './ssf-api';

document.addEventListener('DOMContentLoaded', load);

/**
 * Injects custom title bar to the document body
 */
function load() {
    const element = React.createElement(WindowsTitleBar);
    ReactDOM.render(element, document.body);
}

createAPI();

/**
 * creates API exposed from electron.
 */
function createAPI() {
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
    window.ssf = new SSFApi();
}