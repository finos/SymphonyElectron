const { crashReporter } = require('electron');
const { getMultipleConfigField } = require('./config.js');

const log = require('./log.js');
const logLevels = require('./enums/logLevels.js');

/**
 * Method that returns all the required field for crash reporter
 *
 * @param extras {object}
 * @return {Promise<any>}
 */
function getCrashReporterConfig(extras) {
    return new Promise((resolve, reject) => {
        getMultipleConfigField(['url', 'crashReporter'])
            .then((configData) => {

                if (!configData && !configData.crashReporter && !configData.crashReporter.companyName) {
                    reject('company name cannot be empty');
                    return;
                }

                let crashReporterData = {
                    companyName: configData.crashReporter.companyName,
                    submitURL: configData.crashReporter.submitURL,
                    uploadToServer: configData.crashReporter.uploadToServer,
                    extra: Object.assign(
                        {podUrl: configData.url},
                        extras
                    )
                };
                resolve(crashReporterData);
            })
            .catch((err) => log.send(
                logLevels.ERROR,
                'Unable to initialize crash reporter failed to read config file. Error is ->  ' + err
            ));
    })
}

function initCrashReporterMain(extras) {
    getCrashReporterConfig(extras).then((mainCrashReporterData) => {
        try {
            crashReporter.start(mainCrashReporterData);
        } catch (err) {
            log.send(logLevels.ERROR, 'failed to start crash reporter main process. Error is ->  ' + err);
        }
    }).catch((err) => log.send(
        logLevels.ERROR,
        'Unable to initialize crash reporter for main process. Error is ->  ' + err
    ));
}


/**
 * Method to initialize crash reporter for render process
 *
 * @param browserWindow {Electron.BrowserWindow}
 * @param extras {Object}
 */
function initCrashReporterRenderer(browserWindow, extras) {
    if (browserWindow && browserWindow.webContents && !browserWindow.isDestroyed()) {
        getCrashReporterConfig(extras).then((renderCrashReporterData) => {
            browserWindow.webContents.send('register-crash-reporter', renderCrashReporterData);
        }).catch((err) => log.send(
            logLevels.ERROR,
            'Unable to initialize crash reporter for render process. Error is ->  ' + err
        ));
    }
}

module.exports = {
    initCrashReporterMain,
    initCrashReporterRenderer,
};