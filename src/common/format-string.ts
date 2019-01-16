/**
 * Formats a string with dynamic values
 * @param str {String} String to be formatted
 * @param data {Object} - Data to be added
 *
 * @example
 * StringFormat(this will log {time}`, { time: '1234' })
 *
 * result:
 * this will log 1234
 *
 * @return {*}
 */
export const formatString = (str: string, data?: object): string => {

    if (!str || !data) return str;

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