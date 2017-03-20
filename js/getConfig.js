'use strict';

const electron = require('electron');
const app = electron.app;
const path = require('path');
const fs = require('fs');
const isDevEnv = require('./utils/misc.js').isDevEnv;
const isMac = require('./utils/misc.js').isMac;

/**
 * reads global configuration file: config/Symphony.config. this file is
 * hold items (such as the start url) that are intended to be used as
 * global (or default) values for all users running this app. for production
 * this file is located relative to the executable - it is placed there by
 * the installer. this makes the file easily modifable by admin (or person who
 * installed app). for dev env, the file is read directly from packed asar file.
 */
var getConfig = function () {
    var promise = new Promise(function(resolve, reject) {
        let configPath;
        const configFile = 'config/Symphony.config';

        if (isDevEnv) {
            // for dev env, get config file from asar
            configPath = path.join(app.getAppPath(), configFile);
        } else {
            // for non-dev, config file is placed by installer relative to exe.
            // this is so the config can be easily be changed post install.
            let execPath = path.dirname(app.getPath('exe'));
            // for mac exec is stored in subdir, for linux/windows config
            // dir is in the same location.
            configPath = path.join(execPath, isMac ? '..' : '', configFile);
        }

        fs.readFile(configPath, 'utf8', function(err, data) {
            if (err) {
                reject('cannot open config file: ' + configPath + ', error: ' + err);
            } else {
                try {
                    // data is the contents of the text file we just read
                    let config = JSON.parse(data);
                    resolve(config.url);
                } catch (e) {
                    reject('can not parse config file data: ' + data + ', error: ' + err);
                }
            }
        });
    });
    return promise;
}

module.exports = getConfig
