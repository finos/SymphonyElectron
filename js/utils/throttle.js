'use strict';

/**
 * throttles calls to given function at most once a second.
 * @param  {number} throttleTime  minimum time between calls
 * @param  {function} func        function to invoke
 */
function throttle(throttleTime, func) {
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
                window.clearTimeout(timer);
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
