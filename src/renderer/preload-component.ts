import * as React from 'react';
import * as ReactDOM from 'react-dom';

import AboutBox from './about-app';
import LoadingScreen from './loading-screen';
import MoreInfo from './more-info';

/**
 * Loads the appropriate component
 */
const load = () => {
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
        case 'more-info-window':
            component = MoreInfo;
            break;
    }
    const element = React.createElement(component);
    ReactDOM.render(element, document.getElementById('Root'));
};

document.addEventListener('DOMContentLoaded', load);