'use strict';

const windowMgr = require('../windowMgr.js');
const { getConfigField } = require('../config.js');
const log = require('../log.js');
const logLevels = require('../enums/logLevels.js');

/**
 * Method that checks if user has enabled the bring to front feature
 * if so then activates the main window
 */
function bringToFront() {

    getConfigField('bringToFront')
        .then((bool) => {
            if (bool) {
                windowMgr.activate('main');
            }
        })
        .catch((error) => {
            log.send(logLevels.ERROR, 'Could not read bringToFront field from config error= ' + error);
        });
}


module.exports = {
    bringToFront: bringToFront
};