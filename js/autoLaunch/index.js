const AutoLaunch = require('auto-launch');
const {Key, windef} = require('windows-registry');

// Local Dependencies
const log = require('../log.js');
const logLevels = require('../enums/logLevels.js');
const { readConfigFileSync } = require('../config.js');
const { isMac } = require('../utils/misc.js');

const globalConfigData = readConfigFileSync();
const props = isMac ? {
    name: 'Symphony',
    mac: {
        useLaunchAgent: true,
    },
    path: process.execPath,
} : {
    name: 'Symphony',
    path: getAutoLaunchPath() || process.execPath,
};

class AutoLaunchController extends AutoLaunch {

    constructor(opts) {
        super(opts);
    }

    /**
     * Enable auto launch
     * @return {Promise<void>}
     */
    enableAutoLaunch() {
        log.send(logLevels.INFO, `Enabling auto launch!`);
        if (isMac) {
            return this.enable();
        }
        return new Promise((resolve, reject) => {
            const key = new Key(windef.HKEY.HKEY_CURRENT_USER, '', windef.KEY_ACCESS.KEY_ALL_ACCESS);
            try {
                const subKey = key.openSubKey('Software\\Microsoft\\Windows\\CurrentVersion\\Run', windef.KEY_ACCESS.KEY_ALL_ACCESS);
                subKey.setValue(props.name, windef.REG_VALUE_TYPE.REG_SZ, props.path);
                resolve();
            } catch (e) {
                reject(e);
            }
        })
    }

    /**
     * Disable auto launch
     * @return {Promise<void>}
     */
    disableAutoLaunch() {
        log.send(logLevels.INFO, `Disabling auto launch!`);
        if (isMac) {
            return this.disable();
        }
        return new Promise((resolve, reject) => {
            const key = new Key(windef.HKEY.HKEY_CURRENT_USER, '', windef.KEY_ACCESS.KEY_ALL_ACCESS);
            const subKey = key.openSubKey('Software\\Microsoft\\Windows\\CurrentVersion\\Run', windef.KEY_ACCESS.KEY_ALL_ACCESS);
            try {
                subKey.deleteValue(props.name);
                resolve();
            } catch (e) {
                reject(e);
            }
        });
    }
}

/**
 * Replace forward slash in the path to backward slash
 * @return {any}
 */
function getAutoLaunchPath() {
    const autoLaunchPath = globalConfigData && globalConfigData.autoLaunchPath || null;
    return autoLaunchPath ? autoLaunchPath.replace(/\//g, '\\') : null;
}

const autoLaunchInstance = new AutoLaunchController(props);

module.exports = {
    enable: autoLaunchInstance.enableAutoLaunch.bind(autoLaunchInstance),
    disable: autoLaunchInstance.disableAutoLaunch.bind(autoLaunchInstance)
};