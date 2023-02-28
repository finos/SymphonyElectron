import { contextBridge, ipcRenderer } from 'electron';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { apiCmds, apiName } from '../common/api-interface';

import { i18n } from '../common/i18n-preload';
import './app-bridge';
import DownloadManager from './components/download-manager';
import MessageBanner from './components/message-banner';
import NetworkError from './components/network-error';
import SnackBar from './components/snack-bar';
import Welcome from './components/welcome';
import { SSFApi } from './ssf-api';

interface ISSFWindow extends Window {
  ssf?: SSFApi;
}

const ssfWindow: ISSFWindow = window;
const minMemoryFetchInterval = 4 * 60 * 60 * 1000;
const maxMemoryFetchInterval = 12 * 60 * 60 * 1000;
const snackBar = new SnackBar();
const banner = new MessageBanner();

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

if (ssfWindow.ssf) {
  // New context bridge api that exposes all the methods on to window object
  // For Mana to communicate with SDA
  contextBridge.exposeInMainWorld('manaSSF', {
    setIsMana: ssfWindow.ssf.setIsMana,
    Notification: ssfWindow.ssf.Notification,
    getMediaSource: ssfWindow.ssf.getMediaSource,
    activate: ssfWindow.ssf.activate,
    bringToFront: ssfWindow.ssf.bringToFront,
    getVersionInfo: ssfWindow.ssf.getVersionInfo,
    registerActivityDetection: ssfWindow.ssf.registerActivityDetection,
    registerDownloadHandler: ssfWindow.ssf.registerDownloadHandler,
    openDownloadedItem: ssfWindow.ssf.openDownloadedItem,
    showDownloadedItem: ssfWindow.ssf.showDownloadedItem,
    clearDownloadedItems: ssfWindow.ssf.clearDownloadedItems,
    registerBoundsChange: ssfWindow.ssf.registerBoundsChange,
    registerLogger: ssfWindow.ssf.registerLogger,
    registerProtocolHandler: ssfWindow.ssf.registerProtocolHandler,
    registerLogRetriever: ssfWindow.ssf.registerLogRetriever,
    sendLogs: ssfWindow.ssf.sendLogs,
    registerAnalyticsEvent: ssfWindow.ssf.registerAnalyticsEvent,
    ScreenSnippet: ssfWindow.ssf.ScreenSnippet,
    openScreenSnippet: ssfWindow.ssf.openScreenSnippet,
    closeScreenSnippet: ssfWindow.ssf.closeScreenSnippet,
    setBadgeCount: ssfWindow.ssf.setBadgeCount,
    setLocale: ssfWindow.ssf.setLocale,
    setIsInMeeting: ssfWindow.ssf.setIsInMeeting,
    showNotificationSettings: ssfWindow.ssf.showNotificationSettings,
    showScreenSharingIndicator: ssfWindow.ssf.showScreenSharingIndicator,
    openScreenSharingIndicator: ssfWindow.ssf.openScreenSharingIndicator,
    closeScreenSharingIndicator: ssfWindow.ssf.closeScreenSharingIndicator,
    registerRestartFloater: ssfWindow.ssf.registerRestartFloater,
    setCloudConfig: ssfWindow.ssf.setCloudConfig,
    checkMediaPermission: ssfWindow.ssf.checkMediaPermission,
    showNotification: ssfWindow.ssf.showNotification,
    closeNotification: ssfWindow.ssf.closeNotification,
    restartApp: ssfWindow.ssf.restartApp,
    closeAllWrapperWindows: ssfWindow.ssf.closeAllWrapperWindows,
    setZoomLevel: ssfWindow.ssf.setZoomLevel,
    getZoomLevel: ssfWindow.ssf.getZoomLevel,
    supportedSettings: ssfWindow.ssf.supportedSettings,
    getNativeWindowHandle: ssfWindow.ssf.getNativeWindowHandle,
    getCitrixMediaRedirectionStatus:
      ssfWindow.ssf.getCitrixMediaRedirectionStatus,
    registerClientBanner: ssfWindow.ssf.registerClientBanner,
    launchCloud9: ssfWindow.ssf.launchCloud9,
    terminateCloud9: ssfWindow.ssf.terminateCloud9,
    connectCloud9Pipe: ssfWindow.ssf.connectCloud9Pipe,
    updateAndRestart: ssfWindow.ssf.updateAndRestart,
    downloadUpdate: ssfWindow.ssf.downloadUpdate,
    checkForUpdates: ssfWindow.ssf.checkForUpdates,
    updateMyPresence: ssfWindow.ssf.updateMyPresence,
    getMyPresence: ssfWindow.ssf.getMyPresence,
  });
}

/**
 * Returns a random number that is between (min - max)
 * if min is 4hrs and max is 12hrs then the
 * returned value will be a random b/w 4 - 12 hrs
 *
 * @param min {number} - millisecond
 * @param max {number} - millisecond
 */
const getRandomTime = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Monitory memory with a randomized time
 *
 * @param time
 */
const monitorMemory = (time) => {
  setTimeout(async () => {
    const memoryInfo = await process.getProcessMemoryInfo();
    ipcRenderer.send(apiName.symphonyApi, {
      cmd: apiCmds.memoryInfo,
      memoryInfo,
    });
    monitorMemory(
      getRandomTime(minMemoryFetchInterval, maxMemoryFetchInterval),
    );
  }, time);
};

// When the window is completely loaded
ipcRenderer.on('page-load', (_event, { locale, resources }) => {
  i18n.setResource(locale, resources);

  // injects snack bar
  snackBar.initSnackBar();

  // injects download manager contents
  const downloadManager = new DownloadManager();
  downloadManager.initDownloadManager();

  // initialize red banner
  banner.initBanner();
  banner.showBanner(false, 'error');
});

// When the window fails to load
ipcRenderer.on('page-load-failed', (_event, { locale, resources }) => {
  i18n.setResource(locale, resources);
});

// Injects network error content into the DOM
ipcRenderer.on('network-error', (_event, { error }) => {
  let networkErrorContainer = document.getElementById('main-frame');
  // prevents duplicate rendering of the NetworkError
  if (!networkErrorContainer) {
    networkErrorContainer = document.createElement('div');
    networkErrorContainer.id = 'main-frame';
    networkErrorContainer.classList.add('content-wrapper');
    document.body.append(networkErrorContainer);
  }
  const networkError = React.createElement(NetworkError, { error });
  ReactDOM.render(networkError, networkErrorContainer);
});

ipcRenderer.on('show-banner', (_event, { show, bannerType, url }) => {
  if (!!document.getElementsByClassName('sda-banner-show').length) {
    return;
  }
  banner.showBanner(show, bannerType, url);
});

ipcRenderer.on('initialize-memory-refresh', () => {
  monitorMemory(getRandomTime(minMemoryFetchInterval, maxMemoryFetchInterval));
});

ipcRenderer.on('exit-html-fullscreen', async () => {
  if (document && document.fullscreenElement) {
    await document.exitFullscreen();
  }
});

ipcRenderer.on('page-load-welcome', (_event, { locale, resources }) => {
  i18n.setResource(locale, resources);
  document.title = i18n.t('WelcomeText', 'Welcome')();
  const styles = document.createElement('link');
  styles.rel = 'stylesheet';
  styles.type = 'text/css';
  styles.href = `./styles/welcome.css`;
  document.getElementsByTagName('head')[0].appendChild(styles);
  const component = Welcome;
  const element = React.createElement(component);
  ReactDOM.render(element, document.getElementById('Root'));
});
