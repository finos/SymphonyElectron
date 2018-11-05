import { ipcRenderer } from 'electron';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import AboutBox from './about-app';
import LoadingScreen from './loading-screen';

document.addEventListener('DOMContentLoaded', load);

/**
 * Loads the appropriate component
 */
export function load() {
    const query = new URL(window.location.href).searchParams;
    const componentName = query.get('componentName');

    let component;
    switch (componentName) {
        case 'about-app':
            component = AboutBox;
            break;
        case 'loading-screen':
            component = LoadingScreen;
            break;
    }

    ipcRenderer.on('data', (__: Electron.Event, args) => {
        const element = React.createElement(component, args);
        ReactDOM.render(element, document.getElementById('Root'));
    });
}