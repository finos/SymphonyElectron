import { ipcMain } from 'electron';
import { logger } from '../common/logger';

export enum ApiCmds {
    isOnline,
    registerLogger,
    setBadgeCount,
    badgeDataUrl,
    activate,
    registerBoundsChange,
    registerProtocolHandler,
    registerActivityDetection,
    showNotificationSettings,
    sanitize,
    bringToFront,
    openScreenPickerWindow,
    popupMenu,
    optimizeMemoryConsumption,
    optimizeMemoryRegister,
    setIsInMeeting,
    setLocale,
    keyPress,
}

export enum apiName {
    symphonyApi = 'symphony-api',
}

export interface IApiArgs {
    cmd: ApiCmds;
    isOnline: boolean;
    count: number;
    dataUrl: string;
    windowName: string;
    period: number;
    reason: string;
    sources: Electron.DesktopCapturerSource[];
    id: number;
    memory: Electron.ProcessMemoryInfo;
    cpuUsage: Electron.CPUUsage;
    isInMeeting: boolean;
    locale: string;
    keyCode: number;
}

/**
 * Ensure events comes from a window that we have created.
 * @param  {EventEmitter} event  node emitter event to be tested
 * @return {Boolean} returns true if exists otherwise false
 */
function isValidWindow(event: Electron.Event) {
    /*if (!checkValidWindow) {
        return true;
    }*/
    const result = false;
    if (event && event.sender) {
        // validate that event sender is from window we created
        // const browserWin = BrowserWindow.fromWebContents(event.sender);

        // result = windowMgr.hasWindow(browserWin, event.sender.id);
    }

    if (!result) {
       // log.send(logLevels.WARN, 'invalid window try to perform action, ignoring action');
    }

    return result;
}

/**
 * Handle API related ipc messages from renderers. Only messages from windows
 * we have created are allowed.
 */
ipcMain.on(apiName.symphonyApi, (event: Electron.Event, arg: IApiArgs) => {
    if (!isValidWindow(event)) {
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
            break;
        case ApiCmds.setBadgeCount:
            if (typeof arg.count === 'number') {
                badgeCount.show(arg.count);
            }
            break;
        case ApiCmds.registerProtocolHandler:
            protocolHandler.setProtocolWindow(event.sender);
            protocolHandler.checkProtocolAction();
            break;
        case ApiCmds.badgeDataUrl:
            if (typeof arg.dataUrl === 'string' && typeof arg.count === 'number') {
                badgeCount.setDataUrl(arg.dataUrl, arg.count);
            }
            break;
        case ApiCmds.activate:
            if (typeof arg.windowName === 'string') {
                windowMgr.activate(arg.windowName);
            }
            break;
        case ApiCmds.registerBoundsChange:
            windowMgr.setBoundsChangeWindow(event.sender);
            break;*/
        case ApiCmds.registerLogger:
            // renderer window that has a registered logger from JS.
            logger.setLoggerWindow(event.sender);
            break;
        /*case ApiCmds.registerActivityDetection:
            if (typeof arg.period === 'number') {
                // renderer window that has a registered activity detection from JS.
                activityDetection.setActivityWindow(arg.period, event.sender);
            }
            break;
        case ApiCmds.showNotificationSettings:
            if (typeof arg.windowName === 'string') {
                configureNotification.openConfigurationWindow(arg.windowName);
            }
            break;
        case ApiCmds.sanitize:
            if (typeof arg.windowName === 'string') {
                sanitize(arg.windowName);
            }
            break;
        case ApiCmds.bringToFront:
            // validates the user bring to front config and activates the wrapper
            if (typeof arg.reason === 'string' && arg.reason === 'notification') {
                bringToFront(arg.windowName, arg.reason);
            }
            break;
        case ApiCmds.openScreenPickerWindow:
            if (Array.isArray(arg.sources) && typeof arg.id === 'number') {
                openScreenPickerWindow(event.sender, arg.sources, arg.id);
            }
            break;
        case ApiCmds.popupMenu: {
            let browserWin = electron.BrowserWindow.fromWebContents(event.sender);
            if (browserWin && !browserWin.isDestroyed()) {
                windowMgr.getMenu().popup(browserWin, {x: 20, y: 15, async: true});
            }
            break;
        }
        case ApiCmds.optimizeMemoryConsumption:
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
            break;
        case ApiCmds.setLocale:
            if (typeof arg.locale === 'string') {
                let browserWin = electron.BrowserWindow.fromWebContents(event.sender);
                windowMgr.setLocale(browserWin, { language: arg.locale });
            }
            break;
        case ApiCmds.keyPress:
            if (typeof arg.keyCode === 'number') {
                windowMgr.handleKeyPress(arg.keyCode);
            }
            break;*/
        default:
    }

});
