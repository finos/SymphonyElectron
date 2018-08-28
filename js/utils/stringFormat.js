/**
 * Injects content into string
 * @param string {String}
 * @param data {Object} - content to replace
 * @return {*}
 */
function stringFormat(string, data) {
    for (let key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            return string.replace(/({([^}]+)})/g, function (i) {
                let replacedKey = i.replace(/{/, '').replace(/}/, '');
                if (!data[replacedKey]) {
                    return i;
                }
                return data[replacedKey];
            });
        }
    }
    return null;
}

module.exports = stringFormat;