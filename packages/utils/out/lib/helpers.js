import { isDate, } from '@awc/utils/primitive';
import { isClass, isObject } from '@awc/utils/object';
import { isArray } from '@awc/utils/array';
import { isFunction } from '@awc/utils/functions';
/** Check if value is null */
export function isNull(v) {
    return v === null;
}
/** Check if value is undefined */
export function isUndefined(v) {
    return v === undefined;
}
export const isUndefinedOrNull = (element) => {
    if (typeof element === 'undefined' || element === null)
        return true;
    return false;
};
/** Check if value is primitive */
export function isPrimitive(v) {
    const type = typeof v;
    return (v === null ||
        type === 'string' ||
        type === 'number' ||
        type === 'boolean' ||
        type === 'symbol' ||
        type === 'bigint' ||
        type === 'undefined' ||
        isDate(v));
}
export function isDefined(obj) {
    return obj !== undefined && obj !== null;
}
export function getKind(obj) {
    if (obj === null)
        return 'null';
    if (obj === undefined)
        return 'undefined';
    if (isDate(obj))
        return 'date';
    if (isClass(obj))
        return 'class';
    if (isFunction(obj))
        return 'function';
    if (isArray(obj))
        return 'array';
    if (isPrimitive(obj))
        return 'primitive';
    if (isObject(obj))
        return 'object';
    // fallback
    return 'primitive';
}
export const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        let r = (Math.random() * 16) | 0;
        let v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};
export const generateID = () => {
    return 'xxyxxxxxxy-4xx8'.replace(/[xy]/g, function (c) {
        let r = (Math.random() * 16) | 0;
        let v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};
