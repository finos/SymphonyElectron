/**
 * Injects content into string
 * @param str {String}
 * @param data {Object} - content to replace
 *
 * @example
 * StringFormat(this will log {time}`, { time: '1234' })
 *
 * result:
 * this will log 1234
 *
 * @return {*}
 */
export default function StringFormat(str: string, data?: object): string {

    if (!str || !data) return str;

    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            return str.replace(/({([^}]+)})/g,  (i) => {
                const replacedKey = i.replace(/{/, '').replace(/}/, '');
                if (!data[replacedKey]) {
                    return i;
                }
                return data[replacedKey];
            });
        }
    }
    return str;
}