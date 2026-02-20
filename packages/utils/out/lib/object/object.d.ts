import type { AnyObject, DeepReadonly, RecordObject } from './types.js';
/**
 * Inverts an object (swaps keys and values)
 * @param obj - Source object
 * @returns Inverted object
 * @example
 * invert({a: 1, b: 2}) // {1: 'a', 2: 'b'}
 */
export declare const invert: (obj: AnyObject, deep?: boolean) => AnyObject;
/**
 * Maps object values using a callback function
 * @param obj - Source object
 * @param callback - Mapping function
 * @returns New object with mapped values
 * @example
 * mapValues({a: 1, b: 2}, (value) => value * 2) // {a: 2, b: 4}
 */
/**
 * Maps object keys using a callback function
 * @param obj - Source object
 * @param callback - Mapping function
 * @returns New object with mapped keys
 * @example
 * mapKeys({a: 1, b: 2}, (key) => key.toUpperCase()) // {A: 1, B: 2}
 */
/**
 * Filters object properties using a predicate
 * @param obj - Source object
 * @param predicate - Filter function
 * @returns New object with filtered properties
 * @example
 * filter({a: 1, b: 2, c: 3}, (value) => value > 1) // {b: 2, c: 3}
 */
export declare const filter: <T extends AnyObject>(obj: T, predicate: (value: T[keyof T], key: keyof T) => boolean) => T extends RecordObject ? Partial<T> : Partial<T>[];
/**
 * Flattens a nested object
 * @param obj - Source object
 * @param separator - Separator for nested keys (default: '.')
 * @returns Flattened object
 * @example
 * flatten({a: {b: {c: 1}}, d: 2}) // {'a.b.c': 1, d: 2}
 */
/**
 * Unflattens an object (reverse of flatten)
 * @param obj - Source object
 * @param separator - Separator used for nested keys (default: '.')
 * @returns Unflattened object
 * @example
 * unflatten({'a.b.c': 1, d: 2}) // {a: {b: {c: 1}}, d: 2}
 */
/**
 * Removes undefined or null properties from an object
 * @param obj - Source object
 * @param deep - Whether to clean recursively (default: false)
 * @returns Cleaned object
 * @example
 * clean({a: 1, b: null, c: undefined, d: {e: null}}) // {a: 1, d: {}}
 * clean({a: 1, b: null, d: {e: null}}, true) // {a: 1}
 */
export declare const clean: <T extends AnyObject>(obj: T, deep?: boolean) => Partial<T>;
/**
 * Creates a new object with default values
 * @param defaults - Default values
 * @param overrides - Override values
 * @returns Merged object with defaults
 * @example
 * defaults({a: 1, b: 2}, {b: 3, c: 4}) // {a: 1, b: 3, c: 4}
 */
export declare const defaults: <T extends AnyObject, U extends AnyObject>(current: T, overrides: U) => T & U;
/**
 * Gets the size of an object (number of own enumerable properties)
 * @param obj - Source object
 * @returns Number of properties
 * @example
 * size({a: 1, b: 2, c: 3}) // 3
 */
export declare const size: (obj: AnyObject) => number;
/**
 * Creates a new object with the same keys but transformed values
 * @param obj - Source object
 * @param transformer - Transformation function
 * @returns Transformed object
 * @example
 * transform({a: 1, b: 2}, (key, value) => ({[key]: value * 2})) // {a: 2, b: 4}
 */
export declare const transform: <T extends AnyObject>(obj: T, transformer: (key: keyof T, value: T[keyof T]) => [string, any]) => AnyObject;
/**
 * Groups an array of objects by a key
 * @param array - Array of objects
 * @param key - Key to group by
 * @returns Grouped object
 * @example
 * groupBy([{type: 'a', value: 1}, {type: 'b', value: 2}, {type: 'a', value: 3}], 'type')
 * // {a: [{type: 'a', value: 1}, {type: 'a', value: 3}], b: [{type: 'b', value: 2}]}
 */
export declare const groupBy: <T extends AnyObject>(array: T[], key: keyof T) => Record<string | number, T[]>;
/**
 * Converts an object to a query string
 * @param obj - Source object
 * @returns Query string
 * @example
 * toQueryString({a: 1, b: 'test', c: [1, 2, 3]}) // 'a=1&b=test&c=1&c=2&c=3'
 */
export declare const toQueryString: (obj: AnyObject) => string;
/**
 * Parses a query string to an object
 * @param queryString - Query string
 * @returns Parsed object
 * @example
 * fromQueryString('a=1&b=test&c=1&c=2&c=3') // {a: '1', b: 'test', c: ['1', '2', '3']}
 */
export declare const fromQueryString: (queryString: string) => AnyObject;
/**
 * Creates a frozen deep clone of an object
 * @param obj - Source object
 * @returns Deep frozen object
 * @example
 * const frozen = deepFreeze({a: {b: 1}})
 * frozen.a.b = 2 // Error in strict mode
 */
export declare const deepFreeze: <T>(obj: T) => DeepReadonly<T>;
/**
 * Type guard for non-null object
 * @param value - Value to check
 * @returns True if value is a non-null object
 */
export declare const isNonNullObject: (value: unknown) => value is AnyObject;
//# sourceMappingURL=object.d.ts.map