'use strict';
const log = require('../log.js');
const logLevels = require('../enums/logLevels.js');

/**
 * throttles calls to given function at most once a second.
 * @param  {number} throttleTime  minimum time between calls
 * @param  {function} func        function to invoke
 */
function throttle(throttleTime, func) {
    if (typeof throttleTime !== 'number' || throttleTime <= 0) {
        throw Error('throttle: invalid throttleTime arg, must be a number: ' + throttleTime);
    }
    if (typeof func !== 'function') {
        throw Error('throttle: invalid func arg, must be a function: ' + func);
    }
    let timer, lastInvoke = 0;
    return function() {
        let args = arguments;

        function invoke(argsToInvoke) {
            timer = null;
            lastInvoke = Date.now();
            func.apply(null, argsToInvoke);
        }

        function cancel() {
            if (timer) {
                clearTimeout(timer);
            }
        }

        let now = Date.now();
        if (now - lastInvoke < throttleTime) {
            cancel();
            timer = setTimeout(function() {
                invoke(args);
            }, lastInvoke + throttleTime - now);
        } else {
            cancel();
            invoke(args);
        }
    }
}

module.exports = throttle;
