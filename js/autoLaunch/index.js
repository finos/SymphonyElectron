const AutoLaunch = require('auto-launch');

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
        return this.enable();
    }

    /**
     * Disable auto launch
     * @return {Promise<void>}
     */
    disableAutoLaunch() {
        log.send(logLevels.INFO, `Disabling auto launch!`);
        return this.disable();
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