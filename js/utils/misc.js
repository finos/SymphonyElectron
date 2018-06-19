'use strict';
const os = require('os');

const isDevEnv = process.env.ELECTRON_DEV ?
        process.env.ELECTRON_DEV.trim().toLowerCase() === 'true' : false;

const isMac = (process.platform === 'darwin');
const isWindowsOS = (process.platform === 'win32');

const isNodeEnv = !!process.env.NODE_ENV;
const isQAEnv = !!process.env.ELECTRON_QA;

function isWindows10() {
    const [ major ] = os.release().split('.').map((part) => parseInt(part, 10));
    return isWindowsOS && major >= 10;
}

module.exports = {
    isDevEnv: isDevEnv,
    isMac: isMac,
    isWindowsOS: isWindowsOS,
    isNodeEnv: isNodeEnv,
    isWindows10: isWindows10,
    isQAEnv: isQAEnv
};
