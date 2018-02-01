'use strict';
const os = require('os');

const isDevEnv = process.env.ELECTRON_DEV ?
        process.env.ELECTRON_DEV.trim().toLowerCase() === 'true' : false;

const isMac = (process.platform === 'darwin');
const isWindowsOS = (process.platform === 'win32');

const isNodeEnv = !!process.env.NODE_ENV;

function isWindows10() {
    const release = os.release();
    const versionMatcher = /(\d{1,2})\.(\d{1,2})\.(\d{1,6})/;
    const result = release.match(versionMatcher);

    if (isWindowsOS) {
        return result && result[1] ? parseInt(result[1], 10) >= 10 : false
    }

    return false;
}

module.exports = {
    isDevEnv: isDevEnv,
    isMac: isMac,
    isWindowsOS: isWindowsOS,
    isNodeEnv: isNodeEnv,
    isWindows10: isWindows10
};
