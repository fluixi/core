import { isObject } from './utils.js';
import { deepClone } from './clone.js';
/**
 * Inverts an object (swaps keys and values)
 * @param obj - Source object
 * @returns Inverted object
 * @example
 * invert({a: 1, b: 2}) // {1: 'a', 2: 'b'}
 */
export const invert = (obj, deep = false) => {
    if (Array.isArray(obj)) {
        return obj.map((item) => invert(item, deep));
    }
    if (!isObject(obj)) {
        return {};
    }
    const result = {};
    for (const key in obj) {
        let value = obj[key];
        // Only invert if value can be used as a key
        if (typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'symbol') {
            result[value] = key;
        }
        else if (isObject(value)) {
            if (deep) {
                result[key] = invert(value, deep);
            }
        }
        else if (Array.isArray(value)) {
            if (deep) {
                result[key] = value.map((item) => invert(item, deep));
            }
        }
    }
    return result;
};
/**
 * Maps object values using a callback function
 * @param obj - Source object
 * @param callback - Mapping function
 * @returns New object with mapped values
 * @example
 * mapValues({a: 1, b: 2}, (value) => value * 2) // {a: 2, b: 4}
 */
// export const mapValues = <T extends AnyObject, U>(
//   obj: T,
//   callback: (value: T[keyof T], key: keyof T) => U
// ): Record<keyof T, U> => {
//   if (Array.isArray(obj)) {
//     return (obj as any).map(callback);
//   }
//   if (!isObject(obj)) {
//     return {} as Record<keyof T, U>;
//   }
//   const result: Partial<Record<keyof T, U>> = {};
//   for (const key in obj) {
//     result[key] = callback(obj[key], key as any);
//   }
//   return result as Record<keyof T, U>;
// };
/**
 * Maps object keys using a callback function
 * @param obj - Source object
 * @param callback - Mapping function
 * @returns New object with mapped keys
 * @example
 * mapKeys({a: 1, b: 2}, (key) => key.toUpperCase()) // {A: 1, B: 2}
 */
// export const mapKeys = <T extends AnyObject>(
//   obj: T,
//   callback: (key: keyof T, value: T[keyof T]) => string
// ): AnyObject => {
//   if (Array.isArray(obj)) {
//     return (obj as any).map(callback);
//   }
//   if (!isObject(obj)) {
//     return {};
//   }
//   const result: AnyObject = {};
//   for (const key in obj) {
//     const newKey = callback(key as any, obj[key]);
//     result[newKey] = obj[key];
//   }
//   return result;
// };
/**
 * Filters object properties using a predicate
 * @param obj - Source object
 * @param predicate - Filter function
 * @returns New object with filtered properties
 * @example
 * filter({a: 1, b: 2, c: 3}, (value) => value > 1) // {b: 2, c: 3}
 */
export const filter = (obj, predicate) => {
    if (Array.isArray(obj)) {
        return obj.filter(predicate);
    }
    if (!isObject(obj)) {
        return {};
    }
    const result = {};
    for (const key in obj) {
        if (predicate(obj[key], key)) {
            result[key] = obj[key];
        }
    }
    return result;
};
/**
 * Flattens a nested object
 * @param obj - Source object
 * @param separator - Separator for nested keys (default: '.')
 * @returns Flattened object
 * @example
 * flatten({a: {b: {c: 1}}, d: 2}) // {'a.b.c': 1, d: 2}
 */
// export const flatten = (obj: AnyObject, separator: string = '.'): AnyObject => {
//   if (Array.isArray(obj)) {
//     return obj.map((item) => flatten(item, separator));
//     // return obj.reduce((acc, item) => {
//     //   return {
//     //     ...acc,
//     //     ...flatten(item, separator),
//     //   };
//     // }, {});
//   }
//   const result: AnyObject = {};
//   const flattenRecursive = (current: any, path: string = '') => {
//     if (!isObject(current) && !Array.isArray(current)) {
//       if (path) {
//         result[path] = current;
//       }
//       return;
//     }
//     if (Array.isArray(current)) {
//       for (let i = 0; i < current.length; i++) {
//         const newPath = path ? `${path}[${i}]` : `[${i}]`;
//         flattenRecursive(current[i], newPath);
//       }
//     } else {
//       for (const key in current) {
//         const newPath = path ? `${path}${separator}${key}` : key;
//         flattenRecursive(current[key], newPath);
//       }
//       // Handle symbols
//       const symbols = Object.getOwnPropertySymbols(current);
//       for (const symbol of symbols) {
//         const newPath = path
//           ? `${path}${separator}${symbol.toString()}`
//           : symbol.toString();
//         flattenRecursive(current[symbol], newPath);
//       }
//     }
//   };
//   flattenRecursive(obj);
//   return result;
// };
/**
 * Unflattens an object (reverse of flatten)
 * @param obj - Source object
 * @param separator - Separator used for nested keys (default: '.')
 * @returns Unflattened object
 * @example
 * unflatten({'a.b.c': 1, d: 2}) // {a: {b: {c: 1}}, d: 2}
 */
// export const unflatten = (
//   obj: AnyObject,
//   separator: string = '.'
// ): AnyObject => {
//   const result: AnyObject = {};
//   for (const key in obj) {
//     const keys = key.split(separator);
//     let current: any = result;
//     for (let i = 0; i < keys.length - 1; i++) {
//       const part = keys[i];
//       // Handle array indices
//       if (part.startsWith('[') && part.endsWith(']')) {
//         const index = parseInt(part.slice(1, -1), 10);
//         if (!Array.isArray(current)) {
//           current = [];
//         }
//         if (current[index] == null) {
//           current[index] = {};
//         }
//         current = current[index];
//       } else {
//         if (current[part] == null) {
//           current[part] = {};
//         }
//         current = current[part];
//       }
//     }
//     const lastKey = keys[keys.length - 1];
//     // Handle array indices
//     if (lastKey.startsWith('[') && lastKey.endsWith(']')) {
//       const index = parseInt(lastKey.slice(1, -1), 10);
//       if (!Array.isArray(current)) {
//         current = [];
//       }
//       if (index >= current.length) {
//         for (let i = current.length; i <= index; i++) {
//           current.push(undefined);
//         }
//       }
//       current[index] = obj[key];
//     } else {
//       current[lastKey] = obj[key];
//     }
//   }
//   return result;
// };
/**
 * Removes undefined or null properties from an object
 * @param obj - Source object
 * @param deep - Whether to clean recursively (default: false)
 * @returns Cleaned object
 * @example
 * clean({a: 1, b: null, c: undefined, d: {e: null}}) // {a: 1, d: {}}
 * clean({a: 1, b: null, d: {e: null}}, true) // {a: 1}
 */
export const clean = (obj, deep = false) => {
    if (!isObject(obj)) {
        return {};
    }
    const result = {};
    for (const key in obj) {
        const value = obj[key];
        if (value != null) {
            if (deep && isObject(value)) {
                const cleaned = clean(value, true);
                if (Object.keys(cleaned).length > 0) {
                    result[key] = cleaned;
                }
            }
            else {
                result[key] = value;
            }
        }
    }
    return result;
};
/**
 * Creates a new object with default values
 * @param defaults - Default values
 * @param overrides - Override values
 * @returns Merged object with defaults
 * @example
 * defaults({a: 1, b: 2}, {b: 3, c: 4}) // {a: 1, b: 3, c: 4}
 */
export const defaults = (current, overrides) => {
    if (Array.isArray(current)) {
        if (Array.isArray(overrides)) {
            return [...current, ...overrides];
        }
        return [...current, overrides];
    }
    const result = deepClone(current);
    for (const key in overrides) {
        if (result[key] === undefined) {
            result[key] = overrides[key];
        }
    }
    return result;
};
/**
 * Gets the size of an object (number of own enumerable properties)
 * @param obj - Source object
 * @returns Number of properties
 * @example
 * size({a: 1, b: 2, c: 3}) // 3
 */
export const size = (obj) => {
    if (!isObject(obj)) {
        return 0;
    }
    return Object.keys(obj).length;
};
/**
 * Creates a new object with the same keys but transformed values
 * @param obj - Source object
 * @param transformer - Transformation function
 * @returns Transformed object
 * @example
 * transform({a: 1, b: 2}, (key, value) => ({[key]: value * 2})) // {a: 2, b: 4}
 */
export const transform = (obj, transformer) => {
    if (Array.isArray(obj)) {
        return obj.map(transformer);
    }
    if (!isObject(obj)) {
        return {};
    }
    const result = {};
    for (const key in obj) {
        const [newKey, newValue] = transformer(key, obj[key]);
        result[newKey] = newValue;
    }
    return result;
};
/**
 * Groups an array of objects by a key
 * @param array - Array of objects
 * @param key - Key to group by
 * @returns Grouped object
 * @example
 * groupBy([{type: 'a', value: 1}, {type: 'b', value: 2}, {type: 'a', value: 3}], 'type')
 * // {a: [{type: 'a', value: 1}, {type: 'a', value: 3}], b: [{type: 'b', value: 2}]}
 */
export const groupBy = (array, key) => {
    if (!Array.isArray(array)) {
        return {};
    }
    return array.reduce((groups, item) => {
        const groupKey = item[key];
        if (groupKey == null) {
            return groups;
        }
        const keyStr = String(groupKey);
        if (!groups[keyStr]) {
            groups[keyStr] = [];
        }
        groups[keyStr].push(item);
        return groups;
    }, {});
};
/**
 * Converts an object to a query string
 * @param obj - Source object
 * @returns Query string
 * @example
 * toQueryString({a: 1, b: 'test', c: [1, 2, 3]}) // 'a=1&b=test&c=1&c=2&c=3'
 */
export const toQueryString = (obj) => {
    if (!isObject(obj)) {
        return '';
    }
    const params = [];
    const addParam = (key, value) => {
        if (value == null)
            return;
        if (Array.isArray(value)) {
            value.forEach((item) => {
                params.push(`${encodeURIComponent(key)}=${encodeURIComponent(item)}`);
            });
        }
        else {
            params.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
        }
    };
    for (const key in obj) {
        addParam(key, obj[key]);
    }
    return params.join('&');
};
/**
 * Parses a query string to an object
 * @param queryString - Query string
 * @returns Parsed object
 * @example
 * fromQueryString('a=1&b=test&c=1&c=2&c=3') // {a: '1', b: 'test', c: ['1', '2', '3']}
 */
export const fromQueryString = (queryString) => {
    if (!queryString || typeof queryString !== 'string') {
        return {};
    }
    // Remove leading ?
    const str = queryString.startsWith('?') ? queryString.slice(1) : queryString;
    if (!str) {
        return {};
    }
    const result = {};
    const pairs = str.split('&');
    for (const pair of pairs) {
        const [key, value] = pair.split('=').map(decodeURIComponent);
        if (key) {
            if (key in result) {
                // Handle duplicate keys as arrays
                if (Array.isArray(result[key])) {
                    result[key].push(value || '');
                }
                else {
                    result[key] = [result[key], value || ''];
                }
            }
            else {
                result[key] = value || '';
            }
        }
    }
    return result;
};
/**
 * Creates a frozen deep clone of an object
 * @param obj - Source object
 * @returns Deep frozen object
 * @example
 * const frozen = deepFreeze({a: {b: 1}})
 * frozen.a.b = 2 // Error in strict mode
 */
export const deepFreeze = (obj) => {
    if (obj == null || typeof obj !== 'object') {
        return obj;
    }
    // Freeze the object itself
    Object.freeze(obj);
    // Recursively freeze all properties
    for (const key in obj) {
        const value = obj[key];
        if (value != null && typeof value === 'object') {
            deepFreeze(value);
        }
    }
    // Freeze symbols
    const symbols = Object.getOwnPropertySymbols(obj);
    for (const symbol of symbols) {
        const value = obj[symbol];
        if (value != null && typeof value === 'object') {
            deepFreeze(value);
        }
    }
    return obj;
};
/**
 * Type guard for non-null object
 * @param value - Value to check
 * @returns True if value is a non-null object
 */
export const isNonNullObject = (value) => {
    return value != null && typeof value === 'object' && !Array.isArray(value);
};
