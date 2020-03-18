import { app, dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

import * as util from 'util';
import { buildNumber } from '../../package.json';
import { isDevEnv, isElectronQA, isLinux, isMac } from '../common/env';
import { logger } from '../common/logger';
import { filterOutSelectedValues, pick } from '../common/utils';

const writeFile = util.promisify(fs.writeFile);

export enum CloudConfigDataTypes {
    NOT_SET = 'NOT_SET',
    ENABLED = 'ENABLED',
    DISABLED = 'DISABLED',
}

export interface IGlobalConfig {
    url: string;
    contextIsolation: boolean;
}

export interface IConfig {
    minimizeOnClose: CloudConfigDataTypes;
    launchOnStartup: CloudConfigDataTypes;
    alwaysOnTop: CloudConfigDataTypes;
    bringToFront: CloudConfigDataTypes;
    whitelistUrl: string;
    isCustomTitleBar: CloudConfigDataTypes;
    memoryRefresh: CloudConfigDataTypes;
    memoryThreshold: string;
    disableGpu: boolean;
    devToolsEnabled: boolean;
    ctWhitelist: string[];
    podWhitelist: string[];
    autoLaunchPath: string;
    permissions: IPermission;
    customFlags: ICustomFlag;
    buildNumber?: string;
    configVersion?: string;
    notificationSettings: INotificationSetting;
    mainWinPos?: ICustomRectangle;
    locale?: string;
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
    memoryThreshold: string;
    ctWhitelist: string;
    podWhitelist: string;
    authNegotiateDelegateWhitelist: string;
    whitelistUrl: string;
    authServerWhitelist: string;
    autoLaunchPath: string;
}

export interface IACPFeatureLevelEntitlements {
    devToolsEnabled: boolean;
    permissions: IPermission;
}

export interface IPMPEntitlements {
    minimizeOnClose: CloudConfigDataTypes;
    bringToFront: CloudConfigDataTypes;
    memoryRefresh: CloudConfigDataTypes;
    refreshAppThreshold: CloudConfigDataTypes;
    disableThrottling: CloudConfigDataTypes;
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

class Config {
    private userConfig: IConfig | {};
    private globalConfig: IConfig | {};
    private cloudConfig: ICloudConfig | {};
    private filteredCloudConfig: ICloudConfig | {};
    private isFirstTime: boolean = true;
    private readonly configFileName: string;
    private readonly userConfigPath: string;
    private readonly appPath: string;
    private readonly globalConfigPath: string;
    private readonly cloudConfigPath: string;

    constructor() {
        this.configFileName = 'Symphony.config';
        this.userConfigPath = path.join(app.getPath('userData'), this.configFileName);
        this.cloudConfigPath = path.join(app.getPath('userData'), 'cloudConfig.config');
        this.appPath = isDevEnv ? app.getAppPath() : path.dirname(app.getPath('exe'));
        this.globalConfigPath = isDevEnv
            ? path.join(this.appPath, path.join('config', this.configFileName))
            : path.join(this.appPath, (isMac) ? '..' : '', 'config', this.configFileName);

        if (isLinux) {
            this.globalConfigPath = path.join(this.appPath, (isElectronQA) ? '..' : '', 'config', this.configFileName);
        }

        this.globalConfig = {};
        this.userConfig = {};
        this.cloudConfig = {};
        this.filteredCloudConfig = {};
        this.readUserConfig();
        this.readGlobalConfig();
        this.readCloudConfig();

        this.checkFirstTimeLaunch();
    }

    /**
     * Returns the specified fields from both user and global config file
     * and keep values from user config as priority
     *
     * @param fields
     */
    public getConfigFields(fields: string[]): IConfig {
        const configFields = { ...this.getGlobalConfigFields(fields), ...this.getUserConfigFields(fields), ...this.getFilteredCloudConfigFields(fields) } as IConfig;
        logger.info(`config-handler: getting combined config values for the fields ${fields}`, configFields);
        return configFields;
    }

    /**
     * Returns the specified fields from user config file
     *
     * @param fields {Array}
     */
    public getUserConfigFields(fields: string[]): IConfig {
        const userConfigData = pick(this.userConfig, fields) as IConfig;
        logger.info(`config-handler: getting user config values for the fields ${fields}`, userConfigData);
        return userConfigData;
    }

    /**
     * Returns the specified fields from global config file
     *
     * @param fields {Array}
     */
    public getGlobalConfigFields(fields: string[]): IGlobalConfig {
        const globalConfigData = pick(this.globalConfig, fields) as IGlobalConfig;
        logger.info(`config-handler: getting global config values for the fields ${fields}`, globalConfigData);
        return globalConfigData;
    }

    /**
     * Returns filtered & prioritised fields from cloud config file
     *
     * @param fields {Array}
     */
    public getFilteredCloudConfigFields(fields: string[]): IConfig | {} {
        const filteredCloudConfigData = pick(this.filteredCloudConfig, fields) as IConfig;
        logger.info(`config-handler: getting filtered cloud config values for the ${fields}`, filteredCloudConfigData);
        return filteredCloudConfigData;
    }

    /**
     * Returns the actual cloud config with priority
     * @param fields
     */
    public getCloudConfigFields(fields: string[]): IConfig {
        const { acpFeatureLevelEntitlements, podLevelEntitlements, pmpEntitlements } = this.cloudConfig as ICloudConfig;
        const cloudConfig = { ...acpFeatureLevelEntitlements, ...podLevelEntitlements, ...pmpEntitlements };
        logger.info(`config-handler: prioritized cloud config data`, cloudConfig);
        const cloudConfigData = pick(cloudConfig, fields) as IConfig;
        logger.info(`config-handler: getting prioritized cloud config values for the fields ${fields}`, cloudConfigData);
        return cloudConfigData;
    }

    /**
     * updates new data to the user config
     *
     * @param data {IConfig}
     */
    public async updateUserConfig(data: Partial<IConfig>): Promise<void> {
        logger.info(`config-handler: updating user config values with the data`, data);
        this.userConfig = { ...this.userConfig, ...data };
        try {
            await writeFile(this.userConfigPath, JSON.stringify(this.userConfig), { encoding: 'utf8' });
            logger.info(`config-handler: updated user config values with the data ${data}`);
        } catch (error) {
            logger.error(`config-handler: failed to update user config file with ${data}`, error);
            dialog.showErrorBox(`Update failed`, `Failed to update user config due to error: ${error}`);
        }
    }

    /**
     * updates new data to the cloud config
     *
     * @param data {IConfig}
     */
    public async updateCloudConfig(data: Partial<ICloudConfig>): Promise<void> {
        logger.info(`config-handler: Updating the cloud config data from SFE: `, data);
        this.cloudConfig = { ...this.cloudConfig, ...data };
        // recalculate cloud config when we have data from SFE
        this.filterCloudConfig();
        logger.info(`config-handler: prioritized and filtered cloud config: `, this.filteredCloudConfig);
        try {
            await writeFile(this.cloudConfigPath, JSON.stringify(this.cloudConfig), { encoding: 'utf8' });
            logger.info(`config-handler: writing cloud config values to file`);
        } catch (error) {
            logger.error(`config-handler: failed to update cloud config file with ${data}`, error);
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
        const shouldUpdateUserConfig = execPath.indexOf('AppData\\Local\\Programs') !== -1 || isMac;
        if (shouldUpdateUserConfig) {
            const {
                minimizeOnClose,
                launchOnStartup,
                alwaysOnTop,
                memoryRefresh,
                bringToFront,
                isCustomTitleBar,
                ...filteredFields }: IConfig = this.userConfig as IConfig;
            // update to the new build number
            filteredFields.buildNumber = buildNumber;
            logger.info(`config-handler: setting first time launch for build`, buildNumber);
            return await this.updateUserConfig(filteredFields);
        }
    }

    /**
     * filters out the cloud config
     */
    private filterCloudConfig(): void {
        const { acpFeatureLevelEntitlements, podLevelEntitlements, pmpEntitlements } = this.cloudConfig as ICloudConfig;

        // Filter out some values
        const filteredACP = filterOutSelectedValues(acpFeatureLevelEntitlements, [ true, 'NOT_SET', '', [] ]);
        const filteredPod = filterOutSelectedValues(podLevelEntitlements, [ true, 'NOT_SET', '', [] ]);
        const filteredPMP = filterOutSelectedValues(pmpEntitlements, [ true, 'NOT_SET', '', [] ]);

        // priority is PMP > ACP > SDA
        this.filteredCloudConfig = { ...filteredACP, ...filteredPod, ...filteredPMP };
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
            throw new Error('unable to read user config file');
        }
        try {
            parsedData = JSON.parse(data);
            logger.info(`config-handler: parsed JSON file with data`, parsedData);
        } catch (e) {
            logger.error(`config-handler: parsing JSON file failed due to error ${e}`);
            throw new Error(e);
        }
        return parsedData;
    }

    /**
     * Reads a stores the user config file
     *
     * If user config doesn't exits?
     * this creates a new one with { configVersion: current_app_version, buildNumber: current_app_build_number }
     */
    private async readUserConfig() {
        if (!fs.existsSync(this.userConfigPath)) {
            // Need to wait until app ready event to access user data
            await app.whenReady();
            await this.readGlobalConfig();
            logger.info(`config-handler: user config doesn't exist! will create new one and update config`);
            await this.updateUserConfig({ configVersion: app.getVersion().toString(), buildNumber, ...this.globalConfig } as IConfig);
        }
        this.userConfig = this.parseConfigData(fs.readFileSync(this.userConfigPath, 'utf8'));
        logger.info(`config-handler: User configuration: `, this.userConfig);
    }

    /**
     * Reads a stores the global config file
     */
    private readGlobalConfig() {
        this.globalConfig = this.parseConfigData(fs.readFileSync(this.globalConfigPath, 'utf8'));
        logger.info(`config-handler: Global configuration: `, this.globalConfig);
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
            await this.updateCloudConfig({ configVersion: app.getVersion().toString() });
        }
        this.cloudConfig = this.parseConfigData(fs.readFileSync(this.cloudConfigPath, 'utf8'));
        // recalculate cloud config when we the application starts
        this.filterCloudConfig();
        logger.info(`config-handler: Cloud configuration: `, this.userConfig);
    }

    /**
     * Verifies if the application is launched for the first time
     */
    private async checkFirstTimeLaunch() {
        logger.info('config-handler: checking first time launch');
        const configBuildNumber = this.userConfig && (this.userConfig as IConfig).buildNumber || null;

        if (!configBuildNumber) {
            logger.info(`config-handler: there's no build number found, this is a first time launch`);
            this.isFirstTime = true;
            return;
        }

        if (configBuildNumber && typeof configBuildNumber === 'string' && configBuildNumber !== buildNumber) {
            logger.info(`config-handler: build number found is of an older build, this is a first time launch`);
            this.isFirstTime = true;
            return;
        }
        logger.info(`config-handler: build number is the same as the previous build, not a first time launch`);
        this.isFirstTime = false;
    }
}

const config = new Config();

export {
    config,
};
