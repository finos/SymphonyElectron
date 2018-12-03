import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

import { omit } from 'lodash';
import { isDevEnv, isMac } from '../common/env';
import { logger } from '../common/logger';
import { compareVersions, pick } from '../common/utils';

const ignoreSettings =  [
    'minimizeOnClose',
    'launchOnStartup',
    'alwaysOnTop',
    'url',
    'memoryRefresh',
    'bringToFront',
    'isCustomTitleBar',
];

export interface IConfig {
    url: string;
    minimizeOnClose: boolean;
    launchOnStartup: boolean;
    alwaysOnTop: boolean;
    bringToFront: boolean;
    whitelistUrl: string;
    isCustomTitleBar: boolean;
    memoryRefresh: boolean;
    devToolsEnabled: boolean;
    ctWhitelist: string[];
    configVersion: string;
    autoLaunchPath: string;
    notificationSettings: INotificationSetting;
    permissions: IPermission;
    customFlags: ICustomFlag;
    crashReporter: ICrashReporter;
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
    disableGpu: boolean;
}

export interface ICrashReporter {
    submitURL: string;
    companyName: string;
    uploadToServer: boolean;
}

export interface INotificationSetting {
    position: string;
    display: string;
}

class Config {
    private userConfig: IConfig | {};
    private globalConfig: IConfig | {};
    private isFirstTime: boolean = true;
    private readonly configFileName: string;
    private readonly userConfigPath: string;
    private readonly appPath: string;
    private readonly globalConfigPath: string;

    constructor() {
        this.configFileName = 'Symphony.config';
        this.userConfigPath = path.join(app.getPath('userData'), this.configFileName);
        this.appPath = isDevEnv ? app.getAppPath() : path.dirname(app.getPath('exe'));
        this.globalConfigPath = isDevEnv
            ? path.join(this.appPath, path.join('config', this.configFileName))
            : path.join(this.appPath, isMac ? '..' : '', 'config', this.configFileName);

        this.globalConfig = {};
        this.userConfig = {};
        this.readUserConfig();
        this.readGlobalConfig();

        this.checkFirstTimeLaunch();
    }

    /**
     * Returns the specified fields from both user and global config file
     * and keep values from user config as priority
     *
     * @param fields
     */
    public getConfigFields(fields: string[]): IConfig {
        return { ...this.getGlobalConfigFields(fields), ...this.getUserConfigFields(fields) } as IConfig;
    }

    /**
     * Returns the specified fields from user config file
     *
     * @param fields {Array}
     */
    public getUserConfigFields(fields: string[]): IConfig {
        return pick(this.userConfig, fields) as IConfig;
    }

    /**
     * Returns the specified fields from global config file
     *
     * @param fields {Array}
     */
    public getGlobalConfigFields(fields: string[]): IConfig {
        return pick(this.globalConfig, fields) as IConfig;
    }

    /**
     * updates new data to the user config
     *
     * @param data {IConfig}
     */
    public updateUserConfig(data: Partial<IConfig>): void {
        this.userConfig = { ...this.userConfig, ...data };
        fs.writeFileSync(this.userConfigPath, JSON.stringify(this.userConfig), { encoding: 'utf8' });
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
        const filteredFields: IConfig = omit(this.userConfig, ignoreSettings) as IConfig;
        await this.updateUserConfig(filteredFields);
    }

    /**
     * Parses the config data string
     *
     * @param data
     */
    private parseConfigData(data: string): object {
        let parsedData;
        if (!data) {
            throw new Error('unable to read user config file');
        }
        try {
            parsedData = JSON.parse(data);
        } catch (e) {
            throw new Error(e);
        }
        return parsedData;
    }

    /**
     * Reads a stores the user config file
     *
     * If user config doesn't exits?
     * this creates a new one with { configVersion: current_app_version }
     */
    private readUserConfig() {
        if (!fs.existsSync(this.userConfigPath)) {
            this.updateUserConfig({ configVersion: app.getVersion().toString() } as IConfig);
        }
        this.userConfig = this.parseConfigData(fs.readFileSync(this.userConfigPath, 'utf8'));
    }

    /**
     * Reads a stores the global config file
     */
    private readGlobalConfig() {
        this.globalConfig = this.parseConfigData(fs.readFileSync(this.globalConfigPath, 'utf8'));
    }

    /**
     * Verifies if the application is launched for the first time
     */
    private checkFirstTimeLaunch() {
        logger.info('checking first launch');
        const appVersionString = app.getVersion().toString();
        const execPath = path.dirname(this.appPath);
        const shouldUpdateUserConfig = execPath.indexOf('AppData\\Local\\Programs') !== -1 || isMac;
        const userConfigVersion = this.userConfig && (this.userConfig as IConfig).configVersion || null;

        if (!userConfigVersion) {
            this.isFirstTime = true;
            return;
        }

        if (!(userConfigVersion
            && typeof userConfigVersion === 'string'
            && (compareVersions(appVersionString, userConfigVersion) !== 1)) && shouldUpdateUserConfig) {
            this.isFirstTime = true;
            return;
        }
        this.isFirstTime = false;
    }
}

const config = new Config();

export {
    config,
};