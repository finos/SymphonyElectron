import { app, dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

import { omit } from 'lodash';
import * as util from 'util';
import { buildNumber } from '../../package.json';
import { isDevEnv, isMac } from '../common/env';
import { logger } from '../common/logger';
import { pick } from '../common/utils';

const writeFile = util.promisify(fs.writeFile);

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
    buildNumber: string;
    autoLaunchPath: string;
    notificationSettings: INotificationSetting;
    permissions: IPermission;
    customFlags: ICustomFlag;
    crashReporter: ICrashReporter;
    mainWinPos: ICustomRectangle;
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

export interface ICustomRectangle extends Electron.Rectangle {
    isMaximized: boolean;
    isFullScreen: boolean;
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
    public async updateUserConfig(data: Partial<IConfig>): Promise<void> {
        this.userConfig = { ...this.userConfig, ...data };
        try {
            await writeFile(this.userConfigPath, JSON.stringify(this.userConfig), { encoding: 'utf8' });
        } catch (error) {
            logger.error(`config-handler: failed to update user config file with ${data}`, error);
            dialog.showErrorBox('Error updating user config file', 'failed to write user config file with ${}');
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
            const filteredFields: IConfig = omit(this.userConfig, ignoreSettings) as IConfig;
            // update to the new build number
            filteredFields.buildNumber = buildNumber;
            return await this.updateUserConfig(filteredFields);
        }
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
     * this creates a new one with { configVersion: current_app_version, buildNumber: current_app_build_number }
     */
    private async readUserConfig() {
        if (!fs.existsSync(this.userConfigPath)) {
            await this.updateUserConfig({ configVersion: app.getVersion().toString(), buildNumber } as IConfig);
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
    private async checkFirstTimeLaunch() {
        logger.info('checking first launch');
        const configBuildNumber = this.userConfig && (this.userConfig as IConfig).buildNumber || null;

        if (!configBuildNumber) {
            this.isFirstTime = true;
            return;
        }

        if (configBuildNumber && typeof configBuildNumber === 'string' && configBuildNumber !== buildNumber) {
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
