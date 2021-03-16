import { BrowserWindow, ipcMain } from 'electron';

import {
  apiCmds,
  apiName,
  IApiArgs,
  INotificationData,
} from '../common/api-interface';
import { LocaleType } from '../common/i18n';
import { logger } from '../common/logger';
import { activityDetection } from './activity-detection';
import { analytics } from './analytics-handler';
import appStateHandler from './app-state-handler';
import { CloudConfigDataTypes, config, ICloudConfig } from './config-handler';
import { downloadHandler } from './download-handler';
import { memoryMonitor } from './memory-monitor';
import notificationHelper from './notifications/notification-helper';
import { protocolHandler } from './protocol-handler';
import { finalizeLogExports, registerLogRetriever } from './reports-handler';
import { screenSnippet } from './screen-snippet-handler';
import { activate, handleKeyPress } from './window-actions';
import { ICustomBrowserWindow, windowHandler } from './window-handler';
import {
  downloadManagerAction,
  isValidWindow,
  sanitize,
  setDataUrl,
  showBadgeCount,
  showPopupMenu,
  updateFeaturesForCloudConfig,
  updateLocale,
  windowExists,
} from './window-utils';

/**
 * Handle API related ipc messages from renderers. Only messages from windows
 * we have created are allowed.
 */
ipcMain.on(
  apiName.symphonyApi,
  async (event: Electron.IpcMainEvent, arg: IApiArgs) => {
    if (!isValidWindow(BrowserWindow.fromWebContents(event.sender))) {
      logger.error(
        `main-api-handler: invalid window try to perform action, ignoring action`,
        arg.cmd,
      );
      return;
    }

    if (!arg) {
      return;
    }

    switch (arg.cmd) {
      case apiCmds.isOnline:
        if (typeof arg.isOnline === 'boolean') {
          windowHandler.isOnline = arg.isOnline;
        }
        break;
      case apiCmds.setBadgeCount:
        if (typeof arg.count === 'number') {
          showBadgeCount(arg.count);
        }
        break;
      case apiCmds.registerProtocolHandler:
        protocolHandler.setPreloadWebContents(event.sender);
        // Since we register the prococol handler window upon login,
        // we make use of it and update the pod version info on SDA
        windowHandler.updateVersionInfo();

        // Set this to false once the SFE is completely loaded
        // so, we can prevent from showing error banners
        windowHandler.isWebPageLoading = false;
        windowHandler.isLoggedIn = true;
        break;
      case apiCmds.registerLogRetriever:
        registerLogRetriever(event.sender, arg.logName);
        break;
      case apiCmds.sendLogs:
        finalizeLogExports(arg.logs);
        break;
      case apiCmds.badgeDataUrl:
        if (typeof arg.dataUrl === 'string' && typeof arg.count === 'number') {
          setDataUrl(arg.dataUrl, arg.count);
        }
        break;
      case apiCmds.activate:
        if (typeof arg.windowName === 'string') {
          activate(arg.windowName);
        }
        break;
      case apiCmds.registerLogger:
        // renderer window that has a registered logger from JS.
        logger.setLoggerWindow(event.sender);
        break;
      case apiCmds.registerActivityDetection:
        if (typeof arg.period === 'number') {
          // renderer window that has a registered activity detection from JS.
          activityDetection.setWindowAndThreshold(event.sender, arg.period);
        }
        break;
      case apiCmds.registerDownloadHandler:
        downloadHandler.setWindow(event.sender);
        break;
      case apiCmds.showNotificationSettings:
        if (typeof arg.windowName === 'string') {
          const theme = arg.theme ? arg.theme : 'light';
          windowHandler.createNotificationSettingsWindow(arg.windowName, theme);
        }
        break;
      case apiCmds.sanitize:
        if (typeof arg.windowName === 'string') {
          sanitize(arg.windowName);
        }
        windowHandler.isWebPageLoading = true;
        break;
      case apiCmds.bringToFront:
        // validates the user bring to front config and activates the wrapper
        if (typeof arg.reason === 'string' && arg.reason === 'notification') {
          const { bringToFront } = config.getConfigFields(['bringToFront']);
          if (bringToFront === CloudConfigDataTypes.ENABLED) {
            activate(arg.windowName, false);
          }
        }
        break;
      case apiCmds.openScreenPickerWindow:
        if (Array.isArray(arg.sources) && typeof arg.id === 'number') {
          windowHandler.createScreenPickerWindow(
            event.sender,
            arg.sources,
            arg.id,
          );
        }
        break;
      case apiCmds.popupMenu: {
        const browserWin = BrowserWindow.fromWebContents(
          event.sender,
        ) as ICustomBrowserWindow;
        if (
          browserWin &&
          windowExists(browserWin) &&
          browserWin.winName === apiName.mainWindowName
        ) {
          showPopupMenu({ window: browserWin });
        }
        break;
      }
      case apiCmds.setLocale:
        if (typeof arg.locale === 'string') {
          updateLocale(arg.locale as LocaleType);
        }
        break;
      case apiCmds.keyPress:
        if (typeof arg.keyCode === 'number') {
          handleKeyPress(arg.keyCode);
        }
        break;
      case apiCmds.openScreenSnippet:
        screenSnippet.capture(event.sender);
        break;
      case apiCmds.closeScreenSnippet:
        screenSnippet.cancelCapture();
        break;
      case apiCmds.closeWindow:
        windowHandler.closeWindow(arg.windowType, arg.winKey);
        break;
      case apiCmds.openScreenSharingIndicator:
        const { displayId, id, streamId } = arg;
        if (typeof displayId === 'string' && typeof id === 'number') {
          windowHandler.createScreenSharingIndicatorWindow(
            event.sender,
            displayId,
            id,
            streamId,
          );
        }
        break;
      case apiCmds.downloadManagerAction:
        if (typeof arg.path === 'string') {
          downloadManagerAction(arg.type, arg.path);
        }
        break;
      case apiCmds.openDownloadedItem:
        if (typeof arg.id === 'string') {
          downloadHandler.openFile(arg.id);
        }
        break;
      case apiCmds.showDownloadedItem:
        if (typeof arg.id === 'string') {
          downloadHandler.showInFinder(arg.id);
        }
        break;
      case apiCmds.clearDownloadedItems:
        downloadHandler.clearDownloadedItems();
        break;
      case apiCmds.restartApp:
        appStateHandler.restart();
        break;
      case apiCmds.isMisspelled:
        if (typeof arg.word === 'string') {
          event.returnValue = windowHandler.spellchecker
            ? windowHandler.spellchecker.isMisspelled(arg.word)
            : false;
        }
        break;
      case apiCmds.setIsInMeeting:
        if (typeof arg.isInMeeting === 'boolean') {
          memoryMonitor.setMeetingStatus(arg.isInMeeting);
        }
        break;
      case apiCmds.memoryInfo:
        if (typeof arg.memoryInfo === 'object') {
          memoryMonitor.setMemoryInfo(arg.memoryInfo);
        }
        break;
      case apiCmds.getConfigUrl:
        const { url } = config.getGlobalConfigFields(['url']);
        event.returnValue = url;
        break;
      case apiCmds.registerAnalyticsHandler:
        analytics.registerPreloadWindow(event.sender);
        break;
      case apiCmds.setCloudConfig:
        const {
          podLevelEntitlements,
          acpFeatureLevelEntitlements,
          pmpEntitlements,
          ...rest
        } = arg.cloudConfig as ICloudConfig;
        if (
          podLevelEntitlements &&
          podLevelEntitlements.autoLaunchPath &&
          podLevelEntitlements.autoLaunchPath.match(/\\\\/g)
        ) {
          podLevelEntitlements.autoLaunchPath = podLevelEntitlements.autoLaunchPath.replace(
            /\\+/g,
            '\\',
          );
        }
        logger.info('main-api-handler: ignored other values from SFE', rest);
        await config.updateCloudConfig({
          podLevelEntitlements,
          acpFeatureLevelEntitlements,
          pmpEntitlements,
        });
        await updateFeaturesForCloudConfig();
        if (windowHandler.appMenu) {
          windowHandler.appMenu.buildMenu();
        }
        break;
      case apiCmds.setIsMana:
        if (typeof arg.isMana === 'boolean') {
          windowHandler.isMana = arg.isMana;
          // Update App Menu
          const appMenu = windowHandler.appMenu;
          if (appMenu && windowHandler.isMana) {
            appMenu.buildMenu();
          }
          logger.info('window-handler: isMana: ' + windowHandler.isMana);
        }
        break;
      case apiCmds.showNotification:
        if (typeof arg.notificationOpts === 'object') {
          const opts = arg.notificationOpts as INotificationData;
          notificationHelper.showNotification(opts);
        }
        break;
      case apiCmds.closeNotification:
        if (typeof arg.notificationId === 'number') {
          await notificationHelper.closeNotification(arg.notificationId);
        }
        break;
      default:
        break;
    }
  },
);
