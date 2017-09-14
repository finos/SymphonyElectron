'use strict';

const {crashReporter} = require('electron');

let crashReporterDetails;
let crashDirectoryPath;

/**
 * Setup the crash reporter with appropriate information
 * from the global config file
 * @param detailObj: An object to send extra parameters
 * via the crash reporter
 */
function setupCrashReporter(detailObj) {

    // App store builds cannot use crash reporter, so, exit if that's the case
    if (process.platform === 'darwin' && process.mas) {
        return
    }

    if (process.type === 'renderer' && !(process.platform === 'darwin')) {
        return;
    }

    // If the crash reporter info is empty, exit
    if (!crashReporterDetails){
        return
    }

    let crashReportInfo = crashReporterDetails;
    crashReportInfo.extra = detailObj;
    crashReporter.start(crashReportInfo);

    crashDirectoryPath = crashReporter.getCrashesDirectory();
}

function setCrashReporterDetails(crashReporterInfo) {
    crashReporterDetails = crashReporterInfo;
}

function getCrashDirectoryPath() {
    return crashDirectoryPath;
}

exports.setupCrashReporter = setupCrashReporter;
exports.setCrashReporterDetails = setCrashReporterDetails;
exports.getCrashDirectoryPath = getCrashDirectoryPath;