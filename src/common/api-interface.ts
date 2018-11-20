export enum apiCmds {
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
    cmd: apiCmds;
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