'use strict';

const {crashReporter} = require('electron');

/**
 * Setup the crash reporter with appropriate information
 * @param detailObj: An object to send extra parameters
 * via the crash reporter
 */
function setupCrashReporter(detailObj) {

    // App store builds cannot use crash reporter, so, return if that's the case
    if (process.platform === 'darwin' && process.mas) {
        return
    }

    if (process.type === 'renderer' && !(process.platform === 'darwin')) {
        return;
    }

    let crashReport = {
        companyName: 'Symphony Communication',
        submitURL: 'http://localhost:1127/post',
        autoSubmit: true,
        uploadToServer: true,
        extra: detailObj
    };

    crashReporter.start(crashReport);

}

exports.setupCrashReporter = setupCrashReporter;