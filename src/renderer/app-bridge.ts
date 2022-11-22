import { ipcRenderer } from 'electron';
import { IAnalyticsData } from '../app/analytics-handler';
import {
  apiCmds,
  apiName,
  IBoundsChange,
  ILogMsg,
  INotificationData,
  IRestartFloaterData,
  IScreenSharingIndicator,
  IScreenSharingIndicatorOptions,
  IScreenSnippet,
  LogLevel,
} from '../common/api-interface';
import {
  ICustomDesktopCapturerSource,
  ICustomSourcesOptions,
  IScreenSourceError,
} from './desktop-capturer';
import { SSFApi } from './ssf-api';

const ssf = new SSFApi();

export class AppBridge {
  /**
   * Validates the incoming postMessage
   * events based on the host name
   *
   * @param event
   */
  private static isValidEvent(event): boolean {
    if (!event) {
      return false;
    }
    return event.source && event.source === window;
  }

  public origin: string = '';

  private readonly callbackHandlers = {
    onMessage: (event: MessageEvent) => this.handleMessage(event),
    onActivityCallback: (idleTime: number) => this.activityCallback(idleTime),
    onScreenSnippetCallback: (arg: IScreenSnippet) =>
      this.screenSnippetCallback(arg),
    onRegisterBoundsChangeCallback: (arg: IBoundsChange) =>
      this.registerBoundsChangeCallback(arg),
    onRegisterLoggerCallback: (
      msg: ILogMsg,
      logLevel: LogLevel,
      showInConsole: boolean,
    ) => this.registerLoggerCallback(msg, logLevel, showInConsole),
    onRegisterProtocolHandlerCallback: (uri: string) =>
      this.protocolHandlerCallback(uri),
    onCollectLogsCallback: () => this.collectLogsCallback(),
    onScreenSharingIndicatorCallback: (arg: IScreenSharingIndicator) =>
      this.screenSharingIndicatorCallback(arg),
    onMediaSourceCallback: (
      error: IScreenSourceError | null,
      source: ICustomDesktopCapturerSource | undefined,
    ): void => this.gotMediaSource(error, source),
    onNotificationCallback: (event, data) =>
      this.notificationCallback(event, data),
    onAnalyticsEventCallback: (data) => this.analyticsEventCallback(data),
    restartFloater: (data) => this.restartFloater(data),
    onDownloadItemCallback: (data) => this.onDownloadItemCallback(data),
  };

  constructor() {
    // starts with corporate pod and
    // will be updated with the global config url
    ipcRenderer
      .invoke(apiName.symphonyApi, {
        cmd: apiCmds.getCurrentOriginUrl,
      })
      .then((origin) => {
        this.origin = origin;
        // this.origin = '*'; // DEMO-APP: Comment this line back in only to test demo-app - DO NOT COMMIT
        ipcRenderer.send(apiName.symphonyApi, {
          cmd: apiCmds.setBroadcastMessage,
        });
        window.addEventListener('message', this.callbackHandlers.onMessage);
      }) // tslint:disable-next-line:no-console
      .catch((reason) => console.error(reason));

    ipcRenderer.on(apiCmds.onSwiftSearchMessage, (_event, [method, data]) => {
      this.broadcastMessage(method, data);
    });
  }

  /**
   * Switch case that validates and handle
   * incoming messages from postMessage
   *
   * Is only used for 1.5.
   *
   * @param event
   */
  private async handleMessage(event: MessageEvent): Promise<void> {
    if (!AppBridge.isValidEvent(event)) {
      return;
    }

    const { method, data } = event.data;
    switch (method) {
      case apiCmds.getVersionInfo:
        const versionInfo = await ssf.getVersionInfo();
        this.broadcastMessage('get-version-info-callback', {
          requestId: data.requestId,
          response: versionInfo,
        });
        break;
      case apiCmds.activate:
        ssf.activate(data as string);
        break;
      case apiCmds.bringToFront:
        const { windowName, reason } = data;
        ssf.bringToFront(windowName as string, reason as string);
        break;
      case apiCmds.setBadgeCount:
        if (typeof data === 'number') {
          ssf.setBadgeCount(data as number);
        }
        break;
      case apiCmds.openDownloadedItem:
        if (typeof data === 'string') {
          ssf.openDownloadedItem(data as string);
        }
        break;
      case apiCmds.showDownloadedItem:
        if (typeof data === 'string') {
          ssf.showDownloadedItem(data as string);
        }
        break;
      case apiCmds.clearDownloadedItems:
        ssf.clearDownloadedItems();
        break;
      case apiCmds.restartApp:
        ssf.restartApp();
        break;
      case apiCmds.setLocale:
        if (typeof data === 'string') {
          ssf.setLocale(data as string);
        }
        break;
      case apiCmds.registerActivityDetection:
        ssf.registerActivityDetection(
          data as number,
          this.callbackHandlers.onActivityCallback,
        );
        break;
      case apiCmds.registerDownloadHandler:
        ssf.registerDownloadHandler(
          this.callbackHandlers.onDownloadItemCallback,
        );
        break;
      case apiCmds.openScreenSnippet:
        ssf.openScreenSnippet(this.callbackHandlers.onScreenSnippetCallback);
        break;
      case apiCmds.closeScreenSnippet:
        ssf.closeScreenSnippet();
        break;
      case apiCmds.registerBoundsChange:
        ssf.registerBoundsChange(
          this.callbackHandlers.onRegisterBoundsChangeCallback,
        );
        break;
      case apiCmds.registerLogger:
        ssf.registerLogger(this.callbackHandlers.onRegisterLoggerCallback);
        break;
      case apiCmds.registerProtocolHandler:
        ssf.registerProtocolHandler(
          this.callbackHandlers.onRegisterProtocolHandlerCallback,
        );
        break;
      case apiCmds.registerLogRetriever:
        ssf.registerLogRetriever(
          this.callbackHandlers.onCollectLogsCallback,
          data,
        );
        break;
      case apiCmds.sendLogs:
        ssf.sendLogs(data.logName, data.logFiles);
        break;
      case apiCmds.openScreenSharingIndicator:
        ssf.openScreenSharingIndicator(
          data as IScreenSharingIndicatorOptions,
          this.callbackHandlers.onScreenSharingIndicatorCallback,
        );
        break;
      case apiCmds.closeScreenSharingIndicator:
        ssf.closeScreenSharingIndicator(data.streamId as string);
        break;
      case apiCmds.getMediaSource:
        await ssf.getMediaSource(
          data as ICustomSourcesOptions,
          this.callbackHandlers.onMediaSourceCallback,
        );
        break;
      case apiCmds.notification:
        ssf.showNotification(
          data as INotificationData,
          this.callbackHandlers.onNotificationCallback,
        );
        break;
      case apiCmds.closeNotification:
        await ssf.closeNotification(data as number);
        break;
      case apiCmds.showNotificationSettings:
        ssf.showNotificationSettings(data);
        break;
      case apiCmds.setIsInMeeting:
        if (typeof data === 'boolean') {
          ssf.setIsInMeeting(data as boolean);
        }
        break;
      case apiCmds.registerAnalyticsHandler:
        ssf.registerAnalyticsEvent(
          this.callbackHandlers.onAnalyticsEventCallback,
        );
        break;
      case apiCmds.registerRestartFloater:
        ssf.registerRestartFloater(this.callbackHandlers.restartFloater);
        break;
      case apiCmds.setCloudConfig:
        ssf.setCloudConfig(data as object);
        break;
      case apiCmds.swiftSearch:
        ipcRenderer.send(apiName.symphonyApi, {
          cmd: apiCmds.handleSwiftSearchMessageEvents,
          swiftSearchData: data,
        });
        break;
      case apiCmds.getCPUUsage:
        const cpuUsage = await ssf.getCPUUsage();
        this.broadcastMessage('get-cpu-usage-callback', {
          requestId: data.requestId,
          response: cpuUsage,
        });
        break;
      case apiCmds.checkMediaPermission:
        const mediaPermission = await ssf.checkMediaPermission();
        this.broadcastMessage('check-media-permission-callback', {
          requestId: data.requestId,
          response: mediaPermission,
        });
        break;
    }
  }

  /**
   * Broadcast user activity
   * @param idleTime {number} - system idle tick
   */
  private activityCallback = (idleTime: number): void =>
    this.broadcastMessage('activity-callback', idleTime);

  /**
   * Broadcast snippet data
   * @param arg {IScreenSnippet}
   */
  private screenSnippetCallback = (arg: IScreenSnippet): void =>
    this.broadcastMessage('screen-snippet-callback', arg);

  /**
   * Broadcast bound changes
   * @param arg {IBoundsChange}
   */
  private registerBoundsChangeCallback = (arg: IBoundsChange): void =>
    this.broadcastMessage('bound-changes-callback', arg);

  /**
   * Broadcast logs
   * @param msg {ILogMsg}
   * @param logLevel {LogLevel}
   * @param showInConsole {boolean}
   */
  private registerLoggerCallback(
    msg: ILogMsg,
    logLevel: LogLevel,
    showInConsole: boolean,
  ): void {
    this.broadcastMessage('logger-callback', { msg, logLevel, showInConsole });
  }

  /**
   * Broadcast protocol uri
   * @param uri {string}
   */
  private protocolHandlerCallback = (uri: string): void =>
    this.broadcastMessage('protocol-callback', uri);

  private collectLogsCallback = (): void =>
    this.broadcastMessage('collect-logs', undefined);

  /**
   * Broadcast event that stops screen sharing
   * @param arg {IScreenSharingIndicator}
   */
  private screenSharingIndicatorCallback(arg: IScreenSharingIndicator): void {
    this.broadcastMessage('screen-sharing-indicator-callback', arg);
  }

  /**
   * Broadcast analytics events data
   * @param arg {IAnalyticsData}
   */
  private analyticsEventCallback(arg: IAnalyticsData): void {
    this.broadcastMessage('analytics-event-callback', arg);
  }

  /**
   * Broadcast download item event
   * @param arg {object}
   */
  private onDownloadItemCallback(arg: object): void {
    this.broadcastMessage('download-handler-callback', arg);
  }

  /**
   * Broadcast to restart floater event with data
   * @param arg {IAnalyticsData}
   */
  private restartFloater(arg: IRestartFloaterData): void {
    this.broadcastMessage('restart-floater-callback', arg);
  }

  /**
   * Broadcast the user selected source
   * @param sourceError {IScreenSourceError}
   * @param selectedSource {ICustomDesktopCapturerSource}
   */
  private gotMediaSource(
    sourceError: IScreenSourceError | null,
    selectedSource: ICustomDesktopCapturerSource | undefined,
  ): void {
    if (sourceError) {
      const { requestId, ...error } = sourceError;
      this.broadcastMessage('media-source-callback', { requestId, error });
      this.broadcastMessage('media-source-callback-v1', { requestId, error });
      return;
    }

    if (selectedSource && selectedSource.requestId) {
      const { requestId, ...source } = selectedSource;
      this.broadcastMessage('media-source-callback', {
        requestId,
        source,
        error: sourceError,
      });
      this.broadcastMessage('media-source-callback-v1', {
        requestId,
        response: { source, error: sourceError },
      });
    }
  }

  /**
   * Broadcast notification events
   *
   * @param event {string}
   * @param data {Object}
   */
  private notificationCallback(event, data) {
    this.broadcastMessage(event, data);
  }

  /**
   * Method that broadcast messages to a specific origin via postMessage
   *
   * @param method {string}
   * @param data {any}
   */
  private broadcastMessage(method: string, data: any): void {
    window.postMessage({ method, data }, this.origin);
  }
}

const appBridge = new AppBridge();

export default appBridge;
