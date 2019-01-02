import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { i18n, LocaleType } from '../common/i18n';
import AboutBox from './components/about-app';
import LoadingScreen from './components/loading-screen';
import MoreInfo from './components/more-info';
import ScreenPicker from './components/screen-picker';
import ScreenSharingIndicator from './components/screen-sharing-indicator';

const enum components {
    aboutApp = 'about-app',
    loadingScreen = 'loading-screen',
    moreInfo = 'more-info',
    screenPicker = 'screen-picker',
    screenSharingIndicator = 'screen-sharing-indicator',
}

const loadStyle = (style) => {
    const styles = document.createElement('link');
    styles.rel = 'stylesheet';
    styles.type = 'text/css';
    styles.href = `./styles/${style}.css`;
    document.getElementsByTagName('head')[0].appendChild(styles);
};

/**
 * Loads the appropriate component
 */
const load = () => {
    const query = new URL(window.location.href).searchParams;
    const componentName = query.get('componentName');
    const locale = query.get('locale');
    i18n.setLocale(locale as LocaleType);

    let component;
    switch (componentName) {
        case components.aboutApp:
            loadStyle(components.aboutApp);
            component = AboutBox;
            break;
        case components.loadingScreen:
            loadStyle(components.loadingScreen);
            component = LoadingScreen;
            break;
        case components.moreInfo:
            loadStyle(components.moreInfo);
            component = MoreInfo;
            break;
        case components.screenPicker:
            loadStyle(components.screenPicker);
            component = ScreenPicker;
            break;
        case components.screenSharingIndicator:
            loadStyle(components.screenSharingIndicator);
            component = ScreenSharingIndicator;
            break;
    }
    const element = React.createElement(component);
    ReactDOM.render(element, document.getElementById('Root'));
};

document.addEventListener('DOMContentLoaded', load);