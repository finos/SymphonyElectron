import { BrowserWindow, ipcMain } from 'electron';

import { apiCmds, apiName, IApiArgs } from '../common/api-interface';
import { LocaleType } from '../common/i18n';
import { logger } from '../common/logger';
import { activityDetection } from './activity-detection';
import { screenSnippet } from './screen-snippet';
import { windowHandler } from './window-handler';
import {
    isValidWindow,
    sanitize,
    setDataUrl,
    showBadgeCount,
    showPopupMenu,
    updateLocale,
} from './window-utils';

/**
 * Handle API related ipc messages from renderers. Only messages from windows
 * we have created are allowed.
 */
ipcMain.on(apiName.symphonyApi, (event: Electron.Event, arg: IApiArgs) => {
    if (!isValidWindow(BrowserWindow.fromWebContents(event.sender))) {
        return;
    }

    if (!arg) {
        return;
    }

    switch (arg.cmd) {
        /*case ApiCmds.isOnline:
            if (typeof arg.isOnline === 'boolean') {
                windowMgr.setIsOnline(arg.isOnline);
            }
            break;*/
        case apiCmds.setBadgeCount:
            if (typeof arg.count === 'number') {
                showBadgeCount(arg.count);
            }
            break;
        /*case ApiCmds.registerProtocolHandler:
            protocolHandler.setProtocolWindow(event.sender);
            protocolHandler.checkProtocolAction();
            break;*/
        case apiCmds.badgeDataUrl:
            if (typeof arg.dataUrl === 'string' && typeof arg.count === 'number') {
                setDataUrl(arg.dataUrl, arg.count);
            }
            break;
        /*case ApiCmds.activate:
            if (typeof arg.windowName === 'string') {
                windowMgr.activate(arg.windowName);
            }
            break;
        case ApiCmds.registerBoundsChange:
            windowMgr.setBoundsChangeWindow(event.sender);
            break;*/
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
        /*case ApiCmds.showNotificationSettings:
            if (typeof arg.windowName === 'string') {
                configureNotification.openConfigurationWindow(arg.windowName);
            }
            break;
        */case apiCmds.sanitize:
            if (typeof arg.windowName === 'string') {
                sanitize(arg.windowName);
            }
            break;
        /*case ApiCmds.bringToFront:
            // validates the user bring to front config and activates the wrapper
            if (typeof arg.reason === 'string' && arg.reason === 'notification') {
                bringToFront(arg.windowName, arg.reason);
            }
            break;*/
        case apiCmds.openScreenPickerWindow:
            if (Array.isArray(arg.sources) && typeof arg.id === 'number') {
                windowHandler.createScreenPickerWindow(event.sender, arg.sources, arg.id);
            }
            break;
        case apiCmds.popupMenu: {
            const browserWin = BrowserWindow.fromWebContents(event.sender);
            if (browserWin && !browserWin.isDestroyed()) {
                showPopupMenu({ window: browserWin });
            }
            break;
        }
        /*case ApiCmds.optimizeMemoryConsumption:
            if (typeof arg.memory === 'object'
                && typeof arg.cpuUsage === 'object'
                && typeof arg.memory.workingSetSize === 'number') {
                setPreloadMemoryInfo(arg.memory, arg.cpuUsage);
            }
            break;
        case ApiCmds.optimizeMemoryRegister:
            setPreloadWindow(event.sender);
            break;
        case ApiCmds.setIsInMeeting:
            if (typeof arg.isInMeeting === 'boolean') {
                setIsInMeeting(arg.isInMeeting);
            }
            break;*/
        case apiCmds.setLocale:
            if (typeof arg.locale === 'string') {
                updateLocale(arg.locale as LocaleType);
            }
            break;
        /*case ApiCmds.keyPress:
            if (typeof arg.keyCode === 'number') {
                windowMgr.handleKeyPress(arg.keyCode);
            }
            break;*/
        case apiCmds.openScreenSnippet:
            screenSnippet.capture(event.sender);
            break;
        case apiCmds.closeWindow:
            windowHandler.closeWindow(arg.windowType);
            break;
        default:
    }

});
