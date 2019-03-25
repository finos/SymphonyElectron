import { BrowserWindow, ipcMain } from 'electron';

import { apiCmds, apiName, IApiArgs } from '../common/api-interface';
import { LocaleType } from '../common/i18n';
import { logger } from '../common/logger';
import { activityDetection } from './activity-detection';
import { config } from './config-handler';
import { protocolHandler } from './protocol-handler';
import { screenSnippet } from './screen-snippet-handler';
import { activate, handleKeyPress } from './window-actions';
import { windowHandler } from './window-handler';
import {
    downloadManagerAction,
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
        case apiCmds.showNotificationSettings:
            if (typeof arg.windowName === 'string') {
                windowHandler.createNotificationSettingsWindow(arg.windowName);
            }
            break;
        case apiCmds.sanitize:
            if (typeof arg.windowName === 'string') {
                sanitize(arg.windowName);
            }
            break;
        case apiCmds.bringToFront:
            // validates the user bring to front config and activates the wrapper
            if (typeof arg.reason === 'string' && arg.reason === 'notification') {
                const shouldBringToFront = config.getConfigFields([ 'bringToFront' ]);
                if (shouldBringToFront) {
                    activate(arg.windowName, false);
                }
            }
            break;
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
        case apiCmds.closeWindow:
            windowHandler.closeWindow(arg.windowType, arg.winKey);
            break;
        case apiCmds.openScreenSharingIndicator:
            const { displayId, id, streamId } = arg;
            if (typeof displayId === 'string' && typeof id === 'number' && typeof streamId === 'string') {
                windowHandler.createScreenSharingIndicatorWindow(event.sender, displayId, id, streamId);
            }
            break;
        case apiCmds.downloadManagerAction:
            if (typeof arg.path === 'string') {
                downloadManagerAction(arg.type, arg.path);
            }
            break;
        default:
    }

});
