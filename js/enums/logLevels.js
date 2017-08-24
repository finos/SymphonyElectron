'use strict';

let keyMirror = require('keymirror');

/**
 * The different log levels
 * @type {Object}
 */
module.exports = keyMirror({
    ERROR: null,
    CONFLICT: null,
    WARN: null,
    ACTION: null,
    INFO: null,
    DEBUG: null
});
