export const toArrayString = (value) => {
    if (Array.isArray(value)) {
        return value;
    }
    else if (typeof value === 'string') {
        if (value.startsWith('[') && value.endsWith(']')) {
            try {
                return JSON.parse(value);
            }
            catch (err) {
                return [];
            }
        }
        else {
            return [value];
        }
    }
    return [];
};
export function isArrayOfString(value) {
    return (Array.isArray(value) && value.every((item) => typeof item === 'string'));
}
export function isArrayOfNumber(value) {
    return (Array.isArray(value) && value.every((item) => typeof item === 'number'));
}
export function isArrayOfBoolean(value) {
    return (Array.isArray(value) && value.every((item) => typeof item === 'boolean'));
}
export function isArrayOfObject(value) {
    return (Array.isArray(value) && value.every((item) => typeof item === 'object'));
}
