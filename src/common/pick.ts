export default function pick(object: object, fields: string[]) {
    const obj = {};
    for (const field of fields) {
        if (object[field]) {
            obj[field] = object[field];
        }
    }
    return obj;
}