/**
 * Generates a guid,
 * http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
 *
 * @return {String} guid value in string
 */
export default function getGuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,
        (c) => {
            const r = Math.random() * 16 | 0; // tslint:disable-line:no-bitwise
            const v = c === 'x' ? r : (r & 0x3 | 0x8); // tslint:disable-line:no-bitwise
            return v.toString(16);
        });
}