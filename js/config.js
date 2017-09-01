'use strict';

const electron = require('electron');
const app = electron.app;
const path = require('path');
const fs = require('fs');
const isDevEnv = require('./utils/misc.js').isDevEnv;
const isMac = require('./utils/misc.js').isMac;
const getRegistry = require('./utils/getRegistry.js');
const configFileName = 'Symphony.config';

// For modifying user config while installation
const pick = require('lodash.pick');
const childProcess = require('child_process');
const AppDirectory = require('appdirectory');
const dirs = new AppDirectory('Symphony');

// cached config when first reading files. initially undefined and will be
// updated when read from disk.
let userConfig;
let globalConfig;

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
        .then(function(value) {
            // got value from user config
            return value;
        }, function() {
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
    return readUserConfig().then(function(config) {
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
    return new Promise(function(resolve, reject) {
        if (userConfig) {
            resolve(userConfig);
            return;
        }

        let configPath = customConfigPath;

        if (!configPath) {
            configPath = path.join(app.getPath('userData'), configFileName);
        }

        fs.readFile(configPath, 'utf8', function(err, data) {
            if (err) {
                reject('cannot open user config file: ' + configPath + ', error: ' + err);
            } else {
                try {
                    // data is the contents of the text file we just read
                    userConfig = JSON.parse(data);
                } catch (e) {
                    reject('can not parse user config file data: ' + data + ', error: ' + err);
                    return;
                }
                resolve(userConfig);
            }
        });
    });
}

/**
 * Gets a specific user config value for a field
 * @param fieldName
 * @returns {Promise}
 */
function getGlobalConfigField(fieldName) {
    return readGlobalConfig().then(function(config) {
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
    return new Promise(function(resolve, reject) {
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

        fs.readFile(configPath, 'utf8', function(err, data) {
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
                    .then(function(url) {
                        globalConfig.url = url;
                        resolve(globalConfig);
                    }).catch(function() {
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
        .then(function(config) {
            return saveUserConfig(fieldName, newValue, config);
        }, function() {
            // in case config doesn't exist, can't read or is corrupted.
            // add configVersion - just in case in future we need to provide
            // upgrade capabilities.
            return saveUserConfig(fieldName, newValue, {
                configVersion: '1.0.0'
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
    return new Promise(function(resolve, reject) {
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
 * Method to update multiple user config field
 * @param {Object} newGlobalConfig - The latest config changes from installer
 * @param {Object} oldUserConfig - The old user config data
 * @returns {Promise}
 */
function updateUserConfig(newGlobalConfig, oldUserConfig) {
    return new Promise((resolve, reject) => {
        // Picking some values from global config to overwrite user config
        const configDataToUpdate = pick(newGlobalConfig, ['url', 'minimizeOnClose', 'launchOnStartup', 'alwaysOnTop']);
        const updatedUserConfigData = Object.assign(oldUserConfig, configDataToUpdate);
        const jsonNewConfig = JSON.stringify(updatedUserConfigData, null, ' ');
        // get user config path
        let userConfigFile;

        if (isMac) {
            userConfigFile = path.join(dirs.userConfig(), configFileName);
        } else {
            userConfigFile = path.join(app.getPath('userData'), configFileName);
        }

        fs.writeFile(userConfigFile, jsonNewConfig, 'utf8', (err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
}

/**
 * Method to overwrite user config on windows installer
 * @param {String} perUserInstall - Is a flag to determine whether we are installing for per user
 * @returns {Promise}
 */
function updateUserConfigWin(perUserInstall) {
    return new Promise((resolve, reject) => {
        const userConfigFile = path.join(app.getPath('userData'), configFileName);
        // flag to determine whether per user installation
        if (!perUserInstall) {
            reject();
            return;
        }

        // if user config file does't exists just copy global config file
        if (!fs.existsSync(userConfigFile)) {
            resolve(copyConfigWin());
            return;
        }

        Promise.all([readGlobalConfig(), readUserConfig(userConfigFile)])
            .then((data) => {
                resolve(updateUserConfig(data[0], data[1]));
            })
            .catch((err) => {
                reject(err);
            });
    });
}

/**
 * Method to overwrite user config on mac installer
 * @param {String} globalConfigPath - The global config path from installer
 * @returns {Promise}
 */
function updateUserConfigMac(globalConfigPath) {
    return new Promise((resolve, reject) => {
        const userConfigFile = path.join(dirs.userConfig(), configFileName);

        // if user config file does't exists just copy global config file
        if (!fs.existsSync(userConfigFile)) {
            resolve(copyConfigMac(globalConfigPath));
            return;
        }

        Promise.all([readGlobalConfig(), readUserConfig(userConfigFile)])
            .then((data) => {
                resolve(updateUserConfig(data[0], data[1]));
            })
            .catch((err) => {
                reject(err);
            });
    });
}

/**
 * Method to copy global config file to user config directory for Windows
 * @returns {Promise}
 */
function copyConfigWin() {
    return new Promise((resolve, reject) => {
        const globalConfigFileName = path.join('config', configFileName);
        const execPath = path.dirname(app.getPath('exe'));
        const globalConfigPath = path.join(execPath, '', globalConfigFileName);
        const userConfigPath = app.getPath('userData');

        childProcess.exec(`echo D|xcopy /y /e /s /c "${globalConfigPath}" "${userConfigPath}"`, { timeout: 60000 }, (err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
}

/**
 * Method which copies global config file to user config directory for mac
 * @param {String} globalConfigPath - The global config path from installer
 * @returns {Promise}
 */
function copyConfigMac(globalConfigPath) {
    return new Promise((resolve, reject) => {
        let userConfigPath = dirs.userConfig() + '/';
        let userName = process.env.USER;

        childProcess.exec(`rsync -r "${globalConfigPath}" "${userConfigPath}" && chown -R "${userName}" "${userConfigPath}"`, { timeout: 60000 }, (err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
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

module.exports = {
    getConfigField,
    updateConfigField,
    configFileName,
    updateUserConfigWin,
    updateUserConfigMac,

    // items below here are only exported for testing, do NOT use!
    saveUserConfig,
    clearCachedConfigs
};