export enum apiCmds {
    isOnline = 'is-online',
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
    keyPress = 'key-press',
}

export enum apiName {
    symphonyApi = 'symphony-api',
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
}