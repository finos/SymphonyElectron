'use strict';

const electron = require('electron');
const app = electron.app;
const path = require('path');
const fs = require('fs');
const omit = require('lodash.omit');
const pick = require('lodash.pick');
const difference = require('lodash.difference');

const isDevEnv = require('./utils/misc.js').isDevEnv;
const isMac = require('./utils/misc.js').isMac;
const getRegistry = require('./utils/getRegistry.js');
const log = require('./log.js');
const logLevels = require('./enums/logLevels.js');

const configFileName = 'Symphony.config';

// cached config when first reading files. initially undefined and will be
// updated when read from disk.
let userConfig;
let globalConfig;

let ignoreSettings = [
    'minimizeOnClose',
    'launchOnStartup',
    'alwaysOnTop',
    'url',
    'memoryRefresh',
    'bringToFront',
    'isCustomTitleBar'
];

/**
 * Tries to read given field from user config file, if field doesn't exist
 * then tries reading from global config. User config is stord in directory:
 * app.getPath('userData') and file called Symphony.config.  Global config is
 * stored in file Symphony.config in directory where executable gets installed.
 *
 * Config is a flat key/value file.
 * e.g. { url: 'https://my.symphony.com', }
 *
 * @param  {String} fieldName Name of field to try fetching
 * @return {Promise}          Returns promise that will succeed with field
 * value if found in either user or global config. Otherwise will fail promise.
 */
function getConfigField(fieldName) {
    return getUserConfigField(fieldName)
        .then((value) => {
            // got value from user config
            return value;
        }, () => {
            // failed to get value from user config, so try global config
            return getGlobalConfigField(fieldName);
        });
}

/**
 * Gets a specific user config value for a field
 * @param fieldName
 * @returns {Promise}
 */
function getUserConfigField(fieldName) {
    return readUserConfig().then((config) => {
        if (typeof fieldName === 'string' && fieldName in config) {
            return config[fieldName];
        }

        throw new Error('field does not exist in user config: ' + fieldName);
    });
}

/**
 * Reads the user config file and returns all the attributes
 * @param customConfigPath
 * @returns {Promise}
 */
function readUserConfig(customConfigPath) {

    return new Promise((resolve, reject) => {
        
        if (userConfig) {
            resolve(userConfig);
            return;
        }

        let configPath = customConfigPath;

        if (!configPath) {
            configPath = path.join(app.getPath('userData'), configFileName);
        }
        
        log.send(logLevels.INFO, `config path ${configPath}`);

        fs.readFile(configPath, 'utf8', (err, data) => {
            
            if (err) {
                log.send(logLevels.INFO, `cannot open user config file ${configPath}, error is ${err}`);
                reject(`cannot open user config file ${configPath}, error is ${err}`);
                return;
            }
            
            try {
                // data is the contents of the text file we just read
                userConfig = JSON.parse(data);
                log.send(logLevels.INFO, `user config data is ${JSON.stringify(userConfig)}`);
                resolve(userConfig);
            } catch (e) {
                log.send(logLevels.INFO, `cannot parse user config data ${data}, error is ${e}`);
                reject(`cannot parse user config data ${data}, error is ${e}`);
            }
            
        });
    });
}

/**
 * Gets a specific global config value for a field
 * @param fieldName
 * @returns {Promise}
 */
function getGlobalConfigField(fieldName) {
    return readGlobalConfig().then((config) => {
        if (typeof fieldName === 'string' && fieldName in config) {
            return config[fieldName];
        }

        throw new Error('field does not exist in global config: ' + fieldName);
    });
}

/**
 * reads global configuration file: config/Symphony.config. this file is
 * hold items (such as the start url) that are intended to be used as
 * global (or default) values for all users running this app. for production
 * this file is located relative to the executable - it is placed there by
 * the installer. this makes the file easily modifable by admin (or person who
 * installed app). for dev env, the file is read directly from packed asar file.
 */
function readGlobalConfig() {
    return new Promise((resolve, reject) => {
        if (globalConfig) {
            resolve(globalConfig);
            return;
        }

        let configPath;
        let globalConfigFileName = path.join('config', configFileName);
        if (isDevEnv) {
            // for dev env, get config file from asar
            configPath = path.join(app.getAppPath(), globalConfigFileName);
        } else {
            // for non-dev, config file is placed by installer relative to exe.
            // this is so the config can be easily be changed post install.
            let execPath = path.dirname(app.getPath('exe'));
            // for mac exec is stored in subdir, for linux/windows config
            // dir is in the same location.
            configPath = path.join(execPath, isMac ? '..' : '', globalConfigFileName);
        }

        fs.readFile(configPath, 'utf8', (err, data) => {
            if (err) {
                reject('cannot open global config file: ' + configPath + ', error: ' + err);
            } else {
                try {
                    // data is the contents of the text file we just read
                    globalConfig = JSON.parse(data);
                } catch (e) {
                    reject('can not parse config file data: ' + data + ', error: ' + err);
                }
                getRegistry('PodUrl')
                    .then((url) => {
                        globalConfig.url = url;
                        resolve(globalConfig);
                    }).catch(() => {
                        resolve(globalConfig);
                    });
            }
        });
    });
}

/**
 * Updates user config with given field with new value
 * @param  {String} fieldName  Name of field in config to be added/changed.
 * @param  {Object} newValue   Object to replace given value
 * @return {Promise}           Promise that resolves/rejects when file write is complete.
 */
function updateConfigField(fieldName, newValue) {
    return readUserConfig()
        .then((config) => {
            return saveUserConfig(fieldName, newValue, config);
        }, () => {
            // in case config doesn't exist, can't read or is corrupted.
            // add configVersion - just in case in future we need to provide
            // upgrade capabilities.
            return saveUserConfig(fieldName, newValue, {
                configVersion: app.getVersion().toString(),
            });
        });
}

/**
 * Saves an updated value to the user config
 * @param fieldName
 * @param newValue
 * @param oldConfig
 * @returns {Promise}
 */
function saveUserConfig(fieldName, newValue, oldConfig) {
    return new Promise((resolve, reject) => {
        let configPath = path.join(app.getPath('userData'), configFileName);

        if (!oldConfig || !fieldName) {
            reject('can not save config, invalid input');
            return;
        }

        // clone and set new value
        let newConfig = Object.assign({}, oldConfig);
        newConfig[fieldName] = newValue;

        let jsonNewConfig = JSON.stringify(newConfig, null, ' ');

        fs.writeFile(configPath, jsonNewConfig, 'utf8', (err) => {
            if (err) {
                reject(err);
            } else {
                userConfig = newConfig;
                resolve(newConfig);
            }
        });
    });
}

/**
 * Updates the existing user config settings by removing
 * 'minimizeOnClose', 'launchOnStartup', 'url' and 'alwaysOnTop'
 * @param {Object} oldUserConfig the old user config object
 */
function updateUserConfig(oldUserConfig) {

    return new Promise((resolve, reject) => {

        // create a new object from the old user config
        // by ommitting the user related settings from
        // the old user config
        log.send(logLevels.INFO, `old user config string ${JSON.stringify(oldUserConfig)}`);
        let newUserConfig = omit(oldUserConfig, ignoreSettings);
        let newUserConfigString = JSON.stringify(newUserConfig, null, 2);

        log.send(logLevels.INFO, `new config string ${newUserConfigString}`);
        
        // get the user config path
        let userConfigFile;
        userConfigFile = path.join(app.getPath('userData'), configFileName);

        if (!userConfigFile) {
            reject(`user config file doesn't exist`);
            return;
        }

        // write the new user config changes to the user config file
        fs.writeFile(userConfigFile, newUserConfigString, 'utf-8', (err) => {
            if (err) {
                reject(`Failed to update user config error: ${err}`);
                return;
            }
            resolve();
        });
    });

}

/**
 * Manipulates user config on first time launch
 * @returns {Promise}
 */
function updateUserConfigOnLaunch() {
    // we get the user config path using electron
    const userConfigFile = path.join(app.getPath('userData'), configFileName);

    // if it's not a per user installation or if the
    // user config file doesn't exist, we simple move on
    if (!fs.existsSync(userConfigFile)) {
        log.send(logLevels.WARN, 'config: Could not find the user config file!');
        return Promise.reject('config: Could not find the user config file!');
    }

    // In case the file exists, we remove it so that all the
    // values are fetched from the global config
    // https://perzoinc.atlassian.net/browse/ELECTRON-126
    return readUserConfig(userConfigFile).then((data) => {
        // Add version info to the user config data
        const version = app.getVersion().toString() || '1.0.0';
        const updatedData = Object.assign(data || {}, { configVersion: version });

        return updateUserConfig(updatedData);
    }).catch((err) => {
        return Promise.reject(err);
    });

}

/**
 * Method that tries to grab multiple config field from user config
 * if field doesn't exist tries reading from global config
 *
 * @param {Array} fieldNames - array of config filed names
 * @returns {Promise} - object all the config data from user and global config
 */
function getMultipleConfigField(fieldNames) {
    return new Promise((resolve, reject) => {
        let userConfigData;

        if (!fieldNames && fieldNames.length < 0) {
            reject('cannot read config file, invalid fields');
            return;
        }

        // reads user config data
        readUserConfig().then((config) => {
            userConfigData = pick(config, fieldNames);
            let userConfigKeys = userConfigData ? Object.keys(userConfigData) : undefined;

            /**
             * Condition to validate data from user config,
             * if all the required fields are not present
             * this tries to fetch the remaining fields from global config
             */
            if (!userConfigKeys || userConfigKeys.length < fieldNames.length) {

                // remainingConfig - config field that are not present in the user config
                let remainingConfig = difference(fieldNames, userConfigKeys);

                if (remainingConfig && Object.keys(remainingConfig).length > 0) {
                    readGlobalConfig().then((globalConfigData) => {
                        // assigns the remaining fields from global config to the user config
                        userConfigData = Object.assign(userConfigData, pick(globalConfigData, remainingConfig));
                        resolve(userConfigData);
                    }).catch((err) => {
                        reject(err);
                    });
                }

            } else {
                resolve(userConfigData);
            }
        }).catch(() => {
            // This reads global config if there was any
            // error while reading user config
            readGlobalConfig().then((config) => {
                userConfigData = pick(config, fieldNames);
                resolve(userConfigData);
            }).catch((err) => {
                reject(err);
            });
        });
    });
}


/**
 * Clears the cached config
 */
function clearCachedConfigs() {
    userConfig = null;
    globalConfig = null;
}

function readConfigFileSync() {
    
    let configPath;
    let globalConfigFileName = path.join('config', configFileName);
    if (isDevEnv) {
        // for dev env, get config file from asar
        configPath = path.join(app.getAppPath(), globalConfigFileName);
    } else {
        // for non-dev, config file is placed by installer relative to exe.
        // this is so the config can be easily be changed post install.
        let execPath = path.dirname(app.getPath('exe'));
        // for mac exec is stored in subdir, for linux/windows config
        // dir is in the same location.
        configPath = path.join(execPath, isMac ? '..' : '', globalConfigFileName);
    }
    
    let data = fs.readFileSync(configPath);
    
    try {
        return JSON.parse(data);
    } catch (err) {
        log.send(logLevels.ERROR, 'config: parsing config failed: ' + err);
    }
    
    return null;
    
}

module.exports = {

    configFileName,

    getConfigField,

    updateConfigField,
    updateUserConfigOnLaunch,
    
    getMultipleConfigField,

    // items below here are only exported for testing, do NOT use!
    saveUserConfig,
    clearCachedConfigs,
    
    readConfigFileSync,

    // use only if you specifically need to read global config fields
    getGlobalConfigField,
    getUserConfigField
};
