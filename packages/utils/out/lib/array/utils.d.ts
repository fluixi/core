import { type AnyObject } from '@awc/utils/object';
/**
 * Type guard to check if a value is an object array
 * @param value - Value to check
 * @returns True if value is an object array
 */
export declare const isObjectArray: (value: any) => value is AnyObject[];
/**
 * Type guard to check if a value is an array
 * @param v - Value to check
 * @returns True if value is an array
 */
export declare function isArray<T = any>(v: unknown): v is T[];
/**
 * Type guard to check if a value is a static array
 * @param v - Value to check
 * @returns True if value is a static array
 */
export declare function isStaticArray<T = any, U = any>(v: unknown): v is [T, U];
/**
 * Type guard to check if a value is an array of 2-item tuples: [T, U][]
 * @param v - Value to check
 * @returns True if value is an array of 2-item tuples
 */
export declare function isDoubleArray<T = any, U = any>(v: unknown): v is [T, U][];
/**
 * Type guard to check if a value is iterable
 * @param v - Value to check
 * @returns True if value is iterable
 */
export declare function isIterable(v: unknown): v is Iterable<unknown>;
/**
 * Type guard to check if a value is array-like
 * @param v - Value to check
 * @returns True if value is array-like
 */
export declare function isArrayLike(v: unknown): v is ArrayLike<unknown>;
/**
 * Type guard to check if an array is empty
 * @param v - Array to check
 * @returns True if array is empty
 */
export declare function isEmptyArray<T>(v: T[]): boolean;
/**
 * Type guard to check if a value is a non-empty array
 * @param v - Value to check
 * @returns True if value is a non-empty array
 */
export declare function isNonEmptyArray<T>(v: unknown): v is [T, ...T[]];
/**
 * Type guard to check if a value is a typed array
 * @param v - Value to check
 * @returns True if value is a typed array (Int8Array, Uint8Array, etc.)
 */
export declare function isTypedArray(v: unknown): v is Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array | BigInt64Array | BigUint64Array;
/**
 * Type guard to check if a value is a readonly array
 * @param v - Value to check
 * @returns True if value is a readonly array
 */
export declare function isReadonlyArray<T = any>(v: unknown): v is readonly T[];
/**
 * Safely get the last element of an array
 * @param arr - Array to get last element from
 * @returns Last element or undefined if array is empty
 */
export declare function last<T>(arr: T[]): T | undefined;
/**
 * Safely get the first element of an array
 * @param arr - Array to get first element from
 * @returns First element or undefined if array is empty
 */
export declare function first<T>(arr: T[]): T | undefined;
/**
 * Create an array from an iterable or array-like object with type safety
 * @param iterable - Iterable or array-like object
 * @returns Array from the iterable
 */
export declare function toArray<T>(iterable: Iterable<T> | ArrayLike<T>): T[];
/**
 * Group array items by a key
 * @param arr - Array to group
 * @param keyFn - Function to extract group key
 * @returns Object with keys mapping to arrays of items
 */
export declare function groupArrayBy<T, K extends string | number | symbol>(arr: T[], keyFn: (item: T) => K): Record<K, T[]>;
/**
 * Flatten an array of arrays
 * @param arr - Array of arrays to flatten
 * @returns Flattened array
 */
export declare function flattenArray<T>(arr: T[][]): T[];
/**
 * Get array element by index with support for negative indices
 * @param arr - Array to get element from
 * @param index - Index (negative counts from end)
 * @returns Element at index or undefined if out of bounds
 */
export declare function at<T>(arr: T[], index: number): T | undefined;
//# sourceMappingURL=utils.d.ts.map