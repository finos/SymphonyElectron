'use strict';

/**
 * Search given argv for argName using exact match or starts with. Comparison is case insensitive
 * @param  {Array} argv       Array of strings
 * @param  {String} argName   Arg name to search for.
 * @param  {Boolean} exactMatch  If true then look for exact match otherwise
 * try finding arg that starts with argName.
 * @return {Array}           If found, returns the arg, otherwise null.
 */
function getCmdLineArg(argv, argName, exactMatch) {
    if (!Array.isArray(argv)) {
        return null;
    }
    let argNameToFind = argName.toLocaleLowerCase();
    for (let i = 0, len = argv.length; i < len; i++) {
        let arg = argv[i].toLocaleLowerCase();
        if ((exactMatch && arg === argNameToFind) ||
            (!exactMatch && arg.startsWith(argNameToFind))) {
            return argv[i];
        }
    }

    return null;
}

module.exports = getCmdLineArg;