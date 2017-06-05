'use strict';

const electron = require('electron');
const {crashReporter} = require('electron');
const {app} = process.type === 'browser' ? electron : electron.remote;

/**
 * Setup the crash reporter with appropriate information
 * @param crashReporterDetails: An object to get crash information
 * from the global config file
 * @param detailObj: An object to send extra parameters
 * via the crash reporter
 */
function setupCrashReporter(detailObj, crashReporterDetails) {

    // Fetch details from config file
    if (!crashReporterDetails){
        return
    }

    let crashReportInfo = {
        companyName: app.getName(),
        submitURL: crashReporterDetails.backendURL,
        autoSubmit: crashReporterDetails.autoSubmit,
        uploadToServer: crashReporterDetails.sendCrashReports,
        extra: detailObj
    };

    // App store builds cannot use crash reporter, so, return if that's the case
    if (process.platform === 'darwin' && process.mas) {
        return
    }

    if (process.type === 'renderer' && !(process.platform === 'darwin')) {
        return;
    }

    crashReporter.start(crashReportInfo);
}

exports.setupCrashReporter = setupCrashReporter;