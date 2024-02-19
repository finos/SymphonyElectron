import { execSync } from 'child_process';
import { systemPreferences } from 'electron';
import { logger } from '../common/logger';
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

const CHROME_FLAGS = {
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
  Object.keys(CHROME_FLAGS).map((key) => {
    if (!settings.chromeFlags) {
      settings.chromeFlags = {};
    }
    settings.chromeFlags[key] = systemPreferences.getUserDefault(
      key,
      CHROME_FLAGS[key],
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
