/**
 * @fileoverview Advanced array utilities with object integration
 * Provides powerful array manipulation functions that work seamlessly with objects
 */
import type { AnyObject } from '../object/types.js';
/**
 * Chunks an array into smaller arrays of specified size
 * @param array - Source array
 * @param size - Chunk size
 * @returns Array of chunks
 * @example
 * chunk([1, 2, 3, 4, 5], 2) // [[1, 2], [3, 4], [5]]
 */
export declare function chunk<T>(array: T[], size: number): T[][];
/**
 * Flattens array by one level
 * @param array - Source array
 * @returns Flattened array
 * @example
 * flatten([[1, 2], [3, 4]]) // [1, 2, 3, 4]
 */
export declare function flatten<T>(array: (T | T[])[]): T[];
/**
 * Deeply flattens nested arrays
 * @param array - Source array
 * @param depth - Maximum depth (default: Infinity)
 * @returns Flattened array
 * @example
 * flattenDeep([[1, [2, [3, [4]]]]) // [1, 2, 3, 4]
 */
export declare function flattenDeep<T>(array: any[], depth?: number): T[];
/**
 * Returns unique values from array
 * @param array - Source array
 * @param selector - Optional key path or function for comparison
 * @returns Array with unique values
 * @example
 * unique([1, 2, 2, 3]) // [1, 2, 3]
 * unique([{id: 1}, {id: 2}, {id: 1}], 'id') // [{id: 1}, {id: 2}]
 * unique([{x: 1}, {x: 2}, {x: 1}], item => item.x) // [{x: 1}, {x: 2}]
 */
export declare function unique<T>(array: T[], selector?: keyof T | string | ((item: T) => any)): T[];
/**
 * Groups array elements by key or callback
 * @param array - Source array
 * @param keyOrFn - Key name or grouping function
 * @returns Grouped object
 * @example
 * groupBy([{type: 'a', v: 1}, {type: 'b', v: 2}, {type: 'a', v: 3}], 'type')
 * // {a: [{type: 'a', v: 1}, {type: 'a', v: 3}], b: [{type: 'b', v: 2}]}
 */
export declare function groupBy<T>(array: T[], keyOrFn: keyof T | string | ((item: T) => string | number)): Record<string, T[]>;
/**
 * Counts occurrences of each value
 * @param array - Source array
 * @param key - Optional key for object arrays
 * @returns Count object
 * @example
 * countBy(['a', 'b', 'a', 'c']) // {a: 2, b: 1, c: 1}
 */
export declare function countBy<T>(array: T[], key?: keyof T | string | ((item: T) => string | number)): Record<string, number>;
/**
 * Creates object from array using key/value extractors
 * @param array - Source array
 * @param keyFn - Key extractor function or key name
 * @param valueFn - Value extractor function or value name (optional)
 * @returns Object
 * @example
 * keyBy([{id: 1, name: 'a'}, {id: 2, name: 'b'}], 'id')
 * // {1: {id: 1, name: 'a'}, 2: {id: 2, name: 'b'}}
 */
export declare function keyBy<T, V = T>(array: T[], keyFn: keyof T | string | ((item: T) => string | number), valueFn?: keyof T | string | ((item: T) => V)): Record<string, V>;
/**
 * Sorts array by key or multiple keys
 * @param array - Source array
 * @param keys - Sort key(s) with optional direction
 * @returns Sorted array (new array)
 * @example
 * sortBy([{a: 3}, {a: 1}, {a: 2}], 'a') // [{a: 1}, {a: 2}, {a: 3}]
 * sortBy([{a: 1, b: 3}, {a: 1, b: 1}], ['a', {key: 'b', dir: 'desc'}])
 */
export declare function sortBy<T>(array: T[], keys: keyof T | string | (keyof T | string | {
    key: keyof T | string;
    dir?: 'asc' | 'desc';
})[]): T[];
/**
 * Finds difference between two arrays
 * @param array1 - First array
 * @param array2 - Second array
 * @param key - Optional key for object comparison
 * @returns Elements in array1 not in array2
 * @example
 * difference([1, 2, 3], [2, 3, 4]) // [1]
 */
export declare function difference<T>(array1: T[], array2: T[], key?: keyof T | string): T[];
/**
 * Finds intersection of two arrays
 * @param array1 - First array
 * @param array2 - Second array
 * @param key - Optional key for object comparison
 * @returns Common elements
 * @example
 * intersection([1, 2, 3], [2, 3, 4]) // [2, 3]
 */
export declare function intersection<T>(array1: T[], array2: T[], key?: keyof T | string): T[];
/**
 * Finds union of two arrays (unique elements from both)
 * @param array1 - First array
 * @param array2 - Second array
 * @param key - Optional key for object comparison
 * @returns Union of arrays
 * @example
 * union([1, 2], [2, 3]) // [1, 2, 3]
 */
export declare function union<T>(array1: T[], array2: T[], key?: keyof T | string): T[];
/**
 * Partitions array into two groups based on predicate
 * @param array - Source array
 * @param predicate - Test function
 * @returns [truthy, falsy]
 * @example
 * partition([1, 2, 3, 4], x => x % 2 === 0) // [[2, 4], [1, 3]]
 */
export declare function partition<T>(array: T[], predicate: (item: T, index: number) => boolean): [T[], T[]];
/**
 * Takes first n elements from array
 * @param array - Source array
 * @param n - Number of elements
 * @returns First n elements
 * @example
 * take([1, 2, 3, 4], 2) // [1, 2]
 */
export declare function take<T>(array: T[], n: number): T[];
/**
 * Takes last n elements from array
 * @param array - Source array
 * @param n - Number of elements
 * @returns Last n elements
 * @example
 * takeLast([1, 2, 3, 4], 2) // [3, 4]
 */
export declare function takeLast<T>(array: T[], n: number): T[];
/**
 * Takes elements while predicate is true
 * @param array - Source array
 * @param predicate - Test function
 * @returns Elements taken
 * @example
 * takeWhile([1, 2, 3, 4], x => x < 3) // [1, 2]
 */
export declare function takeWhile<T>(array: T[], predicate: (item: T, index: number) => boolean): T[];
/**
 * Drops first n elements from array
 * @param array - Source array
 * @param n - Number of elements to drop
 * @returns Remaining elements
 * @example
 * drop([1, 2, 3, 4], 2) // [3, 4]
 */
export declare function drop<T>(array: T[], n: number): T[];
/**
 * Drops elements while predicate is true
 * @param array - Source array
 * @param predicate - Test function
 * @returns Remaining elements
 * @example
 * dropWhile([1, 2, 3, 4], x => x < 3) // [3, 4]
 */
export declare function dropWhile<T>(array: T[], predicate: (item: T, index: number) => boolean): T[];
/**
 * Compacts array by removing falsy values
 * @param array - Source array
 * @returns Array without falsy values
 * @example
 * compact([0, 1, false, 2, '', 3, null]) // [1, 2, 3]
 */
export declare function compact<T>(array: (T | null | undefined | false | 0 | '')[]): T[];
/**
 * Zips multiple arrays together
 * @param arrays - Arrays to zip
 * @returns Zipped array
 * @example
 * zip([1, 2], ['a', 'b'], [true, false]) // [[1, 'a', true], [2, 'b', false]]
 */
export declare function zip<T extends any[][]>(...arrays: T): any[][];
/**
 * Unzips array of arrays
 * @param array - Array to unzip
 * @returns Unzipped arrays
 * @example
 * unzip([[1, 'a'], [2, 'b']]) // [[1, 2], ['a', 'b']]
 */
export declare function unzip<T>(array: T[][]): T[][];
/**
 * Shuffles array randomly
 * @param array - Source array
 * @returns Shuffled array (new array)
 * @example
 * shuffle([1, 2, 3, 4, 5])
 */
export declare function shuffle<T>(array: T[]): T[];
/**
 * Gets random element from array
 * @param array - Source array
 * @returns Random element
 * @example
 * sample([1, 2, 3, 4, 5]) // Random element
 */
export declare function sample<T>(array: T[]): T | undefined;
/**
 * Gets n random elements from array
 * @param array - Source array
 * @param n - Number of elements
 * @returns Random elements
 * @example
 * sampleSize([1, 2, 3, 4, 5], 3) // 3 random elements
 */
export declare function sampleSize<T>(array: T[], n: number): T[];
/**
 * Finds index of element using predicate
 * @param array - Source array
 * @param predicate - Search function
 * @param fromIndex - Start index
 * @returns Index or -1
 * @example
 * findIndex([1, 2, 3, 4], x => x > 2) // 2
 */
export declare function findIndex<T>(array: T[], predicate: (item: T, index: number) => boolean, fromIndex?: number): number;
/**
 * Finds last index of element using predicate
 * @param array - Source array
 * @param predicate - Search function
 * @param fromIndex - Start index (from end)
 * @returns Index or -1
 * @example
 * findLastIndex([1, 2, 3, 4, 3], x => x === 3) // 4
 */
export declare function findLastIndex<T>(array: T[], predicate: (item: T, index: number) => boolean, fromIndex?: number): number;
/**
 * Creates array of values at given paths
 * @param array - Source array of objects
 * @param path - Property path
 * @returns Array of values
 * @example
 * pluck([{a: {b: 1}}, {a: {b: 2}}], 'a.b') // [1, 2]
 */
export declare function pluck<T extends AnyObject, R = any>(array: T[], path: string): R[];
/**
 * Extracts object properties from array
 * @param array - Source array of objects
 * @param keys - Keys to pick
 * @returns Array of objects with picked keys
 * @example
 * pick([{a: 1, b: 2}, {a: 3, b: 4}], ['a']) // [{a: 1}, {a: 3}]
 */
export declare function pick<T extends AnyObject, K extends keyof T>(array: T[], keys: K[]): Pick<T, K>[];
/**
 * Omits object properties from array
 * @param array - Source array of objects
 * @param keys - Keys to omit
 * @returns Array of objects without omitted keys
 * @example
 * omit([{a: 1, b: 2}, {a: 3, b: 4}], ['b']) // [{a: 1}, {a: 3}]
 */
export declare function omit<T extends AnyObject, K extends keyof T>(array: T[], keys: K[]): Omit<T, K>[];
/**
 * Maps and flattens array in one operation
 * @param array - Source array
 * @param callback - Mapping function
 * @returns Flattened mapped array
 * @example
 * flatMap([1, 2, 3], x => [x, x * 2]) // [1, 2, 2, 4, 3, 6]
 */
export declare function flatMap<T, R>(array: T[], callback: (item: T, index: number) => R | R[]): R[];
/**
 * Reduces array from right to left
 * @param array - Source array
 * @param callback - Reducer function
 * @param initialValue - Initial value
 * @returns Reduced value
 * @example
 * reduceRight([1, 2, 3], (acc, val) => acc + val, 0) // 6
 */
export declare function reduceRight<T, R>(array: T[], callback: (accumulator: R, value: T, index: number) => R, initialValue: R): R;
/**
 * Creates array of numbers in range
 * @param start - Start value
 * @param end - End value (exclusive)
 * @param step - Step value
 * @returns Range array
 * @example
 * range(0, 5) // [0, 1, 2, 3, 4]
 * range(0, 10, 2) // [0, 2, 4, 6, 8]
 */
export declare function range(start: number, end: number, step?: number): number[];
/**
 * Fills array with value (similar to Array.prototype.fill)
 * @param array - Source array
 * @param value - Fill value
 * @param start - Start index (default: 0)
 * @param end - End index (default: array.length)
 * @returns New array with filled values
 * @example
 * fill([1, 2, 3], 0) // [0, 0, 0]
 * fill([1, 2, 3, 4, 5], 9, 1, 3) // [1, 9, 9, 4, 5]
 */
export declare function fill<T>(array: T[], value: T, start?: number, end?: number): T[];
/**
 * Deeply clones array (including nested objects)
 * @param array - Source array
 * @returns Cloned array
 * @example
 * deepCloneArray([{a: 1}, {b: 2}])
 */
export declare function deepCloneArray<T>(array: T[]): T[];
/**
 * Merges multiple arrays of objects by key
 * @param arr1 - First array
 * @param arr2 - Second array (or key if only merging arr1)
 * @param keyOrMore - Key to merge by, or more arrays
 * @returns Merged array
 * @example
 * mergeByKey([{id: 1, a: 1}], [{id: 1, b: 2}], 'id')
 * // [{id: 1, a: 1, b: 2}]
 */
export declare function mergeByKey<T extends AnyObject>(arr1: T[], arr2: T[] | string, ...keyOrMore: (T[] | string)[]): T[];
/**
 * Moves array element from one index to another
 * @param array - Source array
 * @param fromIndex - Source index
 * @param toIndex - Destination index
 * @returns New array with moved element
 * @example
 * move([1, 2, 3, 4], 0, 2) // [2, 3, 1, 4]
 */
export declare function move<T>(array: T[], fromIndex: number, toIndex: number): T[];
/**
 * Rotates array elements
 * @param array - Source array
 * @param n - Number of positions (positive = right, negative = left)
 * @returns Rotated array
 * @example
 * rotate([1, 2, 3, 4], 1) // [4, 1, 2, 3]
 * rotate([1, 2, 3, 4], -1) // [2, 3, 4, 1]
 */
export declare function rotate<T>(array: T[], n: number): T[];
/**
 * Inserts element at index
 * @param array - Source array
 * @param index - Insert index
 * @param items - Items to insert
 * @returns New array
 * @example
 * insert([1, 2, 4], 2, 3) // [1, 2, 3, 4]
 */
export declare function insert<T>(array: T[], index: number, ...items: T[]): T[];
/**
 * Removes element at index
 * @param array - Source array
 * @param index - Remove index
 * @param count - Number of elements to remove
 * @returns New array
 * @example
 * remove([1, 2, 3, 4], 1, 2) // [1, 4]
 */
export declare function remove<T>(array: T[], index: number, count?: number): T[];
/**
 * Replaces element at index
 * @param array - Source array
 * @param index - Replace index
 * @param item - New item
 * @returns New array
 * @example
 * replace([1, 2, 3], 1, 5) // [1, 5, 3]
 */
export declare function replace<T>(array: T[], index: number, item: T): T[];
/**
 * Filters array and removes null/undefined
 * @param array - Source array
 * @param predicate - Filter function
 * @returns Filtered array without null/undefined
 * @example
 * filterCompact([1, null, 2, undefined, 3], x => x) // [1, 2, 3]
 */
export declare function filterCompact<T>(array: (T | null | undefined)[], predicate?: (item: T) => boolean): T[];
/**
 * Creates cartesian product of arrays
 * @param arrays - Arrays to combine
 * @returns Cartesian product
 * @example
 * cartesian([1, 2], ['a', 'b']) // [[1, 'a'], [1, 'b'], [2, 'a'], [2, 'b']]
 */
export declare function cartesian<T extends any[][]>(...arrays: T): any[][];
/**
 * Finds all indices where predicate is true
 * @param array - Source array
 * @param predicate - Test function
 * @returns Array of indices
 * @example
 * findAllIndices([1, 2, 3, 2, 1], x => x === 2) // [1, 3]
 */
export declare function findAllIndices<T>(array: T[], predicate: (item: T, index: number) => boolean): number[];
/**
 * Checks if arrays are equal
 * @param array1 - First array
 * @param array2 - Second array
 * @param deep - Deep comparison
 * @returns True if equal
 * @example
 * isEqual([1, 2, 3], [1, 2, 3]) // true
 */
export declare function isEqual<T>(array1: T[], array2: T[], deep?: boolean): boolean;
/**
 * Splits array into chunks where predicate changes
 * @param array - Source array
 * @param predicate - Grouping function
 * @returns Chunked array
 * @example
 * chunkBy([1, 1, 2, 2, 3], x => x) // [[1, 1], [2, 2], [3]]
 */
export declare function chunkBy<T>(array: T[], predicate: (item: T, index: number) => any): T[][];
/**
 * Updates array elements by predicate or key/value
 * @param array - Source array
 * @param predicate - Predicate function or key to match
 * @param updates - Updates to apply (or value if predicate is a key)
 * @param updatesOrUndefined - Updates if using key/value form
 * @returns Updated array
 * @example
 * updateBy([{id: 1, name: 'a'}], x => x.id === 1, {name: 'b'}) // [{id: 1, name: 'b'}]
 * updateBy([{id: 1, name: 'a'}], 'id', 1, {name: 'b'}) // [{id: 1, name: 'b'}]
 */
export declare function updateBy<T extends AnyObject>(array: T[], predicate: ((item: T) => boolean) | keyof T | string, updates: any, updatesOrUndefined?: Partial<T>): T[];
/**
 * Removes duplicates and returns removed items
 * @param array - Source array
 * @param key - Optional key for objects
 * @returns Object with unique and duplicates arrays
 * @example
 * splitDuplicates([1, 2, 2, 3, 3]) // { unique: [1, 2, 3], duplicates: [2, 3] }
 */
export declare function splitDuplicates<T>(array: T[], key?: keyof T | string): {
    unique: T[];
    duplicates: T[];
};
/**
 * Ensures array (converts non-array to array)
 * @param value - Value to ensure as array
 * @returns Array
 * @example
 * ensureArray(1) // [1]
 * ensureArray([1, 2]) // [1, 2]
 */
export declare function ensureArray<T>(value: T | T[]): T[];
/**
 * Wraps value in array if not already an array
 * @param value - Value to wrap
 * @returns Array
 * @example
 * wrap(1) // [1]
 * wrap([1]) // [1]
 */
export declare function wrap<T>(value: T | T[]): T[];
/**
 * Creates sliding windows of specified size over the array
 * @param array - Source array
 * @param size - Window size
 * @param step - Step size between windows (default: 1)
 * @returns Array of windows
 * @example
 * slidingWindow([1, 2, 3, 4, 5], 3) // [[1, 2, 3], [2, 3, 4], [3, 4, 5]]
 * slidingWindow([1, 2, 3, 4, 5], 2, 2) // [[1, 2], [3, 4]]
 */
export declare function slidingWindow<T>(array: T[], size: number, step?: number): T[][];
/**
 * Finds the minimum value in an array by comparing a key/selector
 * @param array - Source array
 * @param selector - Key path or selector function
 * @returns Element with minimum value, or undefined if array is empty
 * @example
 * minBy([{ age: 30 }, { age: 20 }], 'age') // { age: 20 }
 * minBy([{ price: 100 }, { price: 50 }], obj => obj.price) // { price: 50 }
 */
export declare function minBy<T>(array: T[], selector: string | ((item: T) => any)): T | undefined;
/**
 * Finds the maximum value in an array by comparing a key/selector
 * @param array - Source array
 * @param selector - Key path or selector function
 * @returns Element with maximum value, or undefined if array is empty
 * @example
 * maxBy([{ age: 30 }, { age: 20 }], 'age') // { age: 30 }
 * maxBy([{ price: 100 }, { price: 50 }], obj => obj.price) // { price: 100 }
 */
export declare function maxBy<T>(array: T[], selector: string | ((item: T) => any)): T | undefined;
/**
 * Calculates sum of values in array by key/selector
 * @param array - Source array
 * @param selector - Key path or selector function
 * @returns Sum of values
 * @example
 * sumBy([{ price: 10 }, { price: 20 }], 'price') // 30
 * sumBy([{ x: 5 }, { x: 10 }], obj => obj.x) // 15
 */
export declare function sumBy<T>(array: T[], selector: string | ((item: T) => number)): number;
/**
 * Calculates average of values in array by key/selector
 * @param array - Source array
 * @param selector - Key path or selector function
 * @returns Average of values, or 0 if array is empty
 * @example
 * avgBy([{ score: 80 }, { score: 90 }], 'score') // 85
 * avgBy([{ x: 10 }, { x: 20 }], obj => obj.x) // 15
 */
export declare function avgBy<T>(array: T[], selector: string | ((item: T) => number)): number;
/**
 * Counts frequency of each unique value in array
 * @param array - Source array
 * @returns Map of value to frequency count
 * @example
 * frequencies([1, 2, 2, 3, 3, 3]) // Map { 1 => 1, 2 => 2, 3 => 3 }
 * frequencies(['a', 'b', 'a']) // Map { 'a' => 2, 'b' => 1 }
 */
export declare function frequencies<T>(array: T[]): Map<T, number>;
/**
 * Finds the most common value(s) in array
 * @param array - Source array
 * @param limit - Maximum number of values to return (default: 1)
 * @returns Array of most common values
 * @example
 * mostCommon([1, 2, 2, 3, 3, 3]) // [3]
 * mostCommon([1, 1, 2, 2, 3], 2) // [1, 2] or [2, 1]
 */
export declare function mostCommon<T>(array: T[], limit?: number): T[];
/**
 * Finds the least common value(s) in array
 * @param array - Source array
 * @param limit - Maximum number of values to return (default: 1)
 * @returns Array of least common values
 * @example
 * leastCommon([1, 2, 2, 3, 3, 3]) // [1]
 * leastCommon([1, 1, 2, 2, 3, 3], 3) // [1, 2, 3] or any order
 */
export declare function leastCommon<T>(array: T[], limit?: number): T[];
/**
 * Processes array in batches with async callback
 * @param array - Source array
 * @param batchSize - Size of each batch
 * @param callback - Async function to process each batch
 * @returns Promise that resolves when all batches are processed
 * @example
 * await batchProcess([1, 2, 3, 4], 2, async (batch) => {
 *   await saveToDatabase(batch);
 * });
 */
export declare function batchProcess<T>(array: T[], batchSize: number, callback: (batch: T[], index: number) => Promise<void>): Promise<void>;
/**
 * Processes array in batches in parallel with concurrency limit
 * @param array - Source array
 * @param batchSize - Size of each batch
 * @param concurrency - Maximum number of concurrent batches
 * @param callback - Async function to process each batch
 * @returns Promise that resolves when all batches are processed
 * @example
 * await batchProcessParallel([1, 2, 3, 4, 5, 6], 2, 2, async (batch) => {
 *   await saveToDatabase(batch);
 * });
 */
export declare function batchProcessParallel<T>(array: T[], batchSize: number, concurrency: number, callback: (batch: T[], index: number) => Promise<void>): Promise<void>;
/**
 * Transposes a 2D array (rows become columns, columns become rows)
 * @param matrix - 2D array to transpose
 * @returns Transposed 2D array
 * @example
 * transpose([[1, 2], [3, 4], [5, 6]]) // [[1, 3, 5], [2, 4, 6]]
 */
export declare function transpose<T>(matrix: T[][]): T[][];
/**
 * Checks if two arrays are equal (shallow comparison)
 * @param array1 - First array
 * @param array2 - Second array
 * @returns True if arrays are equal
 * @example
 * isArrayEqual([1, 2, 3], [1, 2, 3]) // true
 * isArrayEqual([1, 2], [1, 2, 3]) // false
 */
export declare function isArrayEqual<T>(array1: T[], array2: T[]): boolean;
/**
 * Checks if two arrays contain the same elements (order doesn't matter)
 * @param array1 - First array
 * @param array2 - Second array
 * @returns True if arrays contain same elements
 * @example
 * hasSameElements([1, 2, 3], [3, 2, 1]) // true
 * hasSameElements([1, 2], [1, 2, 2]) // false
 */
export declare function hasSameElements<T>(array1: T[], array2: T[]): boolean;
/**
 * Checks if array1 is a subset of array2 (all elements in array1 exist in array2)
 * @param array1 - Subset array
 * @param array2 - Superset array
 * @returns True if array1 is a subset of array2
 * @example
 * isSubset([1, 2], [1, 2, 3, 4]) // true
 * isSubset([1, 5], [1, 2, 3, 4]) // false
 */
export declare function isSubset<T>(array1: T[], array2: T[]): boolean;
/**
 * Checks if array1 is a superset of array2 (all elements in array2 exist in array1)
 * @param array1 - Superset array
 * @param array2 - Subset array
 * @returns True if array1 is a superset of array2
 * @example
 * isSuperset([1, 2, 3, 4], [1, 2]) // true
 * isSuperset([1, 2, 3], [1, 5]) // false
 */
export declare function isSuperset<T>(array1: T[], array2: T[]): boolean;
/**
 * Interleaves multiple arrays (takes one element from each in turn)
 * @param arrays - Arrays to interleave
 * @returns Interleaved array
 * @example
 * interleave([1, 2], ['a', 'b'], [true, false]) // [1, 'a', true, 2, 'b', false]
 */
export declare function interleave<T>(...arrays: T[][]): T[];
/**
 * Splits array into two arrays based on a predicate
 * Similar to partition but returns object with named properties
 * @param array - Source array
 * @param predicate - Function to test each element
 * @returns Object with 'pass' and 'fail' arrays
 * @example
 * bifurcate([1, 2, 3, 4], x => x % 2 === 0) // { pass: [2, 4], fail: [1, 3] }
 */
export declare function bifurcate<T>(array: T[], predicate: (item: T, index: number) => boolean): {
    pass: T[];
    fail: T[];
};
/**
 * Creates an array with a specified length filled with values from a generator function
 * @param length - Length of array
 * @param generator - Function that generates value for each index
 * @returns Generated array
 * @example
 * generate(5, i => i * 2) // [0, 2, 4, 6, 8]
 * generate(3, () => Math.random()) // [0.123, 0.456, 0.789]
 */
export declare function generate<T>(length: number, generator: (index: number) => T): T[];
/**
 * Repeats an array n times
 * @param array - Source array
 * @param times - Number of times to repeat
 * @returns New array with repeated elements
 * @example
 * repeat([1, 2], 3) // [1, 2, 1, 2, 1, 2]
 */
export declare function repeat<T>(array: T[], times: number): T[];
/**
 * Finds the median value in a numeric array
 * @param array - Array of numbers
 * @returns Median value, or undefined if array is empty
 * @example
 * median([1, 2, 3, 4, 5]) // 3
 * median([1, 2, 3, 4]) // 2.5
 */
export declare function median(array: number[]): number | undefined;
/**
 * Calculates the mode (most frequent value) in an array
 * @param array - Source array
 * @returns Most frequent value, or undefined if array is empty
 * @example
 * mode([1, 2, 2, 3, 3, 3]) // 3
 * mode(['a', 'b', 'b']) // 'b'
 */
export declare function mode<T>(array: T[]): T | undefined;
/**
 * Removes all occurrences of specified values from array
 * @param array - Source array
 * @param values - Values to remove
 * @returns New array without specified values
 * @example
 * without([1, 2, 3, 2, 4], 2, 3) // [1, 4]
 */
export declare function without<T>(array: T[], ...values: T[]): T[];
/**
 * Creates array of unique values that are in the first array but not in other arrays
 * @param array - Source array
 * @param others - Arrays to exclude
 * @returns Array with values only in first array
 * @example
 * differenceWith([1, 2, 3], [2], [3]) // [1]
 */
export declare function differenceWith<T>(array: T[], ...others: T[][]): T[];
/**
 * Groups consecutive identical values together
 * @param array - Source array
 * @returns Array of arrays with consecutive identical values
 * @example
 * groupConsecutive([1, 1, 2, 2, 2, 3, 1]) // [[1, 1], [2, 2, 2], [3], [1]]
 */
export declare function groupConsecutive<T>(array: T[]): T[][];
/**
 * Removes consecutive duplicate values
 * @param array - Source array
 * @returns Array without consecutive duplicates
 * @example
 * dedupeConsecutive([1, 1, 2, 2, 2, 3, 1]) // [1, 2, 3, 1]
 */
export declare function dedupeConsecutive<T>(array: T[]): T[];
/**
 * Assigns ranks to array elements (1-based, lower values get lower ranks)
 * @param array - Array of numbers
 * @param method - Ranking method: 'standard', 'dense', or 'ordinal'
 * @returns Array of ranks corresponding to input array
 * @example
 * rank([10, 20, 20, 30]) // [1, 2, 2, 4] (standard)
 * rank([10, 20, 20, 30], 'dense') // [1, 2, 2, 3]
 * rank([10, 20, 20, 30], 'ordinal') // [1, 2, 3, 4]
 */
export declare function rank(array: number[], method?: 'standard' | 'dense' | 'ordinal'): number[];
/**
 * Calculates the percentile value from a sorted or unsorted array
 * @param array - Array of numbers
 * @param percentile - Percentile to calculate (0-100)
 * @returns Percentile value, or undefined if array is empty
 * @example
 * percentile([1, 2, 3, 4, 5], 50) // 3 (median)
 * percentile([1, 2, 3, 4, 5, 6], 75) // 4.75
 */
export declare function percentile(array: number[], percentile: number): number | undefined;
/**
 * Calculates quartiles (Q1, Q2/median, Q3) of an array
 * @param array - Array of numbers
 * @returns Object with q1, q2 (median), q3, and iqr (interquartile range)
 * @example
 * quartiles([1, 2, 3, 4, 5]) // { q1: 1.5, q2: 3, q3: 4.5, iqr: 3 }
 */
export declare function quartiles(array: number[]): {
    q1: number;
    q2: number;
    q3: number;
    iqr: number;
} | undefined;
/**
 * Calculates standard deviation of numeric array
 * @param array - Array of numbers
 * @param sample - If true, calculates sample standard deviation (default: false for population)
 * @returns Standard deviation, or undefined if array is empty
 * @example
 * standardDeviation([2, 4, 4, 4, 5, 5, 7, 9]) // 2
 */
export declare function standardDeviation(array: number[], sample?: boolean): number | undefined;
/**
 * Calculates variance of numeric array
 * @param array - Array of numbers
 * @param sample - If true, calculates sample variance (default: false for population)
 * @returns Variance, or undefined if array is empty
 * @example
 * variance([2, 4, 4, 4, 5, 5, 7, 9]) // 4
 */
export declare function variance(array: number[], sample?: boolean): number | undefined;
/**
 * Normalizes array values to 0-1 range (min-max normalization)
 * @param array - Array of numbers
 * @returns Normalized array
 * @example
 * normalize([1, 2, 3, 4, 5]) // [0, 0.25, 0.5, 0.75, 1]
 */
export declare function normalize(array: number[]): number[];
/**
 * Standardizes array values (z-score normalization)
 * @param array - Array of numbers
 * @returns Standardized array with mean 0 and standard deviation 1
 * @example
 * standardize([2, 4, 4, 4, 5, 5, 7, 9]) // [-1.5, -0.5, -0.5, -0.5, 0, 0, 1, 2]
 */
export declare function standardize(array: number[]): number[];
/**
 * Applies a function cumulatively to array elements (like reduce but returns all intermediate results)
 * @param array - Source array
 * @param fn - Accumulator function
 * @param initial - Initial value
 * @returns Array of cumulative results
 * @example
 * scan([1, 2, 3, 4], (acc, x) => acc + x, 0) // [1, 3, 6, 10]
 */
export declare function scan<T, R>(array: T[], fn: (accumulator: R, current: T, index: number) => R, initial: R): R[];
/**
 * Creates cumulative sum array
 * @param array - Array of numbers
 * @returns Array of cumulative sums
 * @example
 * cumulativeSum([1, 2, 3, 4]) // [1, 3, 6, 10]
 */
export declare function cumulativeSum(array: number[]): number[];
/**
 * Creates array of differences between consecutive elements
 * @param array - Array of numbers
 * @returns Array of differences
 * @example
 * diff([1, 3, 6, 10]) // [2, 3, 4]
 */
export declare function diff(array: number[]): number[];
/**
 * Pads array to specified length with a value
 * @param array - Source array
 * @param length - Target length
 * @param value - Value to pad with
 * @param position - Where to add padding: 'start' or 'end' (default: 'end')
 * @returns Padded array
 * @example
 * pad([1, 2, 3], 5, 0) // [1, 2, 3, 0, 0]
 * pad([1, 2, 3], 5, 0, 'start') // [0, 0, 1, 2, 3]
 */
export declare function pad<T>(array: T[], length: number, value: T, position?: 'start' | 'end'): T[];
/**
 * Trims array to remove elements from start and end that match predicate
 * @param array - Source array
 * @param predicate - Function to test elements to trim
 * @returns Trimmed array
 * @example
 * trim([0, 0, 1, 2, 3, 0, 0], x => x === 0) // [1, 2, 3]
 */
export declare function trim<T>(array: T[], predicate: (item: T) => boolean): T[];
/**
 * Creates pairs of adjacent elements
 * @param array - Source array
 * @returns Array of pairs
 * @example
 * pairwise([1, 2, 3, 4]) // [[1, 2], [2, 3], [3, 4]]
 */
export declare function pairwise<T>(array: T[]): [T, T][];
/**
 * Creates array of index-value pairs
 * @param array - Source array
 * @returns Array of [index, value] tuples
 * @example
 * enumerate(['a', 'b', 'c']) // [[0, 'a'], [1, 'b'], [2, 'c']]
 */
export declare function enumerate<T>(array: T[]): [number, T][];
/**
 * Applies different functions to array elements based on their index
 * @param array - Source array
 * @param functions - Array of functions to apply
 * @returns Array with functions applied
 * @example
 * applyByIndex([1, 2, 3], [x => x * 2, x => x + 10, x => x ** 2]) // [2, 12, 9]
 */
export declare function applyByIndex<T, R>(array: T[], functions: Array<(item: T) => R>): R[];
/**
 * Rotates elements to left by n positions
 * @param array - Source array
 * @param n - Number of positions to rotate (default: 1)
 * @returns Rotated array
 * @example
 * rotateLeft([1, 2, 3, 4, 5], 2) // [3, 4, 5, 1, 2]
 */
export declare function rotateLeft<T>(array: T[], n?: number): T[];
/**
 * Rotates elements to right by n positions
 * @param array - Source array
 * @param n - Number of positions to rotate (default: 1)
 * @returns Rotated array
 * @example
 * rotateRight([1, 2, 3, 4, 5], 2) // [4, 5, 1, 2, 3]
 */
export declare function rotateRight<T>(array: T[], n?: number): T[];
/**
 * Swaps two elements in array by their indices
 * @param array - Source array
 * @param i - First index
 * @param j - Second index
 * @returns New array with swapped elements
 * @example
 * swap([1, 2, 3, 4], 0, 3) // [4, 2, 3, 1]
 */
export declare function swap<T>(array: T[], i: number, j: number): T[];
/**
 * Reverses array segments between specified indices
 * @param array - Source array
 * @param start - Start index (inclusive)
 * @param end - End index (inclusive)
 * @returns Array with reversed segment
 * @example
 * reverseSegment([1, 2, 3, 4, 5], 1, 3) // [1, 4, 3, 2, 5]
 */
export declare function reverseSegment<T>(array: T[], start: number, end: number): T[];
/**
 * Checks if array is sorted in ascending order
 * @param array - Array to check
 * @param compareFn - Optional comparison function
 * @returns True if array is sorted
 * @example
 * isSorted([1, 2, 3, 4]) // true
 * isSorted([1, 3, 2, 4]) // false
 */
export declare function isSorted<T>(array: T[], compareFn?: (a: T, b: T) => number): boolean;
/**
 * Checks if array contains duplicates
 * @param array - Array to check
 * @returns True if array has duplicates
 * @example
 * hasDuplicates([1, 2, 3]) // false
 * hasDuplicates([1, 2, 2, 3]) // true
 */
export declare function hasDuplicates<T>(array: T[]): boolean;
/**
 * Extracts values from array of objects by multiple keys
 * @param array - Array of objects
 * @param keys - Keys to extract
 * @returns Array of objects with only specified keys
 * @example
 * pickMany([{a: 1, b: 2, c: 3}], ['a', 'c']) // [{a: 1, c: 3}]
 */
export declare function pickMany<T extends AnyObject, K extends keyof T>(array: T[], keys: K[]): Pick<T, K>[];
/**
 * Maps array to object using key and value selectors
 * @param array - Source array
 * @param keySelector - Function to extract key
 * @param valueSelector - Function to extract value (optional, defaults to identity)
 * @returns Object with mapped keys and values
 * @example
 * toObject([{id: 1, name: 'A'}], x => x.id, x => x.name) // {1: 'A'}
 */
export declare function toObject<T, K extends string | number | symbol, V>(array: T[], keySelector: (item: T, index: number) => K, valueSelector?: (item: T, index: number) => V): Record<K, V>;
/**
 * Maps array elements asynchronously in sequence
 * @param array - Source array
 * @param fn - Async mapping function
 * @returns Promise resolving to mapped array
 * @example
 * await mapAsync([1, 2, 3], async x => await fetchData(x))
 */
export declare function mapAsync<T, R>(array: T[], fn: (item: T, index: number) => Promise<R>): Promise<R[]>;
/**
 * Maps array elements asynchronously in parallel
 * @param array - Source array
 * @param fn - Async mapping function
 * @returns Promise resolving to mapped array
 * @example
 * await mapAsyncParallel([1, 2, 3], async x => await fetchData(x))
 */
export declare function mapAsyncParallel<T, R>(array: T[], fn: (item: T, index: number) => Promise<R>): Promise<R[]>;
/**
 * Filters array elements asynchronously
 * @param array - Source array
 * @param predicate - Async predicate function
 * @returns Promise resolving to filtered array
 * @example
 * await filterAsync([1, 2, 3], async x => await isValid(x))
 */
export declare function filterAsync<T>(array: T[], predicate: (item: T, index: number) => Promise<boolean>): Promise<T[]>;
/**
 * Reduces array asynchronously
 * @param array - Source array
 * @param fn - Async reducer function
 * @param initial - Initial accumulator value
 * @returns Promise resolving to final accumulator value
 * @example
 * await reduceAsync([1, 2, 3], async (acc, x) => acc + await process(x), 0)
 */
export declare function reduceAsync<T, R>(array: T[], fn: (accumulator: R, current: T, index: number) => Promise<R>, initial: R): Promise<R>;
/**
 * Finds first element that satisfies async predicate
 * @param array - Source array
 * @param predicate - Async predicate function
 * @returns Promise resolving to found element or undefined
 * @example
 * await findAsync([1, 2, 3], async x => await isValid(x))
 */
export declare function findAsync<T>(array: T[], predicate: (item: T, index: number) => Promise<boolean>): Promise<T | undefined>;
/**
 * Checks if some element satisfies async predicate
 * @param array - Source array
 * @param predicate - Async predicate function
 * @returns Promise resolving to true if any element matches
 * @example
 * await someAsync([1, 2, 3], async x => await isValid(x))
 */
export declare function someAsync<T>(array: T[], predicate: (item: T, index: number) => Promise<boolean>): Promise<boolean>;
/**
 * Checks if every element satisfies async predicate
 * @param array - Source array
 * @param predicate - Async predicate function
 * @returns Promise resolving to true if all elements match
 * @example
 * await everyAsync([1, 2, 3], async x => await isValid(x))
 */
export declare function everyAsync<T>(array: T[], predicate: (item: T, index: number) => Promise<boolean>): Promise<boolean>;
/**
 * Calculates weighted average from array of {value, weight} objects or using selectors
 * @param array - Source array
 * @param valueSelector - Function to extract value
 * @param weightSelector - Function to extract weight
 * @returns Weighted average, or 0 if total weight is 0
 * @example
 * weightedAverage([{score: 80, credits: 3}, {score: 90, credits: 2}], x => x.score, x => x.credits) // 84
 */
export declare function weightedAverage<T>(array: T[], valueSelector: string | ((item: T) => number), weightSelector: string | ((item: T) => number)): number;
/**
 * Randomly selects elements with weights
 * @param array - Source array
 * @param weightSelector - Function to extract weight
 * @param count - Number of elements to select (default: 1)
 * @returns Array of selected elements
 * @example
 * weightedSample([{item: 'A', prob: 0.7}, {item: 'B', prob: 0.3}], x => x.prob, 10)
 */
export declare function weightedSample<T>(array: T[], weightSelector: string | ((item: T) => number), count?: number): T[];
/**
 * Splits array into segments of varying sizes
 * @param array - Source array
 * @param sizes - Array of segment sizes
 * @returns Array of segments
 * @example
 * segment([1, 2, 3, 4, 5, 6], [2, 3, 1]) // [[1, 2], [3, 4, 5], [6]]
 */
export declare function segment<T>(array: T[], sizes: number[]): T[][];
/**
 * Creates array with elements that appear in first array specified number of times
 * @param array - Source array
 * @param count - Required occurrence count
 * @returns Array with elements appearing exactly count times
 * @example
 * selectByCount([1, 1, 2, 2, 2, 3], 2) // [1, 1, 2, 2]
 */
export declare function selectByCount<T>(array: T[], count: number): T[];
/**
 * Filters array to keep only elements that pass predicate n consecutive times
 * @param array - Source array
 * @param n - Number of consecutive passes required
 * @param predicate - Predicate function
 * @returns Filtered array
 * @example
 * filterConsecutive([1, 2, 2, 3, 3, 3], 2, x => x > 1) // [2, 2, 3, 3, 3]
 */
export declare function filterConsecutive<T>(array: T[], n: number, predicate: (item: T) => boolean): T[];
/**
 * Maps each element using accumulated context from previous elements
 * @param array - Source array
 * @param fn - Mapping function that receives accumulated context
 * @param initialContext - Initial context value
 * @returns Array of mapped values
 * @example
 * mapWithContext([1, 2, 3], (x, ctx) => ({value: x + ctx, newCtx: ctx + x}), 0)
 * // [{value: 1, newCtx: 1}, {value: 3, newCtx: 3}, {value: 6, newCtx: 6}]
 */
export declare function mapWithContext<T, R, C>(array: T[], fn: (item: T, context: C, index: number) => {
    value: R;
    newContext: C;
}, initialContext: C): R[];
/**
 * Groups array elements into fixed-size batches, with last batch potentially smaller
 * Similar to chunk but with better naming for batch processing scenarios
 * @param array - Source array
 * @param batchSize - Size of each batch
 * @returns Array of batches
 * @example
 * batch([1, 2, 3, 4, 5], 2) // [[1, 2], [3, 4], [5]]
 */
export declare function batch<T>(array: T[], batchSize: number): T[][];
/**
 * Applies a function to pairs of elements from two arrays
 * @param array1 - First array
 * @param array2 - Second array
 * @param fn - Function to combine elements
 * @returns Array of combined results
 * @example
 * zipWith([1, 2, 3], [4, 5, 6], (a, b) => a + b) // [5, 7, 9]
 */
export declare function zipWith<T1, T2, R>(array1: T1[], array2: T2[], fn: (a: T1, b: T2) => R): R[];
/**
 * Merges multiple arrays of objects by a key, with custom merge strategy
 * @param arrays - Arrays to merge
 * @param key - Key to merge by
 * @param mergeStrategy - How to merge: 'first', 'last', 'concat', or custom function
 * @returns Merged array
 * @example
 * mergeArraysByKey(
 *   [[{id: 1, a: 1}], [{id: 1, b: 2}]],
 *   'id',
 *   (existing, incoming) => ({...existing, ...incoming})
 * )
 */
export declare function mergeArraysByKey<T extends AnyObject>(arrays: T[][], key: string, mergeStrategy?: 'first' | 'last' | 'concat' | ((existing: T, incoming: T) => T)): T[];
/**
 * Creates a lookup/index object for fast access by key
 * @param array - Array of objects
 * @param key - Key to index by
 * @returns Object mapping key values to array elements
 * @example
 * indexBy([{id: 1, name: 'A'}, {id: 2, name: 'B'}], 'id')
 * // {1: {id: 1, name: 'A'}, 2: {id: 2, name: 'B'}}
 */
export declare function indexBy<T extends AnyObject>(array: T[], key: string): Record<string, T>;
/**
 * Performs binary search on sorted array
 * @param array - Sorted array
 * @param target - Value to search for
 * @param compareFn - Optional comparison function
 * @returns Index of target, or -1 if not found
 * @example
 * binarySearch([1, 2, 3, 4, 5], 3) // 2
 * binarySearch([1, 2, 4, 5], 3) // -1
 */
export declare function binarySearch<T>(array: T[], target: T, compareFn?: (a: T, b: T) => number): number;
/**
 * Inserts value into sorted array maintaining sort order
 * @param array - Sorted array
 * @param value - Value to insert
 * @param compareFn - Optional comparison function
 * @returns New sorted array with value inserted
 * @example
 * insertSorted([1, 3, 5, 7], 4) // [1, 3, 4, 5, 7]
 */
export declare function insertSorted<T>(array: T[], value: T, compareFn?: (a: T, b: T) => number): T[];
//# sourceMappingURL=advanced.d.ts.map