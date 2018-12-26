/**
 * Limits your function to be called at most every milliseconds
 *
 * @param func
 * @param wait
 * @example const throttled = throttle(anyFunc, 500);
 */
export const throttle = (func: (...args) => void, wait: number): (...args) => void => {
    if (wait <= 0) {
        throw Error('throttle: invalid throttleTime arg, must be a number: ' + wait);
    }

    let isCalled: boolean = false;

    return (...args) => {
        if (!isCalled) {
            func(...args);
            isCalled = true;
            setTimeout(() => isCalled = false, wait);
        }
    };
};