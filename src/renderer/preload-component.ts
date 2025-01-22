import { ipcRenderer } from 'electron';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { i18n } from '../common/i18n-preload';
import AboutBox from './components/about-app';
import BasicAuth from './components/basic-auth';
import CallNotification from './components/call-notification';
import NotificationComp from './components/notification-comp';
import NotificationSettings from './components/notification-settings';
import ScreenPicker from './components/screen-picker';
import ScreenSharingFrame from './components/screen-sharing-frame';
import ScreenSharingIndicator from './components/screen-sharing-indicator';
import SnippingTool from './components/snipping-tool';
import Welcome from './components/welcome';
import WindowsTitleBar from './components/windows-title-bar';

const enum components {
  aboutApp = 'about-app',
  screenPicker = 'screen-picker',
  screenSharingIndicator = 'screen-sharing-indicator',
  screenSharingFrame = 'screen-sharing-frame',
  basicAuth = 'basic-auth',
  notification = 'notification-comp',
  notificationSettings = 'notification-settings',
  callNotification = 'call-notification',
  welcome = 'welcome',
  snippingTool = 'snipping-tool',
  titleBar = 'windows-title-bar',
}

/**
 * Loads the appropriate component
 */
const load = () => {
  const query = new URL(window.location.href).searchParams;
  const componentName = query.get('componentName');
  const title = query.get('title');

  let component;
  switch (componentName) {
    case components.aboutApp:
      component = AboutBox;
      document.title = i18n.t('About Symphony Messaging', 'AboutSymphony')();
      break;
    case components.screenPicker:
      document.title = i18n.t('Screen Picker - Symphony Messaging')();
      component = ScreenPicker;
      break;
    case components.screenSharingIndicator:
      document.title = i18n.t(
        'Screen Sharing Indicator - Symphony Messaging',
      )();
      component = ScreenSharingIndicator;
      break;
    case components.screenSharingFrame:
      component = ScreenSharingFrame;
      break;
    case components.snippingTool:
      document.title = i18n.t('Symphony Messaging')();
      component = SnippingTool;
      break;
    case components.basicAuth:
      document.title = i18n.t('Basic Authentication - Symphony Messaging')();
      component = BasicAuth;
      break;
    case components.notification:
      document.title = i18n.t('Notification - Symphony Messaging')();
      component = NotificationComp;
      break;
    case components.notificationSettings:
      document.title = i18n.t(
        'Notification Settings - Symphony Messaging',
        'NotificationSettings',
      )();
      component = NotificationSettings;
      break;
    case components.callNotification:
      document.title = i18n.t('Call Notification - Symphony Messaging')();
      component = CallNotification;
      break;
    case components.welcome:
      document.title = i18n.t('Welcome', 'Welcome')();
      component = Welcome;
      break;
    case components.titleBar:
      if (title) {
        document.title = title;
      }
      component = WindowsTitleBar;
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
