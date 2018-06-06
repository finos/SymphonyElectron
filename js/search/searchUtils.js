const fs = require('fs');
const { checkDiskSpace } = require('./utils/checkDiskSpace.js');
const searchConfig = require('./searchConfig.js');
const { isMac } = require('../utils/misc.js');

/**
 * Utils to validate users config data and
 * available disk space to enable electron search
 */
/*eslint class-methods-use-this: ["error", { "exceptMethods": ["checkFreeSpace"] }] */
class SearchUtils {

    /**
     * This function returns true if the available disk space
     * is more than the constant MINIMUM_DISK_SPACE
     * @param callback
     */
    checkFreeSpace(callback) {
        if (typeof callback !== "function") {
            return false;
        }
        let userDataPath = searchConfig.FOLDERS_CONSTANTS.USER_DATA_PATH;
        if (!isMac) {
            try {
                userDataPath = userDataPath.substring(0, 1);
            } catch (e) {
                return callback(false, 'Invalid Path');
            }
        }
        checkDiskSpace(userDataPath, callback);
        return null;
    }

    /**
     * This function return the user search config
     * @param userId
     * @returns {Promise<object>}
     */
    getSearchUserConfig(userId) {
        return new Promise((resolve, reject) => {
            readFile.call(this, userId, resolve, reject);
        });
    }

    /**
     * This function updates the user config file
     * with the provided data
     * @param userId
     * @param data
     * @returns {Promise<object>}
     */
    updateUserConfig(userId, data) {
        return new Promise((resolve, reject) => {
            updateConfig.call(this, userId, data, resolve, reject);
        });
    }
}

/**
 * This function reads the search user config file and
 * return the object
 * @param userId
 * @param resolve
 * @param reject
 */
function readFile(userId, resolve, reject) {
    if (fs.existsSync(`${searchConfig.FOLDERS_CONSTANTS.USER_CONFIG_FILE}`)) {
        fs.readFile(`${searchConfig.FOLDERS_CONSTANTS.USER_CONFIG_FILE}`, 'utf8', (err, data) => {
            if (err) {
                return reject(new Error('Error reading the '))
            }
            let usersConfig = {};
            try {
                usersConfig = JSON.parse(data);
            } catch (e) {
                createUserConfigFile(userId);
                return reject('can not parse user config file data: ' + data + ', error: ' + e);
            }
            if (!usersConfig[userId]) {
                createUser(userId, usersConfig);
                return reject(null);
            }
            return resolve(usersConfig[userId]);
        })
    } else {
        createUserConfigFile(userId);
        resolve(null);
    }
}

/**
 * If the config has no object for the provided userId this function
 * creates an empty object with the key as the userId
 * @param userId
 * @param oldConfig
 */
function createUser(userId, oldConfig) {
    let configPath = searchConfig.FOLDERS_CONSTANTS.USER_CONFIG_FILE;
    let newConfig = Object.assign({}, oldConfig);
    newConfig[userId] = {};

    let jsonNewConfig = JSON.stringify(newConfig, null, ' ');

    fs.writeFile(configPath, jsonNewConfig, 'utf8', (err) => {
        if (err) {
            throw new err;
        }
    });
}

/**
 * This function creates the config
 * file if not present
 * @param userId
 * @param data
 */
function createUserConfigFile(userId, data) {
    let userData = data;

    let createStream = fs.createWriteStream(searchConfig.FOLDERS_CONSTANTS.USER_CONFIG_FILE);
    if (userData) {
        if (!userData.indexVersion) {
            userData.indexVersion = searchConfig.INDEX_VERSION;
        }
        try {
            userData = JSON.stringify(userData);
            createStream.write(`{"${userId}": ${userData}}`);
        } catch (e) {
            createStream.write(`{"${userId}": {}}`);
        }
    } else {
        createStream.write(`{"${userId}": {}}`);
    }
    createStream.end();
}

/**
 * Function to update user config data
 * @param userId
 * @param data
 * @param resolve
 * @param reject
 * @returns {*}
 */
function updateConfig(userId, data, resolve, reject) {
    let userData = data;

    if (userData && !userData.indexVersion) {
        userData.indexVersion = searchConfig.INDEX_VERSION;
    }

    let configPath = searchConfig.FOLDERS_CONSTANTS.USER_CONFIG_FILE;
    if (!fs.existsSync(configPath)) {
        createUserConfigFile(userId, userData);
        return reject(null);
    }

    let oldConfig;
    let oldData = fs.readFileSync(configPath, 'utf8');

    try {
        oldConfig = JSON.parse(oldData);
    } catch (e) {
        createUserConfigFile(userId, data);
        return reject(new Error('can not parse user config file data: ' + e));
    }

    let newConfig = Object.assign({}, oldConfig);
    newConfig[userId] = data;

    let jsonNewConfig = JSON.stringify(newConfig, null, ' ');

    fs.writeFileSync(configPath, jsonNewConfig, 'utf8');
    return resolve(newConfig[userId]);
}

module.exports = {
    SearchUtils: SearchUtils
};
