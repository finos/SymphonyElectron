'use strict';

const symphonyRegistry = '\\Software\\Symphony\\Symphony\\';
const { isMac } = require('./misc.js');
const log = require('../log.js');
const logLevels = require('../enums/logLevels.js');

var Registry = require('winreg');
var symphonyRegistryHKCU = new Registry({
    hive: Registry.HKCU,
    key:  symphonyRegistry
});

var symphonyRegistryHKLM = new Registry({
    key:  symphonyRegistry
});

var symphonyRegistryHKLM6432 = new Registry({
    key:  symphonyRegistry.replace('\\Software','\\Software\\WOW6432Node')
});

/**
 * Reads Windows Registry key. This Registry holds the Symphony registry keys
 * that are intended to be used as global (or default) value for all users
 * running this app.
 */
var getRegistry = function (name) {
    var promise = new Promise(function(resolve, reject) {
        if (isMac) {
            log.send(logLevels.ERROR, 'getRegistry: Registry is not supported for mac osx.');
            reject('registry is not supported for mac osx.');
            return;
        }

        //Try to get registry on HKEY_CURRENT_USER
        symphonyRegistryHKCU.get( name, function( err1, reg1 ) {
            if (!err1 && reg1 !==null && reg1.value) {
                log.send(logLevels.WARN, 'getRegistry: Cannot find ' + name + ' Registry. Using HKCU');
                resolve(reg1.value);
                return;
            }

            //Try to get registry on HKEY_LOCAL_MACHINE
            symphonyRegistryHKLM.get( name, function( err2, reg2 ) {
                if ( !err2 && reg2!==null && reg2.value) {
                    log.send(logLevels.WARN, 'getRegistry: Cannot find ' + name + ' Registry. Using HKLM');
                    resolve(reg2.value);
                    return;
                }

                // Try to get registry on HKEY_LOCAL_MACHINE in case 32bit app installed on 64bit system.
                // winreg does not merge keys as normally windows does.
                symphonyRegistryHKLM6432.get( name, function( err3, reg3 ) {
                    if ( !err3 && reg3!==null && reg3.value) {
                        resolve(reg3.value);
                    } else{
                        log.send(logLevels.ERROR, 'getRegistry: Cannot find ' + name + ' ' +
                            'Registry. Using default HKLM for 64 & 32. bit system');
                        reject('Cannot find PodUrl Registry. Using default url.');
                    }
                });
            });
        });
    });

    return promise;
}

module.exports = getRegistry
