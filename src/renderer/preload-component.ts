import * as React from 'react';
import * as ReactDOM from 'react-dom';

import AboutBox from './components/about-app';
import LoadingScreen from './components/loading-screen';
import MoreInfo from './components/more-info';
import ScreenPicker from './components/screen-picker';

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
        case 'screen-picker-window':
            component = ScreenPicker;
            break;
    }
    const element = React.createElement(component);
    ReactDOM.render(element, document.getElementById('Root'));
};

document.addEventListener('DOMContentLoaded', load);