'use strict';

const windowMgr = require('./windowMgr.js');
const { getConfigField } = require('./config.js');
const log = require('./log.js');
const logLevels = require('./enums/logLevels.js');

/**
 * Method that checks if user has enabled the bring to front feature
 * if so then activates the main window
 * @param windowName - Name of the window to activate
 */
function bringToFront(windowName) {

    getConfigField('bringToFront')
        .then((bringToFrontSetting) => {
            if (typeof bringToFrontSetting === 'boolean' && bringToFrontSetting) {
                log.send(logLevels.INFO, 'Window has been activated for: bringToFront');
                windowMgr.activate(windowName || 'main');
            }
        })
        .catch((error) => {
            log.send(logLevels.ERROR, 'Could not read bringToFront field from config error= ' + error);
        });
}


module.exports = {
    bringToFront: bringToFront
};