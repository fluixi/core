import { isObject } from './utils.js';
/**
 * Creates a deep clone of a value (object, array, primitive, or built-in types)
 *
 * This function creates a complete copy of the input value, including all nested
 * properties, without maintaining any references to the original object. It properly
 * handles various JavaScript built-in types including:
 *
 * - Primitive values (strings, numbers, booleans)
 * - Plain objects
 * - Arrays
 * - Dates
 * - RegExp
 * - Maps
 * - Sets
 * - Symbols as object keys
 *
 * @template T - The type of the value being cloned
 * @param obj - The value to clone
 * @returns A deep copy of the input value with the same type
 *
 * @example
 * // Cloning a nested object
 * const obj = { a: 1, b: { c: 2 } };
 * const clone = deepClone(obj);
 * obj.b.c = 3;
 * console.log(clone.b.c); // 2 (remains unchanged)
 *
 * @example
 * // Cloning an array with objects
 * const arr = [1, 2, { a: 3 }];
 * const cloneArr = deepClone(arr);
 * arr[2].a = 4;
 * console.log(cloneArr[2].a); // 3 (remains unchanged)
 *
 * @example
 * // Cloning built-in types
 * const date = new Date();
 * const map = new Map([['key', 'value']]);
 * const set = new Set([1, 2, 3]);
 *
 * const dateClone = deepClone(date); // independent Date instance
 * const mapClone = deepClone(map);   // independent Map instance
 * const setClone = deepClone(set);   // independent Set instance
 */
export const deepClone = (obj) => {
    // Handle primitives
    if (obj == null || typeof obj !== 'object') {
        return obj;
    }
    // Handle Date
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }
    // Handle RegExp
    if (obj instanceof RegExp) {
        return new RegExp(obj.source, obj.flags);
    }
    // Handle Map
    if (obj instanceof Map) {
        const clone = new Map();
        obj.forEach((value, key) => {
            clone.set(key, deepClone(value));
        });
        return clone;
    }
    // Handle Set
    if (obj instanceof Set) {
        const clone = new Set();
        obj.forEach((value) => {
            clone.add(deepClone(value));
        });
        return clone;
    }
    // Handle Array
    if (Array.isArray(obj)) {
        return obj.map((item) => deepClone(item));
    }
    // Handle plain object
    if (isObject(obj)) {
        const clone = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                clone[key] = deepClone(obj[key]);
            }
        }
        // Handle symbols
        const symbols = Object.getOwnPropertySymbols(obj);
        for (const symbol of symbols) {
            clone[symbol] = deepClone(obj[symbol]);
        }
        return clone;
    }
    // Fallback for other object types
    return obj;
};
