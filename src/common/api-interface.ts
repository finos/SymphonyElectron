export enum apiCmds {
    isOnline = 'is-online',
    getVersionInfo = 'get-version-info',
    registerLogger = 'register-logger',
    setBadgeCount = 'set-badge-count',
    badgeDataUrl = 'badge-data-url',
    activate = 'activate',
    registerBoundsChange = 'register-bounds-change',
    registerProtocolHandler = 'register-protocol-handler',
    registerActivityDetection = 'register-activity-detection',
    showNotificationSettings = 'show-notification-settings',
    sanitize = 'sanitize',
    bringToFront = 'bring-to-front',
    openScreenPickerWindow = 'open-screen-picker-window',
    popupMenu = 'popup-menu',
    optimizeMemoryConsumption = 'optimize-memory-consumption',
    optimizeMemoryRegister = 'optimize-memory-register',
    setIsInMeeting = 'set-is-in-meeting',
    setLocale = 'set-locale',
    openScreenSnippet = 'open-screen-snippet',
    keyPress = 'key-press',
    closeWindow = 'close-window',
    openScreenSharingIndicator = 'open-screen-sharing-indicator',
    closeScreenSharingIndicator = 'close-screen-sharing-indicator',
    downloadManagerAction = 'download-manager-action',
    getMediaSource = 'get-media-source',
    notification = 'notification',
    closeNotification = 'close-notification',
}

export enum apiName {
    symphonyApi = 'symphony-api',
    mainWindowName = 'main',
}

export interface IApiArgs {
    cmd: apiCmds;
    isOnline: boolean;
    count: number;
    dataUrl: string;
    windowName: string;
    period: number;
    reason: string;
    sources: Electron.DesktopCapturerSource[];
    id: number;
    cpuUsage: Electron.CPUUsage;
    isInMeeting: boolean;
    locale: string;
    keyCode: number;
    windowType: WindowTypes;
    winKey: string;
    streamId: string;
    displayId: string;
    path: string;
    type: string;
}

export type WindowTypes = 'screen-picker' | 'screen-sharing-indicator';

export interface IBadgeCount {
    count: number;
}

/**
 * Screen snippet
 */
export type ScreenSnippetDataType = 'ERROR' | 'image/jpg;base64';
export interface IScreenSnippet {
    data?: string;
    message?: string;
    type: ScreenSnippetDataType;
}

export interface IBoundsChange extends Electron.Rectangle {
    windowName: string;
}

/**
 * Screen sharing indicator
 */
export interface IScreenSharingIndicator {
    type: string;
    requestId: number;
    reason?: string;
}

export enum KeyCodes {
    Esc = 27,
    Alt = 18,
}

export interface IVersionInfo {
    containerIdentifier: string;
    containerVer: string;
    buildNumber: string;
    apiVer: string;
    searchApiVer: string;
}

export interface ILogMsg {
    level: LogLevel;
    details: any;
    showInConsole: boolean;
    startTime: number;
}

export type LogLevel = 'error' | 'warn' | 'info' | 'verbose' | 'debug' | 'silly';