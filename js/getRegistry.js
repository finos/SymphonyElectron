'use strict';

const symphonyRegistry = '\\Software\\Symphony\\Symphony\\';

var Registry = require('winreg')
, symphonyRegistryHKCU = new Registry({
    hive: Registry.HKCU,
    key:  symphonyRegistry
})

, symphonyRegistryHKLM = new Registry({
    key:  symphonyRegistry
})

, symphonyRegistryHKLM6432 = new Registry({
    key:  symphonyRegistry.replace("\\Software","\\Software\\WOW6432Node")
});    
    
/**
 * reads Windows Registry key. This Registry holds the Symphony registry keys 
 * that are intended to be used as global (or default) value for all users 
 * running this app.
 *
 * @return {Object} Windows registry key
 */
function getRegistry(name) {
    return new Promise(function(resolve, reject) {

        //Try to get registry on HKEY_CURRENT_USER    
        symphonyRegistryHKCU.get( name, function( err1, reg1 ) {
            if ( !err1 && reg1!=null && reg1.value) {
                resolve(reg1.value);
            } else{
                //Try to get registry on HKEY_LOCAL_MACHINE                    
                symphonyRegistryHKLM.get( name, function( err2, reg2 ) {
                    if ( !err2 && reg2!=null && reg2.value) {
                        resolve(reg2.value);
                    } else{
                        //Try to get registry on HKEY_LOCAL_MACHINE in case 32bit app installed on 64bit system.
                        //winreg does not merge keys as normally windows does.
                        symphonyRegistryHKLM6432.get( name, function( err3, reg3 ) {
                            if ( !err3 && reg3!=null && reg3.value) {
                                resolve(reg3.value);
                            } else{
                                reject();
                            }
                        });
                    }
                });
            }
        });
    });
}

module.exports = getRegistry
