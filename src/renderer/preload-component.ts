import * as React from 'react';
import * as ReactDOM from 'react-dom';
import AboutBox from './about-app';

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
    }
    const element = React.createElement(component);
    ReactDOM.render(element, document.getElementById('Root'));
}