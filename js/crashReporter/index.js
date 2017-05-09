'use strict';

const {crashReporter} = require('electron');

/**
 * Setup the crash reporter with appropriate information
 * @param sendCrashReports: An object to get crash information
 * from the global config file
 * @param detailObj: An object to send extra parameters
 * via the crash reporter
 */
function setupCrashReporter(detailObj, sendCrashReports) {
    // Will eventually have to fetch all these from the config file. Hardcoding is bad!
    let crashReportInfo = {
        companyName: "Symphony Communication Services, LLC",
        submitURL: "http://crash.symphony.com",
        autoSubmit: true,
        uploadToServer: sendCrashReports,
        extra: detailObj
    }

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