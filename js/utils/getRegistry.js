'use strict';

const symphonyRegistry = '\\Software\\Symphony\\Symphony\\';
const { isMac } = require('./misc.js');
const log = require('../log.js');
const logLevels = require('../enums/logLevels.js');

let Registry = require('winreg');
let symphonyRegistryHKCU = new Registry({
    hive: Registry.HKCU,
    key:  symphonyRegistry
});

let symphonyRegistryHKLM = new Registry({
    key:  symphonyRegistry
});

let symphonyRegistryHKLM6432 = new Registry({
    key:  symphonyRegistry.replace('\\Software','\\Software\\WOW6432Node')
});

/**
 * Reads Windows Registry key. This Registry holds the Symphony registry keys
 * that are intended to be used as global (or default) value for all users
 * running this app.
 */
let getRegistry = function (name) {
    return new Promise(function (resolve, reject) {
        if (isMac) {
            reject('registry is not supported for mac osx.');
            return;
        }

        //Try to get registry on HKEY_CURRENT_USER
        symphonyRegistryHKCU.get(name, function (err1, reg1) {
            if (!err1 && reg1 !== null && reg1.value) {
                log.send(logLevels.WARN, 'getRegistry: Cannot find ' + name + ' Registry. Using HKCU');
                resolve(reg1.value);
                return;
            }

            //Try to get registry on HKEY_LOCAL_MACHINE
            symphonyRegistryHKLM.get(name, function (err2, reg2) {
                if (!err2 && reg2 !== null && reg2.value) {
                    log.send(logLevels.WARN, 'getRegistry: Cannot find ' + name + ' Registry. Using HKLM');
                    resolve(reg2.value);
                    return;
                }

                // Try to get registry on HKEY_LOCAL_MACHINE in case 32bit app installed on 64bit system.
                // winreg does not merge keys as normally windows does.
                symphonyRegistryHKLM6432.get(name, function (err3, reg3) {
                    if (!err3 && reg3 !== null && reg3.value) {
                        resolve(reg3.value);
                    } else {
                        reject('Cannot find PodUrl Registry. Using default url.');
                    }
                });
            });
        });
    });
};

module.exports = getRegistry;
