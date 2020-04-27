import { ipcRenderer } from 'electron';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { i18n } from '../common/i18n-preload';
import AboutBox from './components/about-app';
import BasicAuth from './components/basic-auth';
import NotificationComp from './components/notification-comp';
import NotificationSettings from './components/notification-settings';
import ScreenPicker from './components/screen-picker';
import ScreenSharingFrame from './components/screen-sharing-frame';
import ScreenSharingIndicator from './components/screen-sharing-indicator';
import Welcome from './components/welcome';

const enum components {
    aboutApp = 'about-app',
    screenPicker = 'screen-picker',
    screenSharingIndicator = 'screen-sharing-indicator',
    screenSharingFrame = 'screen-sharing-frame',
    basicAuth = 'basic-auth',
    notification = 'notification-comp',
    notificationSettings = 'notification-settings',
    welcome = 'welcome',
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
            document.title = i18n.t('About Symphony', 'AboutSymphony')();
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
        case components.screenSharingFrame:
            loadStyle(components.screenSharingFrame);
            component = ScreenSharingFrame;
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
            document.title = i18n.t('Notification Settings - Symphony', 'NotificationSettings')();
            loadStyle(components.notificationSettings);
            component = NotificationSettings;
            break;
        case components.welcome:
            document.title = i18n.t('WelcomeText', 'Welcome')();
            loadStyle(components.welcome);
            component = Welcome;
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
