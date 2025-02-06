import { app, dialog, powerSaveBlocker, systemPreferences } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

import * as util from 'util';
import { buildNumber } from '../../package.json';
import { ConfigFieldsDefaultValues } from '../common/config-interface';
import { isDevEnv, isElectronQA, isLinux, isMac } from '../common/env';
import { logger } from '../common/logger';
import { arrayEquals, filterOutSelectedValues, pick } from '../common/utils';
import { analytics } from './bi/analytics-handler';
import { sendAutoUpdateAnalytics } from './bi/auto-update-analytics';
import {
  InstallActionTypes,
  InstallTypes,
  SDAEndReasonTypes,
  SDAUserSessionActionTypes,
} from './bi/interface';
import { terminateC9Shell } from './c9-shell-handler';
import {
  getAllUserDefaults,
  initializePlistFile,
  setPlistFromPreviousSettings,
} from './plist-handler';
import { appStats } from './stats';

const writeFile = util.promisify(fs.writeFile);

export enum CloudConfigDataTypes {
  NOT_SET = 'NOT_SET',
  ENABLED = 'ENABLED',
  DISABLED = 'DISABLED',
}

export const ConfigFieldsToRestart = new Set([
  'permissions',
  'disableThrottling',
  'isCustomTitleBar',
  'ctWhitelist',
  'podWhitelist',
  'autoLaunchPath',
  'customFlags',
]);

export interface IConfig {
  url: string;
  autoUpdateChannel: string;
  autoUpdateUrl: string;
  isAutoUpdateEnabled: boolean;
  autoUpdateCheckInterval: string;
  lastAutoUpdateCheckDate: string;
  minimizeOnClose: CloudConfigDataTypes;
  launchOnStartup: CloudConfigDataTypes;
  alwaysOnTop: CloudConfigDataTypes;
  bringToFront: CloudConfigDataTypes;
  whitelistUrl: string;
  isCustomTitleBar: CloudConfigDataTypes;
  memoryRefresh: CloudConfigDataTypes;
  memoryThreshold: string;
  disableGpu: boolean;
  enableRendererLogs: boolean;
  devToolsEnabled: boolean;
  ctWhitelist: string[];
  podWhitelist: string[];
  autoLaunchPath: string;
  userDataPath: string;
  permissions: IPermission;
  customFlags: ICustomFlag;
  buildNumber?: string;
  configVersion?: string;
  notificationSettings: INotificationSetting;
  mainWinPos?: ICustomRectangle;
  locale?: string;
  installVariant?: string;
  bootCount?: number;
  startedAfterAutoUpdate?: boolean;
  enableBrowserLogin?: boolean;
  browserLoginAutoConnect?: boolean;
  browserLoginRetryTimeout?: string;
  betaAutoUpdateChannelEnabled?: boolean;
  latestAutoUpdateChannelEnabled?: boolean;
  forceAutoUpdate?: boolean;
  isPodUrlEditable?: boolean;
  sdaInstallerMsiUrlEnabledVisible?: boolean;
  sdaInstallerMsiUrlBetaEnabledVisible?: boolean;
  openfin?: IOpenfin;
}

export interface IGlobalConfig {
  contextOriginUrl: string;
  url: string;
  contextIsolation: boolean;
  overrideUserAgent?: boolean;
}

export interface ICloudConfig {
  configVersion?: string;
  podLevelEntitlements: IPodLevelEntitlements;
  acpFeatureLevelEntitlements: IACPFeatureLevelEntitlements;
  pmpEntitlements: IPMPEntitlements;
}

export interface IPodLevelEntitlements {
  minimizeOnClose: CloudConfigDataTypes;
  isCustomTitleBar: CloudConfigDataTypes;
  alwaysOnTop: CloudConfigDataTypes;
  memoryRefresh: CloudConfigDataTypes;
  bringToFront: CloudConfigDataTypes;
  disableThrottling: CloudConfigDataTypes;
  launchOnStartup: CloudConfigDataTypes;
  isAutoUpdateEnabled: boolean;
  autoUpdateCheckInterval: string;
  memoryThreshold: string;
  ctWhitelist: string[];
  podWhitelist: string[];
  whitelistUrl: string;
  customFlags: {
    authNegotiateDelegateWhitelist: string;
    authServerWhitelist: string;
  };
  autoLaunchPath: string;
  userDataPath: string;
}

export interface IACPFeatureLevelEntitlements {
  betaAutoUpdateChannelEnabled: boolean;
  devToolsEnabled: boolean;
  permissions: IPermission;
}

export interface IPMPEntitlements {
  minimizeOnClose: CloudConfigDataTypes;
  bringToFront: CloudConfigDataTypes;
  memoryRefresh: CloudConfigDataTypes;
  refreshAppThreshold: CloudConfigDataTypes;
  disableThrottling: CloudConfigDataTypes;
  sdaInstallerMsiUrlEnabledVisible: boolean;
  sdaInstallerMsiUrlBetaEnabledVisible: boolean;
}

export interface IPermission {
  media: boolean;
  geolocation: boolean;
  notifications: boolean;
  midiSysex: boolean;
  pointerLock: boolean;
  fullscreen: boolean;
  openExternal: boolean;
}

export interface ICustomFlag {
  authServerWhitelist: string;
  authNegotiateDelegateWhitelist: string;
  disableThrottling: CloudConfigDataTypes;
}

export interface INotificationSetting {
  position: string;
  display: string;
}

export interface ICustomRectangle extends Partial<Electron.Rectangle> {
  isMaximized?: boolean;
  isFullScreen?: boolean;
}

export interface IOpenfin {
  uuid: string;
  licenseKey: string;
  runtimeVersion: string;
  channelName: string;
  autoConnect: boolean;
  connectionTimeout: string;
}

class Config {
  public userConfig: IConfig | {};
  public globalConfig: IConfig | {};
  public cloudConfig: ICloudConfig | {};
  public filteredCloudConfig: ICloudConfig | {};
  private isFirstTime: boolean = true;
  private didUpdateConfigFile: boolean = false;
  private isUpdatingConfigFile: boolean = false;
  private installVariant: string | undefined;
  private bootCount: number | undefined;
  private readonly configFileName: string;
  private readonly installVariantFilename: string;
  private readonly tempGlobalConfigFilePath: string;
  private readonly installVariantPath: string;
  private readonly userConfigPath: string;
  private readonly appPath: string;
  private readonly globalConfigPath: string;
  private readonly cloudConfigPath: string;
  private readonly postInstallScriptPath: string;

  constructor() {
    this.configFileName = 'Symphony.config';
    this.tempGlobalConfigFilePath = path.join(
      app.getPath('userData'),
      'temp-local.Symphony.config',
    );
    this.installVariantFilename = 'InstallVariant.info';
    this.userConfigPath = path.join(
      app.getPath('userData'),
      this.configFileName,
    );
    this.cloudConfigPath = path.join(
      app.getPath('userData'),
      'cloudConfig.config',
    );
    this.appPath = isDevEnv
      ? app.getAppPath()
      : path.dirname(app.getPath('exe'));
    this.globalConfigPath = isDevEnv
      ? path.join(this.appPath, path.join('config', this.configFileName))
      : path.join(
          this.appPath,
          isMac ? '..' : '',
          'config',
          this.configFileName,
        );
    this.postInstallScriptPath = isDevEnv
      ? path.join(this.appPath, path.join('installer', 'mac', 'postinstall.sh'))
      : path.join(this.appPath, '..', 'installer', 'mac', 'postinstall.sh');

    this.installVariantPath = isDevEnv
      ? path.join(
          this.appPath,
          path.join('config', this.installVariantFilename),
        )
      : path.join(
          this.appPath,
          isMac ? '..' : '',
          'config',
          this.installVariantFilename,
        );

    if (isLinux) {
      this.globalConfigPath = path.join(
        this.appPath,
        isElectronQA ? '..' : '',
        'config',
        this.configFileName,
      );
      this.installVariantPath = path.join(
        this.appPath,
        isElectronQA ? '..' : '',
        'config',
        this.installVariantFilename,
      );
    }

    this.globalConfig = {};
    this.userConfig = {};
    this.cloudConfig = {};
    this.filteredCloudConfig = {};

    this.readInstallVariant();
    this.readGlobalConfig();
    this.readCloudConfig();

    app.on('before-quit', async (event) => {
      const id = powerSaveBlocker.start('prevent-app-suspension');
      logger.info('config-handler: before-quit application is terminated');
      terminateC9Shell();
      if (!this.didUpdateConfigFile) {
        this.isUpdatingConfigFile = true;
        event.preventDefault();
        logger.info(
          `config-handler: power save blocker id ${id} and is started`,
          powerSaveBlocker.isStarted(id),
        );
        this.writeUserConfig();
        await appStats.sendAnalytics(
          SDAUserSessionActionTypes.End,
          SDAEndReasonTypes.Closed,
        );
        analytics.writeAnalyticFile();
        this.isUpdatingConfigFile = false;
        this.didUpdateConfigFile = true;
        powerSaveBlocker.stop(id);
        app.quit();
      } else if (!this.didUpdateConfigFile && this.isUpdatingConfigFile) {
        logger.info('config-handler: config file updating...');
        event.preventDefault();
      }
      logger.info('config-handler: config file updated. Closing the app.');
    });
  }

  /**
   * Returns the specified fields from both user and global config file
   * and keep values from user config as priority
   *
   * @param fields
   */
  public getConfigFields(fields: string[]): IConfig {
    const configFields: IConfig = {
      ...this.getConfigfromDefaultFields(fields),
      ...this.getGlobalConfigFields(fields),
      ...this.getUserConfigFields(fields),
      ...this.getFilteredCloudConfigFields(fields),
    };
    logger.info(
      `config-handler: getting combined config values for the fields ${fields}`,
      configFields,
    );
    return configFields;
  }

  /**
   * Returns the specified fields from user config file
   *
   * @param fields {Array}
   */
  public getUserConfigFields(fields: string[]): IConfig {
    if (!this.userConfig) {
      logger.error(`config-handler: user config is undefined`, this.userConfig);
      return {} as IConfig;
    }
    const userConfigData = pick(this.userConfig, fields) as IConfig;
    logger.info(
      `config-handler: getting user config values for the fields ${fields}`,
      userConfigData,
    );
    return userConfigData;
  }

  /**
   * Returns default value of specified fields
   *
   * @param fields {Array}
   */
  public getConfigfromDefaultFields(fields: string[]): IGlobalConfig {
    const defaultConfigData = pick(
      ConfigFieldsDefaultValues,
      fields,
    ) as IGlobalConfig;
    logger.info(
      `config-handler: getting default config values for the fields ${fields}`,
      defaultConfigData,
    );
    return defaultConfigData;
  }

  /**
   * Returns the specified fields from global config file
   *
   * @param fields {Array}
   */
  public getGlobalConfigFields(fields: string[]): IGlobalConfig {
    const globalConfigData = pick(this.globalConfig, fields) as IGlobalConfig;
    logger.info(
      `config-handler: getting global config values for the fields ${fields}`,
      globalConfigData,
    );
    return globalConfigData;
  }

  /**
   * Returns filtered & prioritised fields from cloud config file
   *
   * @param fields {Array}
   */
  public getFilteredCloudConfigFields(fields: string[]): IConfig | {} {
    const filteredCloudConfigData = pick(
      this.filteredCloudConfig,
      fields,
    ) as IConfig;
    logger.info(
      `config-handler: getting filtered cloud config values for the ${fields}`,
      filteredCloudConfigData,
    );
    return filteredCloudConfigData;
  }

  /**
   * Returns the actual cloud config with priority
   * @param fields
   */
  public getCloudConfigFields(fields: string[]): IConfig {
    const {
      acpFeatureLevelEntitlements,
      podLevelEntitlements,
      pmpEntitlements,
    } = this.cloudConfig as ICloudConfig;
    const cloudConfig = {
      ...acpFeatureLevelEntitlements,
      ...podLevelEntitlements,
      ...pmpEntitlements,
    };
    logger.info(`config-handler: prioritized cloud config data`, cloudConfig);
    const cloudConfigData = pick(cloudConfig, fields) as IConfig;
    logger.info(
      `config-handler: getting prioritized cloud config values for the fields ${fields}`,
      cloudConfigData,
    );
    return cloudConfigData;
  }

  /**
   * updates new data to the user config
   *
   * @param data {IConfig}
   */
  public async updateUserConfig(data: Partial<IConfig>): Promise<void> {
    logger.info(
      `config-handler: updating user config values with the data`,
      JSON.stringify(data),
    );
    this.userConfig = { ...this.userConfig, ...data };
  }

  /**
   * Writes the config data into the user config file
   */
  public writeUserConfig = (): void => {
    logger.info(`config-handler: Updating user config file`);
    try {
      fs.writeFileSync(
        this.userConfigPath,
        JSON.stringify(this.userConfig, null, 2),
        { encoding: 'utf8' },
      );
      logger.info(
        `config-handler: updated user config values with the data ${JSON.stringify(
          this.userConfig,
        )}`,
      );
    } catch (error) {
      logger.error(
        `config-handler: failed to update user config file with ${JSON.stringify(
          this.userConfig,
        )}`,
        error,
      );
      dialog.showErrorBox(
        `Update failed`,
        `Failed to update user config due to error: ${error}`,
      );
    }
  };

  /**
   * updates new data to the cloud config
   *
   * @param data {IConfig}
   */
  public async updateCloudConfig(data: Partial<ICloudConfig>): Promise<void> {
    logger.info(
      `config-handler: Updating the cloud config data from SFE: `,
      data,
    );
    this.cloudConfig = { ...this.cloudConfig, ...data };
    // recalculate cloud config when we have data from SFE
    this.filterCloudConfig();
    logger.info(
      `config-handler: prioritized and filtered cloud config: `,
      this.filteredCloudConfig,
    );
    try {
      await writeFile(
        this.cloudConfigPath,
        JSON.stringify(this.cloudConfig, null, 2),
        { encoding: 'utf8' },
      );
      logger.info(`config-handler: writing cloud config values to file`);
    } catch (error) {
      logger.error(
        `config-handler: failed to update cloud config file with ${data}`,
        error,
      );
    }
  }

  /**
   * Return true if the app is launched for the first time
   * otherwise false
   */
  public isFirstTimeLaunch(): boolean {
    return this.isFirstTime;
  }

  /**
   * Method that updates user config file
   * by modifying the old config file
   */
  public async setUpFirstTimeLaunch(): Promise<void> {
    const execPath = path.dirname(this.appPath);
    const shouldUpdateUserConfig =
      execPath.indexOf('AppData\\Local\\Programs') !== -1 || isMac;
    if (shouldUpdateUserConfig) {
      const {
        minimizeOnClose,
        launchOnStartup,
        alwaysOnTop,
        memoryRefresh,
        bringToFront,
        isCustomTitleBar,
        ...filteredFields
      }: IConfig = this.userConfig as IConfig;
      // update to the new build number
      filteredFields.buildNumber = buildNumber;
      filteredFields.installVariant = this.installVariant;
      filteredFields.bootCount = 0;
      filteredFields.startedAfterAutoUpdate = false;
      logger.info(
        `config-handler: setting first time launch for build`,
        buildNumber,
      );
      await this.updateUserConfig(filteredFields);
      return;
    }
    await this.updateUserConfig({
      buildNumber,
      installVariant: this.installVariant,
      bootCount: this.bootCount,
      startedAfterAutoUpdate: false,
    });
  }

  /**
   * Gets the boot count for an SDA installation
   */
  public getBootCount(): number | undefined {
    logger.info(`config-handler: Current boot count is ${this.bootCount}`);
    return this.bootCount;
  }

  /**
   * Updates user config on start by fetching new settings from the global config
   * @private
   */
  public async updateUserConfigOnStart() {
    logger.info(
      `config-handler: updating user config with the latest global config values`,
    );
    const latestGlobalConfig = this.globalConfig as IConfig;
    // The properties set below are typically controlled by IT admins, so, we copy
    // all the values from global config to the user config on SDA relaunch
    await this.updateUserConfig({
      whitelistUrl: latestGlobalConfig.whitelistUrl,
      memoryThreshold: latestGlobalConfig.memoryThreshold,
      devToolsEnabled: latestGlobalConfig.devToolsEnabled,
      ctWhitelist: latestGlobalConfig.ctWhitelist,
      podWhitelist: latestGlobalConfig.podWhitelist,
      permissions: latestGlobalConfig.permissions,
      autoLaunchPath: latestGlobalConfig.autoLaunchPath,
      userDataPath: latestGlobalConfig.userDataPath,
      customFlags: latestGlobalConfig.customFlags,
      betaAutoUpdateChannelEnabled:
        latestGlobalConfig.betaAutoUpdateChannelEnabled,
      latestAutoUpdateChannelEnabled:
        latestGlobalConfig.latestAutoUpdateChannelEnabled,
    });
  }

  /**
   * Compares the SFE cloud config & SDA Cloud config and returns the unmatched key property
   * @param sdaCloudConfig Partial<ICloudConfig>
   * @param sfeCloudConfig Partial<ICloudConfig>
   */
  public compareCloudConfig(
    sdaCloudConfig: IConfig,
    sfeCloudConfig: IConfig,
  ): string[] {
    const updatedField: string[] = [];
    if (sdaCloudConfig && sfeCloudConfig) {
      for (const sdaKey in sdaCloudConfig) {
        if (sdaCloudConfig.hasOwnProperty(sdaKey)) {
          for (const sfeKey in sfeCloudConfig) {
            if (sdaKey !== sfeKey) {
              continue;
            }
            if (
              Array.isArray(sdaCloudConfig[sdaKey]) &&
              Array.isArray(sfeCloudConfig[sdaKey])
            ) {
              if (
                !arrayEquals(sdaCloudConfig[sdaKey], sfeCloudConfig[sfeKey])
              ) {
                updatedField.push(sdaKey);
              }
              continue;
            }

            if (
              typeof sdaCloudConfig[sdaKey] === 'object' &&
              typeof sfeCloudConfig[sfeKey] === 'object'
            ) {
              for (const sdaObjectKey in sdaCloudConfig[sdaKey]) {
                if (sdaCloudConfig[sdaKey].hasOwnProperty(sdaObjectKey)) {
                  for (const sfeObjectKey in sfeCloudConfig[sfeKey]) {
                    if (
                      sdaObjectKey === sfeObjectKey &&
                      sdaCloudConfig[sdaKey][sdaObjectKey] !==
                        sfeCloudConfig[sfeKey][sfeObjectKey]
                    ) {
                      updatedField.push(sdaKey);
                    }
                  }
                }
              }
              continue;
            }

            if (sdaKey === sfeKey) {
              if (sdaCloudConfig[sdaKey] !== sfeCloudConfig[sfeKey]) {
                updatedField.push(sdaKey);
              }
            }
          }
        }
      }
    }
    logger.info(`config-handler: cloud config updated fields`, [
      ...new Set(updatedField),
    ]);
    return [...new Set(updatedField)];
  }

  /**
   * Merges the different cloud config into config
   * @param cloudConfig
   */
  public getMergedConfig(cloudConfig: ICloudConfig): object {
    return {
      ...cloudConfig.acpFeatureLevelEntitlements,
      ...cloudConfig.podLevelEntitlements,
      ...cloudConfig.pmpEntitlements,
    };
  }

  /**
   * Creates the user config file with default values if not exists
   */
  public async initializeUserConfig(): Promise<void> {
    if (!fs.existsSync(this.userConfigPath)) {
      // Need to wait until app ready event to access user data
      await app.whenReady();
      await this.readGlobalConfig();
      logger.info(
        `config-handler: user config doesn't exist! will create new one and update config`,
      );
      const { url, ...rest } = this.globalConfig as IConfig;
      await this.updateUserConfig({
        buildNumber,
        ...rest,
      } as IConfig);
    }
  }

  /**
   * Reads a stores the user config file
   *
   * If user config doesn't exits?
   * this creates a new one with { configVersion: current_app_version, buildNumber: current_app_build_number }
   */
  public async readUserConfig() {
    if (fs.existsSync(this.userConfigPath)) {
      const userConfig = fs.readFileSync(this.userConfigPath, 'utf8');
      if (!userConfig) {
        logger.error(
          `config-handler: User configuration is empty and nothing to read`,
          userConfig,
        );
        fs.unlinkSync(this.userConfigPath);
        return;
      }
      try {
        this.userConfig = this.parseConfigData(userConfig);
      } catch (e) {
        logger.info(
          `config-handler: User config file is corrupted. Initializing new file`,
          e,
        );
        fs.unlinkSync(this.userConfigPath);
        this.userConfig = {};
        await this.initializeUserConfig();
      }
    }
    logger.info(`config-handler: User configuration: `, this.userConfig);
  }

  /**
   * Verifies if the application is launched for the first time
   */
  public async checkFirstTimeLaunch() {
    logger.info('config-handler: checking first time launch');
    const installVariant =
      (this.userConfig && (this.userConfig as IConfig).installVariant) || null;

    if (!installVariant) {
      logger.info(
        `config-handler: there's no install variant found, this is a first time launch`,
      );
      this.isFirstTime = true;
      this.bootCount = 0;
      sendAutoUpdateAnalytics(
        InstallActionTypes.InstallCompleted,
        InstallTypes.Manual,
      );
      return;
    }

    if (
      this.userConfig &&
      (this.userConfig as IConfig).startedAfterAutoUpdate
    ) {
      // Update config as usual
      await this.setUpFirstTimeLaunch();
      // Skip welcome screen
      this.isFirstTime = false;
      sendAutoUpdateAnalytics(
        InstallActionTypes.InstallCompleted,
        InstallTypes.Auto,
      );
      return;
    }

    if (
      installVariant &&
      typeof installVariant === 'string' &&
      installVariant !== this.installVariant
    ) {
      logger.info(
        `config-handler: install variant found is of a different instance, this is a first time launch`,
      );
      this.isFirstTime = true;
      this.bootCount = 0;
      sendAutoUpdateAnalytics(
        InstallActionTypes.InstallCompleted,
        InstallTypes.Manual,
      );
      return;
    }
    logger.info(
      `config-handler: install variant is the same as the existing one, not a first time launch`,
    );
    this.isFirstTime = false;
    this.bootCount = (this.getConfigFields(['bootCount']) as IConfig).bootCount;
    if (this.bootCount !== undefined) {
      this.bootCount++;
      await this.updateUserConfig({ bootCount: this.bootCount });
    } else {
      await this.updateUserConfig({ bootCount: 0 });
    }
  }

  /**
   * Creates a backup of the global config file
   */
  public backupGlobalConfig() {
    const installVariant = systemPreferences.getUserDefault(
      'installVariant',
      'string',
    );
    // If we already have a valid install variant in the plist
    // we have already migrated the data form global config to plist
    if (installVariant === '') {
      fs.copyFileSync(this.globalConfigPath, this.tempGlobalConfigFilePath);
    }
  }

  /**
   * Overwrites the global config file with the backed up config file
   */
  public copyGlobalConfig(settings: IConfig, appGlobalConfig: IConfig) {
    try {
      if (settings) {
        setPlistFromPreviousSettings(settings, appGlobalConfig);
        fs.unlinkSync(this.tempGlobalConfigFilePath);
      }
    } catch (e) {
      logger.error(
        `config-handler: unable to backup global config file error: `,
        e,
      );
    }
  }

  /**
   * filters out the cloud config
   */
  private filterCloudConfig(): void {
    const {
      acpFeatureLevelEntitlements,
      podLevelEntitlements,
      pmpEntitlements,
    } = this.cloudConfig as ICloudConfig;

    // Filter out some values
    const filteredACP = filterOutSelectedValues(acpFeatureLevelEntitlements, [
      true,
      'NOT_SET',
      '',
      [],
    ]);
    const filteredPod = filterOutSelectedValues(podLevelEntitlements, [
      true,
      'NOT_SET',
      '',
      [],
    ]);
    const filteredPMP = filterOutSelectedValues(pmpEntitlements, [
      true,
      'NOT_SET',
      '',
      [],
    ]);

    // priority is PMP > ACP > SDA
    this.filteredCloudConfig = {
      ...filteredACP,
      ...filteredPod,
      ...filteredPMP,
    };
  }

  /**
   * Parses the config data string
   *
   * @param data
   */
  private parseConfigData(data: string): object {
    let parsedData;
    if (!data) {
      logger.error(`config-handler: unable to read config file`);
      return parsedData;
    }
    try {
      parsedData = JSON.parse(data);
      logger.info(`config-handler: parsed JSON file with data`, parsedData);
    } catch (e: any) {
      logger.error(
        `config-handler: parsing JSON file failed due to error ${e}`,
      );
      throw new Error(e);
    }
    return parsedData;
  }

  /**
   * Reads a stores the global config file
   */
  private async readGlobalConfig() {
    if (isMac) {
      if (fs.existsSync(this.tempGlobalConfigFilePath)) {
        this.globalConfig = this.parseConfigData(
          fs.readFileSync(this.tempGlobalConfigFilePath, 'utf8'),
        );
        logger.info(
          `config-handler: temp global config exists using this file: `,
          this.tempGlobalConfigFilePath,
          this.globalConfig,
        );

        let appGlobalConfigData = {} as IConfig;
        if (fs.existsSync(this.globalConfigPath)) {
          appGlobalConfigData = this.parseConfigData(
            fs.readFileSync(this.globalConfigPath, 'utf8'),
          ) as IConfig;
        }
        this.copyGlobalConfig(
          this.globalConfig as IConfig,
          appGlobalConfigData,
        );
        // After everything is set from previous SDA version
        this.globalConfig = getAllUserDefaults();
        return;
      }
      if (!this.installVariant || this.installVariant === '') {
        logger.info(
          `config-handler: Initializing new plist file: `,
          this.installVariant,
        );
        initializePlistFile(this.postInstallScriptPath);
      }
      this.installVariant = systemPreferences.getUserDefault(
        'installVariant',
        'string',
      );
      this.globalConfig = getAllUserDefaults();
      logger.info(
        `config-handler: Global configuration from plist: `,
        this.globalConfig,
      );
      return;
    }
    if (!fs.existsSync(this.globalConfigPath)) {
      throw new Error(
        `Global config file missing! App will not run as expected!`,
      );
    }
    const parsedConfigData = this.parseConfigData(
      fs.readFileSync(this.globalConfigPath, 'utf8'),
    );
    if (parsedConfigData && Object.keys(parsedConfigData).length > 0) {
      this.globalConfig = parsedConfigData;
    }
    logger.info(`config-handler: Global configuration: `, this.globalConfig);
  }

  /**
   * Reads the install variant from a file
   */
  private readInstallVariant() {
    if (isMac) {
      this.installVariant = systemPreferences.getUserDefault(
        'installVariant',
        'string',
      );
      logger.info(
        `config-handler: Install variant from plist: `,
        this.installVariant,
      );
      return;
    }
    this.installVariant = fs.readFileSync(this.installVariantPath, 'utf8');
    logger.info(`config-handler: Install variant: `, this.installVariant);
  }

  /**
   * Reads and stores the cloud config file
   *
   * If cloud config doesn't exits?
   * this creates a new one with { }
   */
  private async readCloudConfig() {
    if (!fs.existsSync(this.cloudConfigPath)) {
      await app.whenReady();
      await this.updateCloudConfig({
        configVersion: app.getVersion().toString(),
      });
    }
    if (fs.existsSync(this.cloudConfigPath)) {
      const cloudConfig = fs.readFileSync(this.cloudConfigPath, 'utf8');
      if (cloudConfig) {
        this.cloudConfig = this.parseConfigData(cloudConfig);
      }
    }
    // recalculate cloud config when we the application starts
    this.filterCloudConfig();
    logger.info(`config-handler: Cloud configuration: `, this.userConfig);
  }
}

const config = new Config();

export { config };
