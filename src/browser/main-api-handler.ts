import { ipcMain } from 'electron';

export enum IApiCmds {
    'isOnline',
    'registerLogger',
    'setBadgeCount',
    'badgeDataUrl',
    'activate',
    'registerBoundsChange',
    'registerProtocolHandler',
    'registerActivityDetection',
    'showNotificationSettings',
    'sanitize',
    'bringToFront',
    'openScreenPickerWindow',
    'popupMenu',
    'optimizeMemoryConsumption',
    'optimizeMemoryRegister',
    'setIsInMeeting',
    'setLocale',
    'keyPress',
}

export enum apiName {
    'symphonyapi',
}