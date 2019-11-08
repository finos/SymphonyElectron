import { ipcRenderer } from 'electron';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { i18n } from '../common/i18n-preload';
import AboutBox from './components/about-app';
import BasicAuth from './components/basic-auth';
import MoreInfo from './components/more-info';
import NotificationComp from './components/notification-comp';
import NotificationSettings from './components/notification-settings';
import ScreenPicker from './components/screen-picker';
import ScreenSharingIndicator from './components/screen-sharing-indicator';

const enum components {
    aboutApp = 'about-app',
    moreInfo = 'more-info',
    screenPicker = 'screen-picker',
    screenSharingIndicator = 'screen-sharing-indicator',
    basicAuth = 'basic-auth',
    notification = 'notification-comp',
    notificationSettings = 'notification-settings',
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

    let component;
    switch (componentName) {
        case components.aboutApp:
            loadStyle(components.aboutApp);
            component = AboutBox;
            break;
        case components.moreInfo:
            loadStyle(components.moreInfo);
            component = MoreInfo;
            document.title = i18n.t('More Information', 'MoreInfo')();
            break;
        case components.screenPicker:
            loadStyle(components.screenPicker);
            document.title = 'Screen Picker - Symphony';
            component = ScreenPicker;
            break;
        case components.screenSharingIndicator:
            loadStyle(components.screenSharingIndicator);
            document.title = 'Screen Sharing Indicator - Symphony';
            component = ScreenSharingIndicator;
            break;
        case components.basicAuth:
            loadStyle(components.basicAuth);
            document.title = 'Basic Authentication - Symphony';
            component = BasicAuth;
            break;
        case components.notification:
            loadStyle(components.notification);
            document.title = 'Notification - Symphony';
            component = NotificationComp;
            break;
        case components.notificationSettings:
            document.title = 'Notification Settings - Symphony';
            loadStyle(components.notificationSettings);
            component = NotificationSettings;
            break;
    }
    const element = React.createElement(component);
    ReactDOM.render(element, document.getElementById('Root'));
};

ipcRenderer.on('page-load', (_event, data) => {
    const { locale, resource } = data;
    i18n.setResource(locale, resource);
    // Renders component as soon as the page is ready
    load();
});
