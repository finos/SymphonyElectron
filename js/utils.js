'use strict';

const isDevEnv = process.env.ELECTRON_DEV ?
        process.env.ELECTRON_DEV.trim().toLowerCase() === "true" : false;

const isMac = (process.platform === 'darwin');

/**
 * Generates a guid,
 * http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
 * 
 * @return {String} guid value in string
 */
function getGuid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16)
        .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

module.exports = {
    isDevEnv: isDevEnv,
    isMac: isMac,
    getGuid: getGuid
};
