'use strict';

const windowMgr = require('./windowMgr.js');
const { getConfigField } = require('./config.js');
const log = require('./log.js');
const logLevels = require('./enums/logLevels.js');

/**
 * Method that checks if user has enabled the bring to front feature
 * if so then activates the main window
 * @param {String} windowName - Name of the window to activate
 * @param {String} reason - The reason for which the window is to be activated
 */
function bringToFront(windowName, reason) {

    getConfigField('bringToFront')
        .then((bringToFrontSetting) => {
            if (typeof bringToFrontSetting === 'boolean' && bringToFrontSetting) {
                log.send(logLevels.INFO, 'Window has been activated for: ' + reason);
                windowMgr.activate(windowName || 'main', false);
            }
        })
        .catch((error) => {
            log.send(logLevels.ERROR, 'Could not read bringToFront field from config error= ' + error);
        });
}


module.exports = {
    bringToFront: bringToFront
};