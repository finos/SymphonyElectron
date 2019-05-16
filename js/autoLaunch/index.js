const { app } = require('electron');
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

/**
 * @deprecated - removes old Symphony launch agent if exists
 */
if (isMac) {
    const autoLaunch = new AutoLaunch(props);
    autoLaunch.disable()
        .then(() => log.send(logLevels.INFO, `Old Symphony launch agent successfully removed`))
        .catch((e) => log.send(logLevels.ERROR, `Old Symphony launch agent failed to remove error: ${e}`));
}


/**
 * Replace forward slash in the path to backward slash
 * @return {any}
 */
function getAutoLaunchPath() {
    const autoLaunchPath = globalConfigData && globalConfigData.autoLaunchPath || null;
    return autoLaunchPath ? autoLaunchPath.replace(/\//g, '\\') : null;
}

/**
 * Handle auto launch setting
 * @param enabled Is auto launch enabled
 */
function handleAutoLaunch(enabled) {
    app.setLoginItemSettings({openAtLogin: enabled, path: props.path});
}

/**
 * Enable auto launch
 */
function enableAutoLaunch() {
    log.send(logLevels.INFO, `Enabling auto launch!`);
    handleAutoLaunch(true);
}

/**
 * Disable auto launch
 */
function disableAutoLaunch() {
    log.send(logLevels.INFO, `Disabling auto launch!`);
    handleAutoLaunch(false);
}

module.exports = {
    enable: enableAutoLaunch,
    disable: disableAutoLaunch
};
