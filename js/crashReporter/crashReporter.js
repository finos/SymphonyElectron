'use strict';
const {crashReporter} = require('electron');

function setup(detailObj) {

    // App store builds cannot use crash reporter, so, return if that's the case
    if (process.platform === 'darwin' && process.mas) {
        return
    }

    // If it is not darwin, exit
    if (process.type === 'renderer' && !(process.platform === 'darwin')) {
        return;
    }

    let crashReport = {
        productName: 'Symphony',
        companyName: 'Symphony Communication',
        submitURL: 'http://192.168.0.120:1127/post',
        autoSubmit: true,
        extra: detailObj
    };

    crashReporter.start(crashReport);

}

exports.setup = setup;