'use strict';

const log = require('../log.js');
const logLevels = require('../enums/logLevels.js');

/**
 * Search given argv for argName using exact match or starts with.
 * @param  {Array} argv       Array of strings
 * @param  {String} argName   Arg name to search for.
 * @param  {Boolean} exactMatch  If true then look for exact match otherwise
 * try finding arg that starts with argName.
 * @return {String}           If found, returns the arg, otherwise null.
 */
function getCmdLineArg(argv, argName, exactMatch) {
    if (!Array.isArray(argv)) {
        log.send(logLevels.WARN, 'getCmdLineArg: TypeError invalid func arg, must be an array: '+ argv);
        return null;
    }

    for (let i = 0, len = argv.length; i < len; i++) {
        if ((exactMatch && argv[i] === argName) ||
            (!exactMatch && argv[i].startsWith(argName))) {
            return argv[i];
        }
    }

    return null;
}

module.exports = getCmdLineArg;
