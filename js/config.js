'use strict';

const electron = require('electron');
const app = electron.app;
const path = require('path');
const fs = require('fs');
const isDevEnv = require('./utils/misc.js').isDevEnv;
const isMac = require('./utils/misc.js').isMac;
const getRegistry = require('./utils/getRegistry.js');
const configFileName = 'Symphony.config';

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
    }, function () {
        // failed to get value from user config, so try global config
        return getGlobalConfigField(fieldName);
    });
}

function getUserConfigField(fieldName) {
    return readUserConfig().then(function(config) {
        if (typeof fieldName === 'string' && fieldName in config) {
            return config[fieldName];
        }

        throw new Error('field does not exist in user config: ' + fieldName);
    });
}

function readUserConfig() {
    return new Promise(function(resolve, reject) {
        let configPath = path.join(app.getPath('userData'), configFileName);

        fs.readFile(configPath, 'utf8', function(err, data) {
            if (err) {
                reject('cannot open user config file: ' + configPath + ', error: ' + err);
            } else {
                let config = {};
                try {
                    // data is the contents of the text file we just read
                    config = JSON.parse(data);
                } catch (e) {
                    reject('can not parse user config file data: ' + data + ', error: ' + err);
                }

                resolve(config);
            }
        });
    });
}

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
                let config = {};
                try {
                    // data is the contents of the text file we just read
                    config = JSON.parse(data);
                } catch (e) {
                    reject('can not parse config file data: ' + data + ', error: ' + err);
                }
                getRegistry('PodUrl')
                .then(function(url){
                    config.url = url;
                    resolve(config);
                }).catch(function (){
                    resolve(config);
                });
            }
        });
    });
}

/**
 * Updates user config with given field with new value
 * @param  {String} fieldName [description]
 * @param  {Object} newValue  object to replace given value
 * @return {[type]}           [description]
 */
function updateConfigField(fieldName, newValue) {
    return readUserConfig()
    .then(function(config) {
        return saveUserConfig(fieldName, newValue, config);
    },
    function() {
        // in case config doesn't exist, can't read or is corrupted.
        return saveUserConfig(fieldName, newValue, {});
    });
}

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
                resolve(newConfig);
            }
        });
    });
}

module.exports = {getConfigField, updateConfigField, configFileName};
