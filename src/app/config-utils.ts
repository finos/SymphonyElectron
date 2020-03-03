/**
 * Returns the default user config data
 */
import { CloudConfigDataTypes, IConfig } from './config-handler';

export const getDefaultUserConfig = (): IConfig => {
    return {
        minimizeOnClose: CloudConfigDataTypes.ENABLED,
        launchOnStartup: CloudConfigDataTypes.ENABLED,
        alwaysOnTop: CloudConfigDataTypes.DISABLED,
        bringToFront: CloudConfigDataTypes.DISABLED,
        whitelistUrl: '*',
        isCustomTitleBar: CloudConfigDataTypes.ENABLED,
        memoryRefresh: CloudConfigDataTypes.ENABLED,
        memoryThreshold: '800',
        devToolsEnabled: true,
        ctWhitelist: [],
        podWhitelist: [],
        notificationSettings: {
            position: 'upper-right',
            display: '',
        },
        customFlags: {
            authServerWhitelist: '',
            authNegotiateDelegateWhitelist: '',
            disableGpu: false,
            disableThrottling: false,
        },
        permissions: {
            media: true,
            geolocation: true,
            notifications: true,
            midiSysex: true,
            pointerLock: true,
            fullscreen: true,
            openExternal: true,
        },
        autoLaunchPath: '',
    };
};
