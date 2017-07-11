'use strict';

const isDevEnv = process.env.ELECTRON_DEV ?
        process.env.ELECTRON_DEV.trim().toLowerCase() === 'true' : false;

const isMac = (process.platform === 'darwin');

const isNodeEnv = !!process.env.NODE_ENV;

module.exports = {
    isDevEnv: isDevEnv,
    isMac: isMac,
    isNodeEnv: isNodeEnv
};
