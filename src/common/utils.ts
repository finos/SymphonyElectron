// regex match the semver (semantic version) this checks for the pattern X.Y.Z
// ex-valid  v1.2.0, 1.2.0, 2.3.4-r51
const semver = /^v?(?:\d+)(\.(?:[x*]|\d+)(\.(?:[x*]|\d+)(?:-[\da-z-]+(?:\.[\da-z-]+)*)?(?:\+[\da-z-]+(?:\.[\da-z-]+)*)?)?)?$/i;
const patch = /-([0-9A-Za-z-.]+)/;

/**
 * Splits the versions
 * into major, minor and patch
 * @param v
 * @returns {String[]}
 */
const split = (v: string): string[] => {
    const temp = v.replace(/^v/, '').split('.');
    const arr = temp.splice(0, 2);
    arr.push(temp.join('.'));
    return arr;
};

/**
 * This function tries to parse the version string
 * @param v Version string
 */
const tryParse = (v: string): string | number => {
    return Number.isNaN(Number(v)) ? v : Number(v);
};

/**
 * Validates the version
 * with the semver regex and returns
 * -1 if not valid else 1
 * @param version
 * @returns {number}
 */
const validate = (version: string): number => {
    if (!semver.test(version)) {
        return -1;
    }
    return 1;
};

/**
 * Compares the v1 version with the v2 version
 * for all major, minor, patch
 * if v1 > v2 returns 1
 * if v1 < v2 returns -1
 * if v1 = v2 returns 0
 * @param v1
 * @param v2
 * @returns {number}
 */
export const compareVersions = (v1: string, v2: string): number => {
    if (validate(v1) === -1 || validate(v2) === -1) {
        return -1;
    }

    const s1 = split(v1);
    const s2 = split(v2);

    for (let i = 0; i < 3; i++) {
        const n1 = parseInt(s1[i] || '0', 10);
        const n2 = parseInt(s2[i] || '0', 10);

        if (n1 > n2) {
            return 1;
        }
        if (n2 > n1) {
            return -1;
        }
    }

    if ([s1[2], s2[2]].every(patch.test.bind(patch))) {
        // @ts-ignore
        const p1 = patch.exec(s1[2])[1].split('.').map(tryParse);
        // @ts-ignore
        const p2 = patch.exec(s2[2])[1].split('.').map(tryParse);

        for (let k = 0; k < Math.max(p1.length, p2.length); k++) {
            if (p1[k] === undefined || typeof p2[k] === 'string' && typeof p1[k] === 'number') {
                return -1;
            }
            if (p2[k] === undefined || typeof p1[k] === 'string' && typeof p2[k] === 'number') {
                return 1;
            }

            if (p1[k] > p2[k]) {
                return 1;
            }
            if (p2[k] > p1[k]) {
                return -1;
            }
        }
    } else if ([s1[2], s2[2]].some(patch.test.bind(patch))) {
        return patch.test(s1[2]) ? -1 : 1;
    }

    return 0;
};

/**
 * Search given argv for argName using exact match or starts with. Comparison is case insensitive
 * @param  {Array} argv       Array of strings
 * @param  {String} argName   Arg name to search for.
 * @param  {Boolean} exactMatch  If true then look for exact match otherwise
 * try finding arg that starts with argName.
 * @return {String}           If found, returns the arg, otherwise null.
 */
export const getCommandLineArgs = (argv: string[], argName: string, exactMatch: boolean): string | null => {
    if (!Array.isArray(argv)) {
        throw new Error(`get-command-line-args: TypeError invalid func arg, must be an array: ${argv}`);
    }

    const argNameToFind = argName.toLocaleLowerCase();

    for (let i = 0, len = argv.length; i < len; i++) {
        const arg = argv[i].toLocaleLowerCase();
        if ((exactMatch && arg === argNameToFind) ||
            (!exactMatch && arg.startsWith(argNameToFind))) {
            return argv[i];
        }
    }

    return null;
};

/**
 * Generates a guid,
 * http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
 *
 * @return {String} guid value in string
 */
export const getGuid = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,
        (c) => {
            const r = Math.random() * 16 | 0; // tslint:disable-line:no-bitwise
            const v = c === 'x' ? r : (r & 0x3 | 0x8); // tslint:disable-line:no-bitwise
            return v.toString(16);
        });
};

/**
 * Picks a filtered list of values
 * in a given object based on fields
 * @param object Object to be filtered
 * @param fields Fields to be picked
 */
export const pick = (object: object, fields: string[]) => {
    const obj = {};
    for (const field of fields) {
        if (object[field]) {
            obj[field] = object[field];
        }
    }
    return obj;
};

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

/**
 * Formats a string with dynamic values
 * @param str {String} String to be formatted
 * @param data {Object} - Data to be added
 *
 * @example
 * StringFormat('this will log {time}', [{ time: '1234' }])
 *
 * result:
 * this will log 1234
 *
 * @return {*}
 */
export const formatString = (str: string, data?: object): string => {

    if (!str || !data) {
        return str;
    }

    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            return str.replace(/({([^}]+)})/g,  (i) => {
                const replacedKey = i.replace(/{/, '').replace(/}/, '');
                if (!data[key] || !data[key][replacedKey]) {
                    return i;
                }
                return data[key][replacedKey];
            });
        }
    }
    return str;
};
