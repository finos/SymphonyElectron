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
    mainWinPos?: ICustomRectangle;
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

export interface ICustomRectangle extends Partial<Electron.Rectangle> {
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
        logger.info(`config-handler: Trying to get config values for the fields ${fields}`);
        return { ...this.getGlobalConfigFields(fields), ...this.getUserConfigFields(fields) } as IConfig;
    }

    /**
     * Returns the specified fields from user config file
     *
     * @param fields {Array}
     */
    public getUserConfigFields(fields: string[]): IConfig {
        logger.info(`config-handler: Trying to get user config values for the fields ${fields}`);
        return pick(this.userConfig, fields) as IConfig;
    }

    /**
     * Returns the specified fields from global config file
     *
     * @param fields {Array}
     */
    public getGlobalConfigFields(fields: string[]): IConfig {
        logger.info(`config-handler: Trying to get global config values for the fields ${fields}`);
        return pick(this.globalConfig, fields) as IConfig;
    }

    /**
     * updates new data to the user config
     *
     * @param data {IConfig}
     */
    public async updateUserConfig(data: Partial<IConfig>): Promise<void> {
        logger.info(`config-handler: updating user config values with the data ${data}`);
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
            logger.info(`config-handler: setting first time launch for build ${buildNumber}`);
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
            logger.error(`config-handler: unable to read config file`);
            throw new Error('unable to read user config file');
        }
        try {
            parsedData = JSON.parse(data);
            logger.info(`config-handler: parsed JSON file with data ${JSON.stringify(parsedData)}`);
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
            logger.info(`config-handler: user config doesn't exist! will create new one and update config`);
            await this.updateUserConfig({ configVersion: app.getVersion().toString(), buildNumber } as IConfig);
        }
        this.userConfig = this.parseConfigData(fs.readFileSync(this.userConfigPath, 'utf8'));
        logger.info(`config-handler: user config exists with data ${JSON.stringify(this.userConfig)}`);
    }

    /**
     * Reads a stores the global config file
     */
    private readGlobalConfig() {
        this.globalConfig = this.parseConfigData(fs.readFileSync(this.globalConfigPath, 'utf8'));
        logger.info(`config-handler: global config exists with data ${JSON.stringify(this.globalConfig)}`);
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
