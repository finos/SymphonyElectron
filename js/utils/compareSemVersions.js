// regex match the semver (semantic version) this checks for the pattern X.Y.Z
// ex-valid  v1.2.0, 1.2.0, 2.3.4-r51
const semver = /^v?(?:\d+)(\.(?:[x*]|\d+)(\.(?:[x*]|\d+)(?:-[\da-z-]+(?:\.[\da-z-]+)*)?(?:\+[\da-z-]+(?:\.[\da-z-]+)*)?)?)?$/i;
const patch = /-([0-9A-Za-z-.]+)/;

/**
 * This function splits the versions
 * into major, minor and patch
 * @param v
 * @returns {T[]}
 */
function split(v) {
    const temp = v.replace(/^v/, '').split('.');
    const arr = temp.splice(0, 2);
    arr.push(temp.join('.'));
    return arr;
}

function tryParse(v) {
    return Number.isNaN(Number(v)) ? v : Number(v);
}

/**
 * This validates the version
 * with the semver regex and returns
 * -1 if not valid else 1
 * @param version
 * @returns {number}
 */
function validate(version) {
    if (typeof version !== 'string') {
        return -1;
    }
    if (!semver.test(version)) {
        return -1;
    }
    return 1;
}

/**
 * This function compares the v1 version
 * with the v2 version for all major, minor, patch
 * if v1 > v2 returns 1
 * if v1 < v2 returns -1
 * if v1 = v2 returns 0
 * @param v1
 * @param v2
 * @returns {number}
 */
function check(v1, v2) {
    if (validate(v1) === -1 || validate(v2) === -1) {
        return -1;
    }

    const s1 = split(v1);
    const s2 = split(v2);

    for (let i = 0; i < 3; i++) {
        const n1 = parseInt(s1[i] || '0', 10);
        const n2 = parseInt(s2[i] || '0', 10);

        if (n1 > n2) return 1;
        if (n2 > n1) return -1;
    }

    if ([ s1[2], s2[2] ].every(patch.test.bind(patch))) {
        const p1 = patch.exec(s1[2])[1].split('.').map(tryParse);
        const p2 = patch.exec(s2[2])[1].split('.').map(tryParse);

        for (let k = 0; k < Math.max(p1.length, p2.length); k++) {
            if (p1[k] === undefined || typeof p2[k] === 'string' && typeof p1[k] === 'number') return -1;
            if (p2[k] === undefined || typeof p1[k] === 'string' && typeof p2[k] === 'number') return 1;

            if (p1[k] > p2[k]) return 1;
            if (p2[k] > p1[k]) return -1;
        }
    } else if ([ s1[2], s2[2] ].some(patch.test.bind(patch))) {
        return patch.test(s1[2]) ? -1 : 1;
    }

    return 0;
}

module.exports = {
    check
};
