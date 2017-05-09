'use strict';

const {crashReporter} = require('electron');

/**
 * Setup the crash reporter with appropriate information
 * @param detailObj: An object to send extra parameters
 * via the crash reporter
 */
function setupCrashReporter(detailObj, crashInfo) {
    let crashReportInfo = {
        companyName: crashInfo.companyName,
        submitURL: crashInfo.submitURL,
        autoSubmit: crashInfo.autoSubmit,
        uploadToServer: crashInfo.sendCrashReports,
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