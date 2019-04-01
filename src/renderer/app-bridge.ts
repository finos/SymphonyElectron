import { remote } from 'electron';

import {
    apiCmds,
    IBoundsChange,
    ILogMsg, INotificationData,
    IScreenSharingIndicator, IScreenSharingIndicatorOptions,
    IScreenSnippet,
    LogLevel,
} from '../common/api-interface';
import { ICustomDesktopCapturerSource, ICustomSourcesOptions, IScreenSourceError } from './desktop-capturer';
import { SSFApi } from './ssf-api';

const ssf = new SSFApi();
const notification = remote.require('../renderer/notification').notification;

export default class AppBridge {

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

    public origin: string;

    private readonly callbackHandlers = {
        onMessage: (event) => this.handleMessage(event),
        onActivityCallback: (idleTime: number) => this.activityCallback(idleTime),
        onScreenSnippetCallback: (arg: IScreenSnippet) => this.screenSnippetCallback(arg),
        onRegisterBoundsChangeCallback: (arg: IBoundsChange) => this.registerBoundsChangeCallback(arg),
        onRegisterLoggerCallback: (msg: ILogMsg, logLevel: LogLevel, showInConsole: boolean) =>
            this.registerLoggerCallback(msg, logLevel, showInConsole),
        onRegisterProtocolHandlerCallback: (uri: string) => this.protocolHandlerCallback(uri),
        onScreenSharingIndicatorCallback: (arg: IScreenSharingIndicator) => this.screenSharingIndicatorCallback(arg),
        onMediaSourceCallback: (
            error: IScreenSourceError | null,
            source: ICustomDesktopCapturerSource | undefined,
        ): void => this.gotMediaSource(error, source),
        onNotificationCallback: (event, data) => this.notificationCallback(event, data),
    };

    constructor() {
        // starts with corporate pod and
        // will be updated with the global config url
        this.origin = 'https://corporate.symphony.com';
        window.addEventListener('message', this.callbackHandlers.onMessage);
    }

    /**
     * Switch case that validates and handle
     * incoming messages from postMessage
     *
     * @param event
     */
    private handleMessage(event): void {
        if (!AppBridge.isValidEvent(event)) {
            return;
        }

        const { method, data } = event.data;
        switch (method) {
            case apiCmds.getVersionInfo:
                this.broadcastMessage('get-version-info-callback', ssf.getVersionInfo());
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
            case apiCmds.setLocale:
                if (typeof data === 'string') {
                    ssf.setLocale(data as string);
                }
                break;
            case apiCmds.registerActivityDetection:
                ssf.registerActivityDetection(data as number, this.callbackHandlers.onActivityCallback);
                break;
            case apiCmds.openScreenSnippet:
                ssf.openScreenSnippet(this.callbackHandlers.onScreenSnippetCallback);
                break;
            case apiCmds.registerBoundsChange:
                ssf.registerBoundsChange(this.callbackHandlers.onRegisterBoundsChangeCallback);
                break;
            case apiCmds.registerLogger:
                ssf.registerLogger(this.callbackHandlers.onRegisterLoggerCallback);
                break;
            case apiCmds.registerProtocolHandler:
                ssf.registerProtocolHandler(this.callbackHandlers.onRegisterProtocolHandlerCallback);
                break;
            case apiCmds.openScreenSharingIndicator:
                ssf.openScreenSharingIndicator(data as IScreenSharingIndicatorOptions, this.callbackHandlers.onScreenSharingIndicatorCallback);
                break;
            case apiCmds.closeScreenSharingIndicator:
                ssf.closeScreenSharingIndicator(data.streamId as string);
                break;
            case apiCmds.getMediaSource:
                ssf.getMediaSource(data as ICustomSourcesOptions, this.callbackHandlers.onMediaSourceCallback);
                break;
            case apiCmds.notification:
                notification.showNotification(data as INotificationData, this.callbackHandlers.onNotificationCallback);
                break;
            case apiCmds.closeNotification:
                notification.hideNotification(data as number);
                break;
            case apiCmds.showNotificationSettings:
                ssf.showNotificationSettings();
                break;
        }
    }

    /**
     * Broadcast user activity
     * @param idleTime {number} - system idle tick
     */
    private activityCallback = (idleTime: number): void => this.broadcastMessage('activity-callback', idleTime);

    /**
     * Broadcast snippet data
     * @param arg {IScreenSnippet}
     */
    private screenSnippetCallback = (arg: IScreenSnippet): void => this.broadcastMessage('screen-snippet-callback', arg);

    /**
     * Broadcast bound changes
     * @param arg {IBoundsChange}
     */
    private registerBoundsChangeCallback = (arg: IBoundsChange): void => this.broadcastMessage('bound-changes-callback', arg);

    /**
     * Broadcast logs
     * @param msg {ILogMsg}
     * @param logLevel {LogLevel}
     * @param showInConsole {boolean}
     */
    private registerLoggerCallback(msg: ILogMsg, logLevel: LogLevel, showInConsole: boolean): void {
        this.broadcastMessage('logger-callback', { msg, logLevel, showInConsole });
    }

    /**
     * Broadcast protocol uri
     * @param uri {string}
     */
    private protocolHandlerCallback = (uri: string): void => this.broadcastMessage('protocol-callback', uri);

    /**
     * Broadcast event that stops screen sharing
     * @param arg {IScreenSharingIndicator}
     */
    private screenSharingIndicatorCallback(arg: IScreenSharingIndicator): void {
        this.broadcastMessage('screen-sharing-indicator-callback', arg);
    }

    /**
     * Broadcast the user selected source
     * @param sourceError {IScreenSourceError}
     * @param selectedSource {ICustomDesktopCapturerSource}
     */
    private gotMediaSource(sourceError: IScreenSourceError | null, selectedSource: ICustomDesktopCapturerSource | undefined): void {
        if (sourceError) {
            const { requestId, ...error } = sourceError;
            this.broadcastMessage('media-source-callback', { requestId, error });
            return;
        }

        if (selectedSource && selectedSource.requestId) {
            const { requestId, ...source } = selectedSource;
            this.broadcastMessage('media-source-callback', { requestId, source, error: sourceError });
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
