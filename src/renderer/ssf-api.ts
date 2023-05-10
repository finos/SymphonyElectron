import { ipcRenderer, webFrame } from 'electron';
import {
  buildNumber,
  name,
  searchAPIVersion,
  version,
} from '../../package.json';
import { AutoUpdateTrigger } from '../app/auto-update-handler';
import { IShellStatus } from '../app/c9-shell-handler';
import { RedirectionStatus } from '../app/citrix-handler';
import { IDownloadItem } from '../app/download-handler';
import {
  apiCmds,
  apiName,
  ConfigUpdateType,
  EPresenceStatusCategory,
  IBoundsChange,
  ICloud9Pipe,
  ICPUUsage,
  ILogMsg,
  IMediaPermission,
  INotificationData,
  IPresenceStatus,
  IRestartFloaterData,
  IScreenSharingIndicator,
  IScreenSharingIndicatorOptions,
  IScreenSnippet,
  IStatusBadge,
  IVersionInfo,
  KeyCodes,
  LogLevel,
  NotificationActionCallback,
} from '../common/api-interface';
import { i18n, LocaleType } from '../common/i18n-preload';
import { throttle } from '../common/utils';
import { getSource } from './desktop-capturer';
import SSFNotificationHandler from './notification-ssf-handler';
import { ScreenSnippetBcHandler } from './screen-snippet-bc-handler';

const SUPPORTED_SETTINGS = ['flashing-notifications'];
const MAIN_WINDOW_NAME = 'main';

let isAltKey: boolean = false;
let isMenuOpen: boolean = false;

export interface ILocalObject {
  ipcRenderer;
  logger?: (msg: ILogMsg, logLevel: LogLevel, showInConsole: boolean) => void;
  activityDetectionCallback?: (arg: number) => void;
  downloadManagerCallback?: (arg?: any) => void;
  screenSnippetCallback?: (arg: IScreenSnippet) => void;
  boundsChangeCallback?: (arg: IBoundsChange) => void;
  screenSharingIndicatorCallback?: (arg: IScreenSharingIndicator) => void;
  protocolActionCallback?: (arg: string) => void;
  collectLogsCallback?: Array<() => void>;
  analyticsEventHandler?: (arg: any) => void;
  restartFloater?: (arg: IRestartFloaterData) => void;
  showClientBannerCallback?: Array<
    (reason: string, action: ConfigUpdateType, data?: object) => void
  >;
  c9PipeEventCallback?: (event: string, arg?: any) => void;
  c9MessageCallback?: (status: IShellStatus) => void;
  updateMyPresenceCallback?: (presence: EPresenceStatusCategory) => void;
  phoneNumberCallback?: (arg: string) => void;
}

const local: ILocalObject = {
  ipcRenderer,
};

const notificationActionCallbacks = new Map<
  number,
  NotificationActionCallback
>();

const DEFAULT_THROTTLE = 1000;

// Throttle func
const throttledSetBadgeCount = throttle((count) => {
  local.ipcRenderer.send(apiName.symphonyApi, {
    cmd: apiCmds.setBadgeCount,
    count,
  });
}, DEFAULT_THROTTLE);

const throttledSetLocale = throttle((locale) => {
  local.ipcRenderer.send(apiName.symphonyApi, {
    cmd: apiCmds.setLocale,
    locale,
  });
}, DEFAULT_THROTTLE);

const throttledActivate = throttle((windowName) => {
  local.ipcRenderer.send(apiName.symphonyApi, {
    cmd: apiCmds.activate,
    windowName,
  });
}, DEFAULT_THROTTLE);

const throttledBringToFront = throttle((windowName, reason) => {
  local.ipcRenderer.send(apiName.symphonyApi, {
    cmd: apiCmds.bringToFront,
    windowName,
    reason,
  });
}, DEFAULT_THROTTLE);

const throttledCloseScreenShareIndicator = throttle((streamId) => {
  ipcRenderer.send(apiName.symphonyApi, {
    cmd: apiCmds.closeWindow,
    windowType: 'screen-sharing-indicator',
    winKey: streamId,
  });
}, DEFAULT_THROTTLE);

const throttledSetIsInMeetingStatus = throttle((isInMeeting) => {
  local.ipcRenderer.send(apiName.symphonyApi, {
    cmd: apiCmds.setIsInMeeting,
    isInMeeting,
  });
}, DEFAULT_THROTTLE);

const throttledSetCloudConfig = throttle((data) => {
  ipcRenderer.send(apiName.symphonyApi, {
    cmd: apiCmds.setCloudConfig,
    cloudConfig: data,
  });
}, DEFAULT_THROTTLE);

const throttledOpenDownloadedItem = throttle((id: string) => {
  ipcRenderer.send(apiName.symphonyApi, {
    cmd: apiCmds.openDownloadedItem,
    id,
  });
}, DEFAULT_THROTTLE);

const throttledShowDownloadedItem = throttle((id: string) => {
  ipcRenderer.send(apiName.symphonyApi, {
    cmd: apiCmds.showDownloadedItem,
    id,
  });
}, DEFAULT_THROTTLE);

const throttledClearDownloadedItems = throttle(() => {
  ipcRenderer.send(apiName.symphonyApi, {
    cmd: apiCmds.clearDownloadedItems,
  });
}, DEFAULT_THROTTLE);

const throttledRestart = throttle(() => {
  ipcRenderer.send(apiName.symphonyApi, {
    cmd: apiCmds.restartApp,
  });
}, DEFAULT_THROTTLE);

const throttledSetZoomLevel = throttle((zoomLevel) => {
  local.ipcRenderer.send(apiName.symphonyApi, {
    cmd: apiCmds.setZoomLevel,
    zoomLevel,
  });
}, DEFAULT_THROTTLE);

let nextIndicatorId = 0;

export class SSFApi {
  public Notification = SSFNotificationHandler; // tslint:disable-line

  /**
   * Implements equivalent of desktopCapturer.getSources - that works in
   * a sandboxed renderer process.
   * see: https://electron.atom.io/docs/api/desktop-capturer/
   * for interface: see documentation in desktopCapturer/getSource.js
   *
   * This opens a window and displays all the desktop sources
   * and returns selected source
   */
  public getMediaSource = getSource;

  /**
   * Brings window forward and gives focus.
   *
   * @param  {String} windowName - Name of window. Note: main window name is 'main'
   */
  public activate(windowName: string) {
    if (typeof windowName === 'string') {
      throttledActivate(windowName);
    }
  }

  /**
   * Brings window forward and gives focus.
   *
   * @param  {String} windowName Name of window. Note: main window name is 'main'
   * @param {String} reason, The reason for which the window is to be activated
   */
  public bringToFront(windowName: string, reason: string) {
    if (typeof windowName === 'string') {
      throttledBringToFront(windowName, reason);
    }
  }

  /**
   * Method that returns various version info
   */
  public getVersionInfo(): Promise<IVersionInfo> {
    const appName = name;
    const appVer = version;
    const cpuArch = process.arch || '';

    return Promise.resolve({
      containerIdentifier: appName,
      containerVer: appVer,
      buildNumber,
      apiVer: '3.0.0',
      cpuArch,
      // Only need to bump if there are any breaking changes.
      searchApiVer: searchAPIVersion,
    });
  }

  /**
   * Allows JS to register a activity detector that can be used by electron main process.
   *
   * @param  {Object} period - minimum user idle time in millisecond
   * @param  {Object} activityDetectionCallback - function that can be called accepting
   * @example registerActivityDetection(40000, func)
   */
  public registerActivityDetection(
    period: number,
    activityDetectionCallback: (arg: number) => void,
  ): void {
    if (typeof activityDetectionCallback === 'function') {
      local.activityDetectionCallback = activityDetectionCallback;

      // only main window can register
      local.ipcRenderer.send(apiName.symphonyApi, {
        cmd: apiCmds.registerActivityDetection,
        period,
      });
    }
  }

  /**
   * Registers the download handler
   * @param downloadManagerCallback Callback to be triggered by the download handler
   */
  public registerDownloadHandler(
    downloadManagerCallback: (arg: any) => void,
  ): void {
    if (typeof downloadManagerCallback === 'function') {
      local.downloadManagerCallback = downloadManagerCallback;
    }

    local.ipcRenderer.send(apiName.symphonyApi, {
      cmd: apiCmds.registerDownloadHandler,
    });
  }

  /**
   * Allows JS to register a callback to be invoked when size/positions
   * changes for any pop-out window (i.e., window.open). The main
   * process will emit IPC event 'boundsChange' (see below). Currently
   * only one window can register for bounds change.
   * @param  {Function} callback Function invoked when bounds changes.
   */
  public registerBoundsChange(callback: (arg: IBoundsChange) => void): void {
    if (typeof callback === 'function') {
      local.boundsChangeCallback = callback;
    }
  }

  /**
   * Allows JS to register a logger that can be used by electron main process.
   * @param  {Object} logger  function that can be called accepting
   * object: {
   *  logLevel: 'ERROR'|'CONFLICT'|'WARN'|'ACTION'|'INFO'|'DEBUG',
   *  logDetails: String
   *  }
   */
  public registerLogger(
    logger: (msg: ILogMsg, logLevel: LogLevel, showInConsole: boolean) => void,
  ): void {
    if (typeof logger === 'function') {
      local.logger = logger;

      // only main window can register
      local.ipcRenderer.send(apiName.symphonyApi, {
        cmd: apiCmds.registerLogger,
      });
    }
  }

  /**
   * Allows JS to register a protocol handler that can be used by the
   * electron main process.
   *
   * @param protocolHandler {Function} callback will be called when app is
   * invoked with registered protocol (e.g., symphony). The callback
   * receives a single string argument: full uri that the app was
   * invoked with e.g., symphony://?streamId=xyz123&streamType=chatroom
   *
   * Note: this function should only be called after client app is fully
   * able for protocolHandler callback to be invoked.  It is possible
   * the app was started using protocol handler, in this case as soon as
   * this registration func is invoked then the protocolHandler callback
   * will be immediately called.
   */
  public registerProtocolHandler(protocolHandler): void {
    if (typeof protocolHandler === 'function') {
      local.protocolActionCallback = protocolHandler;

      local.ipcRenderer.send(apiName.symphonyApi, {
        cmd: apiCmds.registerProtocolHandler,
      });
    }
  }

  /**
   * Allows JS to register a log retriever that can be used by the
   * electron main process to retrieve current logs.
   */
  public registerLogRetriever(collectLogs: () => void, logName: string): void {
    if (typeof collectLogs === 'function') {
      if (!local.collectLogsCallback) {
        local.collectLogsCallback = new Array<() => void>();
      }
      local.collectLogsCallback.push(collectLogs);

      local.ipcRenderer.send(apiName.symphonyApi, {
        cmd: apiCmds.registerLogRetriever,
        logName,
      });
    }
  }

  /**
   * Send log files to main process when requested.
   */
  public sendLogs(logName: string, logFiles): void {
    local.ipcRenderer.send(apiName.symphonyApi, {
      cmd: apiCmds.sendLogs,
      logs: { logName, logFiles },
    });
  }

  /**
   * Allows JS to register analytics event handler
   * to pass analytics event data
   *
   * @param analyticsEventHandler
   */
  public registerAnalyticsEvent(analyticsEventHandler): void {
    if (typeof analyticsEventHandler === 'function') {
      local.analyticsEventHandler = analyticsEventHandler;

      local.ipcRenderer.send(apiName.symphonyApi, {
        cmd: apiCmds.registerAnalyticsHandler,
      });
    }
  }

  /**
   * Expose old screen snippet api to support backward compatibility
   *
   * @deprecated
   */
  // tslint:disable-next-line
  public ScreenSnippet = ScreenSnippetBcHandler;

  /**
   * Update presence of current user
   * @param callback (presence:IPresenceStatus)=>void
   * if none is provided then the old logic will be triggered.
   * I dont send this event to main-api-handler because this will only act as a callback assignment
   * It will only trigger if you hit any button at presence-status-handler
   *
   */
  public updateMyPresence(
    callback: (category: EPresenceStatusCategory) => void,
  ) {
    if (typeof callback === 'function') {
      local.updateMyPresenceCallback = callback;
    }
  }
  /**
   * Get presence of current user
   * @param myPresence IPresenceStatus
   */
  public getMyPresence(myPresence: IPresenceStatus) {
    local.ipcRenderer.send(apiName.symphonyApi, {
      cmd: apiCmds.getMyPresence,
      status: myPresence,
    });
  }

  /**
   * Allow user to capture portion of screen.
   * There is a method overload of this with additional param allows user to hide SDA,
   * if none is provided then the old logic will be triggered.
   *
   * @param openScreenSnippet {function}
   */
  public openScreenSnippet(
    screenSnippetCallback: (arg: IScreenSnippet) => void,
  ): void;
  public openScreenSnippet(
    screenSnippetCallback: (arg: IScreenSnippet) => void,
    hideOnCapture?: boolean,
  ): void {
    if (typeof screenSnippetCallback === 'function') {
      local.screenSnippetCallback = screenSnippetCallback;

      if (hideOnCapture) {
        local.ipcRenderer.send(apiName.symphonyApi, {
          cmd: apiCmds.openScreenSnippet,
          hideOnCapture,
        });
      } else {
        local.ipcRenderer.send(apiName.symphonyApi, {
          cmd: apiCmds.openScreenSnippet,
        });
      }
    }
  }

  /**
   * Cancel a screen capture in progress
   */
  public closeScreenSnippet(): void {
    local.ipcRenderer.send(apiName.symphonyApi, {
      cmd: apiCmds.closeScreenSnippet,
    });
  }

  /**
   * Auto update
   */
  // public autoUpdate(filename: string): void {
  //   local.ipcRenderer.send(apiName.symphonyApi, {
  //     cmd: apiCmds.autoUpdate,
  //     filename,
  //   });
  // }

  /**
   * Sets the count on the tray icon to the given number.
   *
   * @param {number} count  count to be displayed
   * note: count of 0 will remove the displayed count.
   * note: for mac the number displayed will be 1 to infinity
   * note: for windows the number displayed will be 1 to 99 and 99+
   */
  public setBadgeCount(count: number): void {
    throttledSetBadgeCount(count);
  }

  /**
   * Sets the language which updates the application locale
   *
   * @param {string} locale - language identifier and a region identifier
   * @example: setLocale(en-US | ja-JP)
   */
  public setLocale(locale): void {
    if (typeof locale === 'string') {
      i18n.setLocale(locale as LocaleType);
      throttledSetLocale(locale);
    }
  }

  /**
   * Sets if the user is in an active meeting
   * will be used to handle memory refresh functionality
   */
  public setIsInMeeting(isInMeeting): void {
    throttledSetIsInMeetingStatus(isInMeeting);
  }

  /**
   * Opens a modal window to configure notification preference.
   */
  public showNotificationSettings(data: string): void {
    local.ipcRenderer.send(apiName.symphonyApi, {
      cmd: apiCmds.showNotificationSettings,
      windowName: MAIN_WINDOW_NAME,
      theme: data,
    });
  }

  /**
   * Shows a banner that informs user that the screen is being shared.
   *
   * @param options object with following fields:
   *    - stream https://developer.mozilla.org/en-US/docs/Web/API/MediaStream/MediaStream object.
   *             The indicator automatically destroys itself when stream becomes inactive (see MediaStream.active).
   *    - displayId id of the display that is being shared or that contains the shared app
   * @param callback callback function that will be called to handle events.
   * Callback receives event object { type: string }. Types:
   *    - 'error' - error occured. Event object contains 'reason' field.
   *    - 'stopRequested' - user clicked "Stop Sharing" button.
   */
  public showScreenSharingIndicator(
    options: IScreenSharingIndicatorOptions,
    callback,
  ): void {
    const { displayId, stream } = options;

    if (!stream || !stream.active || stream.getVideoTracks().length !== 1) {
      callback({ type: 'error', reason: 'bad stream' });
      return;
    }
    if (displayId && typeof displayId !== 'string') {
      callback({ type: 'error', reason: 'bad displayId' });
      return;
    }

    const destroy = () => {
      throttledCloseScreenShareIndicator(stream.id);
      stream.removeEventListener('inactive', destroy);
    };

    stream.addEventListener('inactive', destroy);

    if (typeof callback === 'function') {
      local.screenSharingIndicatorCallback = callback;
      ipcRenderer.send(apiName.symphonyApi, {
        cmd: apiCmds.openScreenSharingIndicator,
        displayId,
        id: ++nextIndicatorId,
        streamId: stream.id,
      });
    }
  }

  /**
   * Shows a banner that informs user that the screen is being shared.
   *
   * @param options object with following fields:
   *    - streamId unique id of stream
   *    - displayId id of the display that is being shared or that contains the shared app
   *    - requestId id to match the exact request
   * @param callback callback function that will be called to handle events.
   * Callback receives event object { type: string }. Types:
   *    - 'error' - error occured. Event object contains 'reason' field.
   *    - 'stopRequested' - user clicked "Stop Sharing" button.
   */
  public openScreenSharingIndicator(
    options: IScreenSharingIndicatorOptions,
    callback,
  ): void {
    const { displayId, requestId, streamId } = options;

    if (typeof callback === 'function') {
      local.screenSharingIndicatorCallback = callback;
      ipcRenderer.send(apiName.symphonyApi, {
        cmd: apiCmds.openScreenSharingIndicator,
        displayId,
        id: requestId,
        streamId,
      });
    }
  }

  /**
   * Closes the screen sharing indicator
   */
  public closeScreenSharingIndicator(winKey: string): void {
    throttledCloseScreenShareIndicator(winKey);
  }

  /**
   * Allows JS to register a function to restart floater
   * @param callback
   */
  public registerRestartFloater(
    callback: (args: IRestartFloaterData) => void,
  ): void {
    local.restartFloater = callback;
  }

  /**
   * Allows JS to set the PMP & ACP cloud config
   *
   * @param data {ICloudConfig}
   */
  public setCloudConfig(data: {}): void {
    throttledSetCloudConfig(data);
  }

  /**
   * Open Downloaded item
   * @param id ID of the item
   */
  public openDownloadedItem(id: string): void {
    throttledOpenDownloadedItem(id);
  }

  /**
   * Show downloaded item in finder / explorer
   * @param id ID of the item
   */
  public showDownloadedItem(id: string): void {
    throttledShowDownloadedItem(id);
  }

  /**
   * Clears downloaded items
   */
  public clearDownloadedItems(): void {
    throttledClearDownloadedItems();
  }

  /**
   * Restart the app
   */
  public restartApp(): void {
    throttledRestart();
  }

  /**
   * get CPU usage
   */
  public async getCPUUsage(): Promise<ICPUUsage> {
    return Promise.resolve(await process.getCPUUsage());
  }

  /**
   * Check media permission
   */
  public async checkMediaPermission(): Promise<IMediaPermission> {
    const mediaStatus = (await ipcRenderer.invoke(apiName.symphonyApi, {
      cmd: apiCmds.getMediaAccessStatus,
    })) as IMediaPermission;
    return Promise.resolve({
      camera: mediaStatus.camera,
      microphone: mediaStatus.microphone,
      screen: mediaStatus.screen,
    });
  }

  /**
   * Sets whether the client is running on mana
   * @param isMana
   */
  public setIsMana(isMana: boolean): void {
    ipcRenderer.send(apiName.symphonyApi, {
      cmd: apiCmds.setIsMana,
      isMana,
    });
  }

  /**
   * Closes all browser windows on SDA side, such as notifications, Screen snippet window, popped out chats etc
   */
  public closeAllWrapperWindows(): void {
    ipcRenderer.send(apiName.symphonyApi, {
      cmd: apiCmds.closeAllWrapperWindows,
    });
  }

  /**
   * Displays a notification from the main process
   * @param notificationOpts {INotificationData}
   * @param notificationCallback {NotificationActionCallback}
   */
  public showNotification(
    notificationOpts: INotificationData,
    notificationCallback: NotificationActionCallback,
  ): void {
    // Store callbacks based on notification id so,
    // we can use this to trigger on notification action
    if (typeof notificationOpts.id === 'number') {
      notificationActionCallbacks.set(
        notificationOpts.id,
        notificationCallback,
      );
    }
    // ipc does not support sending Functions, Promises, Symbols, WeakMaps,
    // or WeakSets will throw an exception
    if (notificationOpts.callback) {
      delete notificationOpts.callback;
    }
    ipcRenderer.send(apiName.symphonyApi, {
      cmd: apiCmds.showNotification,
      notificationOpts,
    });
  }

  /**
   * Closes a specific notification based on id
   * @param notificationId {number} Id of a notification
   */
  public closeNotification(notificationId: number): void {
    ipcRenderer.send(apiName.symphonyApi, {
      cmd: apiCmds.closeNotification,
      notificationId,
    });
  }

  /**
   * Get zoom level
   *
   */
  public getZoomLevel(): Promise<any> {
    return new Promise((resolve) => {
      resolve(webFrame.getZoomFactor());
    });
  }

  /**
   * Sets zoom level
   *
   * @param {string} zoomLevel - language identifier and a region identifier
   * @example: setZoomLevel(0.9)
   */
  public setZoomLevel(zoomLevel): void {
    if (typeof zoomLevel === 'number') {
      throttledSetZoomLevel(zoomLevel);
    }
  }

  /**
   * Get SDA supported settings.
   * @returns list of supported features
   */
  public supportedSettings(): string[] {
    return SUPPORTED_SETTINGS || [];
  }

  /**
   * Get native window handle of the window, by default where the renderer is displayed,
   * or optionally another window identified by its name.
   * @param windowName optional window name, defaults to current renderer window
   * @returns the platform-specific handle of the window.
   */
  public getNativeWindowHandle(windowName?: string): Promise<Buffer> {
    if (!windowName) {
      windowName = window.name || 'main';
    }
    return ipcRenderer.invoke(apiName.symphonyApi, {
      cmd: apiCmds.getNativeWindowHandle,
      windowName,
    });
  }

  /**
   * Retrieves the current status of Citrix' media redirection feature
   * @returns status
   */
  public getCitrixMediaRedirectionStatus(): Promise<RedirectionStatus> {
    return ipcRenderer.invoke(apiName.symphonyApi, {
      cmd: apiCmds.getCitrixMediaRedirectionStatus,
    });
  }

  /**
   * Allows JS to register a function to display a client banner
   * @param callback
   */
  public registerClientBanner(
    callback: (reason: string, action: ConfigUpdateType) => void,
  ): void {
    if (!local.showClientBannerCallback) {
      local.showClientBannerCallback = new Array<() => void>();
    }
    if (typeof callback === 'function') {
      local.showClientBannerCallback.push(callback);
    }
  }

  /**
   * Connects to a Cloud9 pipe
   *
   * @param pipe pipe name
   * @param onData callback that is invoked when data is received over the connection
   * @param onClose callback that is invoked when the connection is closed by the remote side
   * @returns Cloud9 pipe instance promise
   */
  public connectCloud9Pipe(
    pipe: string,
    onData: (data: Uint8Array) => void,
    onClose: () => void,
  ): Promise<ICloud9Pipe> {
    if (
      typeof pipe === 'string' &&
      typeof onData === 'function' &&
      typeof onClose === 'function'
    ) {
      if (local.c9PipeEventCallback) {
        return Promise.reject("Can't connect to pipe, already connected");
      }

      return new Promise<ICloud9Pipe>((resolve, reject) => {
        local.c9PipeEventCallback = (event: string, arg?: any) => {
          switch (event) {
            case 'connected':
              const ret = {
                write: (data: Uint8Array) => {
                  ipcRenderer.send(apiName.symphonyApi, {
                    cmd: apiCmds.writeCloud9Pipe,
                    data,
                  });
                },
                close: () => {
                  ipcRenderer.send(apiName.symphonyApi, {
                    cmd: apiCmds.closeCloud9Pipe,
                  });
                },
              };
              resolve(ret);
              break;
            case 'connection-failed':
              local.c9PipeEventCallback = undefined;
              reject(arg);
              break;
            case 'data':
              onData(arg);
              break;
            case 'close':
              local.c9PipeEventCallback = undefined;
              onClose();
              break;
          }
        };
        ipcRenderer.send(apiName.symphonyApi, {
          cmd: apiCmds.connectCloud9Pipe,
          pipe,
        });
      });
    } else {
      return Promise.reject('Invalid arguments');
    }
  }

  /**
   * Launches the Cloud9 client.
   */
  public launchCloud9(callback: (status: IShellStatus) => void): void {
    local.c9MessageCallback = callback;
    ipcRenderer.send(apiName.symphonyApi, {
      cmd: apiCmds.launchCloud9,
    });
  }

  /**
   * Terminates the Cloud9 client.
   */
  public terminateCloud9(): void {
    ipcRenderer.send(apiName.symphonyApi, {
      cmd: apiCmds.terminateCloud9,
    });
  }

  /**
   * Allows JS to install new update and restart SDA
   */
  public updateAndRestart(): void {
    ipcRenderer.send(apiName.symphonyApi, {
      cmd: apiCmds.updateAndRestart,
    });
  }

  /**
   * Allows JS to download the latest SDA updates
   */
  public downloadUpdate(): void {
    ipcRenderer.send(apiName.symphonyApi, {
      cmd: apiCmds.downloadUpdate,
    });
  }

  /**
   * Allows JS to check for updates
   */
  public checkForUpdates(autoUpdateTrigger?: AutoUpdateTrigger): void {
    ipcRenderer.send(apiName.symphonyApi, {
      cmd: apiCmds.checkForUpdates,
      autoUpdateTrigger,
    });
  }

  /**
   * Allows JS to register SDA for calls
   * @param {Function} phoneNumberCallback callback function invoked when receiving a phone number
   */
  public registerVoiceServices(
    phoneNumberCallback: (arg: string) => void,
  ): void {
    if (typeof phoneNumberCallback === 'function') {
      local.phoneNumberCallback = phoneNumberCallback;
    }
    ipcRenderer.send(apiName.symphonyApi, {
      cmd: apiCmds.registerVoiceServices,
    });
  }
}

/**
 * Ipc events
 */

/**
 * An event triggered by the main process
 * to construct a canvas for the Windows badge count image
 *
 * @param {IBadgeCount} arg {
 *     count: number
 * }
 */
local.ipcRenderer.on(
  'create-badge-data-url',
  (_event: Event, arg: IStatusBadge) => {
    const count = (arg && arg.count) || 0;

    // create 32 x 32 img
    const radius = 16;
    const canvas = document.createElement('canvas');
    canvas.height = radius * 2;
    canvas.width = radius * 2;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'red';
      ctx.beginPath();
      ctx.arc(radius, radius, radius, 0, 2 * Math.PI, false);
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.fillStyle = 'white';

      const text = count > 99 ? '99+' : count.toString();
      if (text.length > 2) {
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(text, radius, 22);
      } else if (text.length > 1) {
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText(text, radius, 24);
      } else {
        ctx.font = 'bold 26px sans-serif';
        ctx.fillText(text, radius, 26);
      }
      const dataUrl = canvas.toDataURL('image/png', 1.0);

      local.ipcRenderer.send(apiName.symphonyApi, {
        cmd: apiCmds.badgeDataUrl,
        count,
        dataUrl,
      });
    }
  },
);

local.ipcRenderer.on(
  'send-presence-status-data',
  (_event: Event, arg: EPresenceStatusCategory) => {
    if (typeof local.updateMyPresenceCallback === 'function') {
      local.updateMyPresenceCallback(arg);
    }
  },
);

/**
 * An event triggered by the main process
 * when the snippet is complete
 *
 * @param {IScreenSnippet} arg {
 *     message: string,
 *     data: base64,
 *     type: 'ERROR' | 'image/jpg;base64',
 * }
 */
local.ipcRenderer.on(
  'screen-snippet-data',
  (_event: Event, arg: IScreenSnippet) => {
    if (
      typeof arg === 'object' &&
      typeof local.screenSnippetCallback === 'function'
    ) {
      local.screenSnippetCallback(arg);
    }
  },
);

local.ipcRenderer.on('collect-logs', (_event: Event) => {
  if (local.collectLogsCallback) {
    for (const callback of local.collectLogsCallback) {
      callback();
    }
  }
});

/**
 * An event triggered by the main process
 * for ever few minutes if the user is active
 *
 * @param {number} idleTime - current system idle tick
 */
local.ipcRenderer.on('activity', (_event: Event, idleTime: number) => {
  if (
    typeof idleTime === 'number' &&
    typeof local.activityDetectionCallback === 'function'
  ) {
    local.activityDetectionCallback(idleTime);
  }
});

local.ipcRenderer.on(
  'download-completed',
  (_event: Event, downloadItem: IDownloadItem) => {
    if (
      typeof downloadItem === 'object' &&
      typeof local.downloadManagerCallback === 'function'
    ) {
      local.downloadManagerCallback({
        status: 'download-completed',
        item: downloadItem,
      });
    }
  },
);

local.ipcRenderer.on('download-failed', (_event: Event) => {
  if (typeof local.downloadManagerCallback === 'function') {
    local.downloadManagerCallback({ status: 'download-failed' });
  }
});

/**
 * An event triggered by the main process
 * Whenever some Window position or dimension changes
 *
 * @param {IBoundsChange} arg {
 *     x: number,
 *     y: number,
 *     height: number,
 *     width: number,
 *     windowName: string
 * }
 *
 */
local.ipcRenderer.on('boundsChange', (_event, arg: IBoundsChange): void => {
  const { x, y, height, width, windowName } = arg;
  if (
    x &&
    y &&
    height &&
    width &&
    windowName &&
    typeof local.boundsChangeCallback === 'function'
  ) {
    local.boundsChangeCallback({
      x,
      y,
      height,
      width,
      windowName,
    });
  }
});

/**
 * An event triggered by the main process
 * when the screen sharing has been stopper
 */
local.ipcRenderer.on('screen-sharing-stopped', (_event, id) => {
  if (typeof local.screenSharingIndicatorCallback === 'function') {
    local.screenSharingIndicatorCallback({
      type: 'stopRequested',
      requestId: id,
    });
  }
});

/**
 * An event triggered by the main process
 * for send logs on to web app
 *
 * @param {object} arg {
 *      msgs: ILogMsg[],
 *      logLevel: LogLevel,
 *      showInConsole: boolean
 * }
 *
 */
local.ipcRenderer.on('log', (_event, arg) => {
  if (arg && local.logger) {
    local.logger(arg.msgs || [], arg.logLevel, arg.showInConsole);
  }
});

/**
 * An event triggered by the main process for processing protocol urls
 * @param {String} arg - the protocol url
 */
local.ipcRenderer.on('protocol-action', (_event, arg: string) => {
  if (
    typeof local.protocolActionCallback === 'function' &&
    typeof arg === 'string'
  ) {
    local.protocolActionCallback(arg);
  }
});

local.ipcRenderer.on('analytics-callback', (_event, arg: object) => {
  if (typeof local.analyticsEventHandler === 'function' && arg) {
    local.analyticsEventHandler(arg);
  }
});

/**
 * An event triggered by the main process to restart the child window
 * @param {IRestartFloaterData}
 */
local.ipcRenderer.on(
  'restart-floater',
  (_event, { windowName, bounds }: IRestartFloaterData) => {
    if (typeof local.restartFloater === 'function' && windowName) {
      local.restartFloater({ windowName, bounds });
    }
  },
);

/**
 * An event triggered by the main process on notification actions
 * @param {INotificationData}
 */
local.ipcRenderer.on('notification-actions', (_event, args) => {
  const callback = notificationActionCallbacks.get(args.data.id);
  const data = args.data;
  data.notificationData = args.notificationData;
  if (args && callback) {
    callback(args.event, data);
  }
});

/**
 * An event triggered by the main process on updating the cloud config
 * @param {string[]}
 */
local.ipcRenderer.on('display-client-banner', (_event, args) => {
  if (local.showClientBannerCallback) {
    for (const callback of local.showClientBannerCallback) {
      if (args.data) {
        callback(args.reason, args.action, args.data);
        return;
      }
      callback(args.reason, args.action);
    }
  }
});

/**
 * An event triggered by the main process when a cloud9 pipe event occurs
 */
local.ipcRenderer.on('c9-pipe-event', (_event, args) => {
  local.c9PipeEventCallback?.call(null, args.event, args?.arg);
});

/**
 * An event triggered by the main process when the status of the cloud9 client changes
 */
local.ipcRenderer.on('c9-status-event', (_event, args) => {
  local.c9MessageCallback?.call(null, args?.status);
});

/**
 * An event triggered by the main process
 * to forward clicked phone number
 *
 * @param {string} phoneNumber - phone number received by SDA
 */
local.ipcRenderer.on(
  'phone-number-received',
  (_event: Event, phoneNumber: string) => {
    if (
      typeof phoneNumber === 'string' &&
      typeof local.phoneNumberCallback === 'function'
    ) {
      local.phoneNumberCallback(phoneNumber);
    }
  },
);

// Invoked whenever the app is reloaded/navigated
const sanitize = (): void => {
  if (window.name === apiName.mainWindowName) {
    local.ipcRenderer.send(apiName.symphonyApi, {
      cmd: apiCmds.sanitize,
      windowName: window.name,
    });
  }
};

// listens for the online/offline events and updates the main process
const updateOnlineStatus = (): void => {
  local.ipcRenderer.send(apiName.symphonyApi, {
    cmd: apiCmds.isOnline,
    isOnline: window.navigator.onLine,
  });
};

// Handle key down events
const throttledKeyDown = throttle((event) => {
  isAltKey = event.keyCode === KeyCodes.Alt;
  if (event.keyCode === KeyCodes.Esc) {
    local.ipcRenderer.send(apiName.symphonyApi, {
      cmd: apiCmds.keyPress,
      keyCode: event.keyCode,
    });
  }
}, 500);

// Handle key up events
const throttledKeyUp = throttle((event) => {
  if (isAltKey && (event.keyCode === KeyCodes.Alt || KeyCodes.Esc)) {
    isMenuOpen = !isMenuOpen;
  }
  if (isAltKey && isMenuOpen && event.keyCode === KeyCodes.Alt) {
    local.ipcRenderer.send(apiName.symphonyApi, {
      cmd: apiCmds.keyPress,
      keyCode: event.keyCode,
    });
  }
}, 500);

// Handle mouse down event
const throttleMouseDown = throttle(() => {
  if (isAltKey && isMenuOpen) {
    isMenuOpen = !isMenuOpen;
  }
}, 500);

/**
 * Window Events
 */

window.addEventListener('beforeunload', sanitize, false);
window.addEventListener('offline', updateOnlineStatus, false);
window.addEventListener('online', updateOnlineStatus, false);
window.addEventListener('keyup', throttledKeyUp, true);
window.addEventListener('keydown', throttledKeyDown, true);
window.addEventListener('mousedown', throttleMouseDown, { capture: true });
