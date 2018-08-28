const AutoLaunch = require('auto-launch');

// Local Dependencies
const log = require('../log.js');
const logLevels = require('../enums/logLevels.js');
const { getGlobalConfigField } = require('../config.js');
const { isMac } = require('../utils/misc.js');

let symphonyAutoLauncher;

function init() {

    if (symphonyAutoLauncher) {
        return;
    }

    getGlobalConfigField('autoLaunchPath')
        .then((val) => {
            if (!val || val === "") {
                log.send(logLevels.INFO, `Custom auto launch path is empty! Resorting to default`);
                initializeAutoLauncher(process.execPath);
                return;
            }
            log.send(logLevels.INFO, `We are setting a custom auto launch path -> ${val}`);
            initializeAutoLauncher(val);
        }).catch((err) => {
            log.send(logLevels.INFO, `Error finding custom auto launch path -> ${err}. Resorting to default`);
            initializeAutoLauncher(process.execPath);
        });

    function initializeAutoLauncher(path) {
        if (isMac) {
            symphonyAutoLauncher = new AutoLaunch({
                name: 'Symphony',
                mac: {
                    useLaunchAgent: true,
                },
                path: process.execPath,
            });
        } else {
            const escapedPath = path.replace('/\\/g', '\\');
            symphonyAutoLauncher = new AutoLaunch({
                name: 'Symphony',
                path: escapedPath,
            });
        }
    }

}

function enable() {
    log.send(logLevels.INFO, `Enabling auto launch!`);
    return symphonyAutoLauncher.enable();
}

function disable () {
    log.send(logLevels.INFO, `Disabling auto launch!`);
    return symphonyAutoLauncher.disable();
}

module.exports = {
    init: init,
    enable: enable,
    disable: disable
};