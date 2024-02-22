import { execSync } from 'child_process';
import { systemPreferences } from 'electron';
import { logger } from '../common/logger';
import { getGuid } from '../common/utils';
import { IConfig } from './config-handler';

const GENERAL_SETTINGS = {
  url: 'string',
  autoUpdateUrl: 'string',
  autoUpdateChannel: 'string',
  isAutoUpdateEnabled: 'boolean',
  isPodUrlEditable: 'boolean',
  forceAutoUpdate: 'boolean',
  autoUpdateCheckInterval: 'string',
  enableBrowserLogin: 'boolean',
  browserLoginAutoConnect: 'boolean',
  overrideUserAgent: 'boolean',
  minimizeOnClose: 'string',
  launchOnStartup: 'string',
  alwaysOnTop: 'string',
  bringToFront: 'string',
  whitelistUrl: 'string',
  isCustomTitleBar: 'string',
  memoryRefresh: 'string',
  memoryThreshold: 'string',
  devToolsEnabled: 'boolean',
  contextIsolation: 'boolean',
  contextOriginUrl: 'string',
  disableGpu: 'boolean',
  enableRendererLogs: 'boolean',
  ctWhitelist: 'array',
  podWhitelist: 'array',
  autoLaunchPath: 'string',
  userDataPath: 'string',
  chromeFlags: 'string',
  betaAutoUpdateChannelEnabled: 'boolean',
};

const NOTIFICATION_SETTINGS = {
  position: 'string',
  display: 'string',
};

const CUSTOM_FLAGS = {
  authServerWhitelist: 'string',
  authNegotiateDelegateWhitelist: 'string',
  disableThrottling: 'string',
};

const PERMISSIONS = {
  media: 'boolean',
  geolocation: 'boolean',
  notifications: 'boolean',
  midiSysex: 'boolean',
  pointerLock: 'boolean',
  fullscreen: 'boolean',
  openExternal: 'boolean',
};

export const getAllUserDefaults = (): IConfig => {
  const settings: any = {};

  Object.keys(GENERAL_SETTINGS).map((key) => {
    settings[key] = systemPreferences.getUserDefault(
      key,
      GENERAL_SETTINGS[key],
    );
  });
  Object.keys(NOTIFICATION_SETTINGS).map((key) => {
    if (!settings.notificationSettings) {
      settings.notificationSettings = {};
    }
    settings.notificationSettings[key] = systemPreferences.getUserDefault(
      key,
      NOTIFICATION_SETTINGS[key],
    );
  });
  Object.keys(CUSTOM_FLAGS).map((key) => {
    if (!settings.customFlags) {
      settings.customFlags = {};
    }
    settings.customFlags[key] = systemPreferences.getUserDefault(
      key,
      CUSTOM_FLAGS[key],
    );
  });
  Object.keys(PERMISSIONS).map((key) => {
    if (!settings.permissions) {
      settings.permissions = {};
    }
    settings.permissions[key] = systemPreferences.getUserDefault(
      key,
      PERMISSIONS[key],
    );
  });
  logger.info('plist-handler: getting all user defaults', settings);
  return settings;
};

export const setPlistFromPreviousSettings = (settings: IConfig) => {
  Object.keys(GENERAL_SETTINGS).map((key) => {
    systemPreferences.setUserDefault(key, GENERAL_SETTINGS[key], settings[key]);
  });
  Object.keys(NOTIFICATION_SETTINGS).map((key) => {
    systemPreferences.setUserDefault(
      key,
      NOTIFICATION_SETTINGS[key],
      settings.notificationSettings[key],
    );
  });
  Object.keys(CUSTOM_FLAGS).map((key) => {
    systemPreferences.setUserDefault(
      key,
      CUSTOM_FLAGS[key],
      settings.customFlags[key],
    );
  });
  Object.keys(PERMISSIONS).map((key) => {
    systemPreferences.setUserDefault(
      key,
      PERMISSIONS[key],
      settings.permissions[key],
    );
  });
  systemPreferences.setUserDefault('installVariant', 'string', getGuid());
};

/**
 * Initialize plist file
 */
export const initializePlistFile = (path: string) => {
  try {
    const command = `sh ${path}`;
    // nosemgrep
    const result = execSync(command);
    logger.info('plist-handler: initialized plist file', result.toString());
  } catch (error: any) {
    logger.error('plist-handler: initialize exception', error?.message);
  }
};
