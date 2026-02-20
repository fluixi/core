/**
 * @fileoverview Advanced array utilities with object integration
 * Provides powerful array manipulation functions that work seamlessly with objects
 */
import { isObject } from '../object/utils.js';
import { deepClone } from '../object/clone.js';
import { get } from '../object/getter-setter.js';
/**
 * Chunks an array into smaller arrays of specified size
 * @param array - Source array
 * @param size - Chunk size
 * @returns Array of chunks
 * @example
 * chunk([1, 2, 3, 4, 5], 2) // [[1, 2], [3, 4], [5]]
 */
export function chunk(array, size) {
    if (!Array.isArray(array) || size < 1) {
        return [];
    }
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}
/**
 * Flattens array by one level
 * @param array - Source array
 * @returns Flattened array
 * @example
 * flatten([[1, 2], [3, 4]]) // [1, 2, 3, 4]
 */
export function flatten(array) {
    return array.reduce((acc, val) => {
        return acc.concat(val);
    }, []);
}
/**
 * Deeply flattens nested arrays
 * @param array - Source array
 * @param depth - Maximum depth (default: Infinity)
 * @returns Flattened array
 * @example
 * flattenDeep([[1, [2, [3, [4]]]]) // [1, 2, 3, 4]
 */
export function flattenDeep(array, depth = Infinity) {
    if (depth < 1) {
        return array.slice();
    }
    return array.reduce((acc, val) => {
        if (Array.isArray(val)) {
            acc.push(...flattenDeep(val, depth - 1));
        }
        else {
            acc.push(val);
        }
        return acc;
    }, []);
}
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
export function unique(array, selector) {
    if (!Array.isArray(array)) {
        return [];
    }
    if (!selector) {
        return [...new Set(array)];
    }
    const seen = new Set();
    return array.filter((item) => {
        const value = typeof selector === 'function'
            ? selector(item)
            : isObject(item)
                ? get(item, selector)
                : item;
        if (seen.has(value)) {
            return false;
        }
        seen.add(value);
        return true;
    });
}
/**
 * Groups array elements by key or callback
 * @param array - Source array
 * @param keyOrFn - Key name or grouping function
 * @returns Grouped object
 * @example
 * groupBy([{type: 'a', v: 1}, {type: 'b', v: 2}, {type: 'a', v: 3}], 'type')
 * // {a: [{type: 'a', v: 1}, {type: 'a', v: 3}], b: [{type: 'b', v: 2}]}
 */
export function groupBy(array, keyOrFn) {
    if (!Array.isArray(array)) {
        return {};
    }
    return array.reduce((acc, item) => {
        let key;
        if (typeof keyOrFn === 'function') {
            key = String(keyOrFn(item));
        }
        else {
            key = String(isObject(item) ? get(item, keyOrFn) : item);
        }
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(item);
        return acc;
    }, {});
}
/**
 * Counts occurrences of each value
 * @param array - Source array
 * @param key - Optional key for object arrays
 * @returns Count object
 * @example
 * countBy(['a', 'b', 'a', 'c']) // {a: 2, b: 1, c: 1}
 */
export function countBy(array, key) {
    if (!Array.isArray(array)) {
        return {};
    }
    return array.reduce((acc, item) => {
        let countKey;
        if (typeof key === 'function') {
            countKey = String(key(item));
        }
        else if (key) {
            countKey = String(isObject(item) ? get(item, key) : item);
        }
        else {
            countKey = String(item);
        }
        acc[countKey] = (acc[countKey] || 0) + 1;
        return acc;
    }, {});
}
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
export function keyBy(array, keyFn, valueFn) {
    if (!Array.isArray(array)) {
        return {};
    }
    return array.reduce((acc, item) => {
        let key;
        if (typeof keyFn === 'function') {
            key = String(keyFn(item));
        }
        else {
            key = String(isObject(item) ? get(item, keyFn) : item);
        }
        let value;
        if (valueFn) {
            if (typeof valueFn === 'function') {
                value = valueFn(item);
            }
            else {
                value = get(item, valueFn);
            }
        }
        else {
            value = item;
        }
        acc[key] = value;
        return acc;
    }, {});
}
/**
 * Sorts array by key or multiple keys
 * @param array - Source array
 * @param keys - Sort key(s) with optional direction
 * @returns Sorted array (new array)
 * @example
 * sortBy([{a: 3}, {a: 1}, {a: 2}], 'a') // [{a: 1}, {a: 2}, {a: 3}]
 * sortBy([{a: 1, b: 3}, {a: 1, b: 1}], ['a', {key: 'b', dir: 'desc'}])
 */
export function sortBy(array, keys) {
    if (!Array.isArray(array) || array.length === 0) {
        return [];
    }
    const sorted = [...array];
    const keysArray = Array.isArray(keys) ? keys : [keys];
    const normalizedKeys = keysArray.map((k) => {
        if (typeof k === 'object' && 'key' in k) {
            return { key: k.key, dir: k.dir || 'asc' };
        }
        return { key: k, dir: 'asc' };
    });
    sorted.sort((a, b) => {
        for (const { key, dir } of normalizedKeys) {
            const aVal = isObject(a) ? get(a, key) : a;
            const bVal = isObject(b) ? get(b, key) : b;
            if (aVal === bVal)
                continue;
            const comparison = aVal < bVal ? -1 : 1;
            return dir === 'asc' ? comparison : -comparison;
        }
        return 0;
    });
    return sorted;
}
/**
 * Finds difference between two arrays
 * @param array1 - First array
 * @param array2 - Second array
 * @param key - Optional key for object comparison
 * @returns Elements in array1 not in array2
 * @example
 * difference([1, 2, 3], [2, 3, 4]) // [1]
 */
export function difference(array1, array2, key) {
    if (!Array.isArray(array1))
        return [];
    if (!Array.isArray(array2))
        return array1;
    if (!key) {
        const set2 = new Set(array2);
        return array1.filter((item) => !set2.has(item));
    }
    const values2 = new Set(array2.map((item) => isObject(item) ? get(item, key) : item));
    return array1.filter((item) => {
        const value = isObject(item) ? get(item, key) : item;
        return !values2.has(value);
    });
}
/**
 * Finds intersection of two arrays
 * @param array1 - First array
 * @param array2 - Second array
 * @param key - Optional key for object comparison
 * @returns Common elements
 * @example
 * intersection([1, 2, 3], [2, 3, 4]) // [2, 3]
 */
export function intersection(array1, array2, key) {
    if (!Array.isArray(array1) || !Array.isArray(array2)) {
        return [];
    }
    if (!key) {
        const set2 = new Set(array2);
        return array1.filter((item) => set2.has(item));
    }
    const values2 = new Set(array2.map((item) => isObject(item) ? get(item, key) : item));
    return array1.filter((item) => {
        const value = isObject(item) ? get(item, key) : item;
        return values2.has(value);
    });
}
/**
 * Finds union of two arrays (unique elements from both)
 * @param array1 - First array
 * @param array2 - Second array
 * @param key - Optional key for object comparison
 * @returns Union of arrays
 * @example
 * union([1, 2], [2, 3]) // [1, 2, 3]
 */
export function union(array1, array2, key) {
    if (!Array.isArray(array1) && !Array.isArray(array2)) {
        return [];
    }
    if (!Array.isArray(array1))
        return unique(array2, key);
    if (!Array.isArray(array2))
        return unique(array1, key);
    return unique([...array1, ...array2], key);
}
/**
 * Partitions array into two groups based on predicate
 * @param array - Source array
 * @param predicate - Test function
 * @returns [truthy, falsy]
 * @example
 * partition([1, 2, 3, 4], x => x % 2 === 0) // [[2, 4], [1, 3]]
 */
export function partition(array, predicate) {
    if (!Array.isArray(array)) {
        return [[], []];
    }
    return array.reduce((acc, item, index) => {
        acc[predicate(item, index) ? 0 : 1].push(item);
        return acc;
    }, [[], []]);
}
/**
 * Takes first n elements from array
 * @param array - Source array
 * @param n - Number of elements
 * @returns First n elements
 * @example
 * take([1, 2, 3, 4], 2) // [1, 2]
 */
export function take(array, n) {
    if (!Array.isArray(array) || n <= 0) {
        return [];
    }
    return array.slice(0, n);
}
/**
 * Takes last n elements from array
 * @param array - Source array
 * @param n - Number of elements
 * @returns Last n elements
 * @example
 * takeLast([1, 2, 3, 4], 2) // [3, 4]
 */
export function takeLast(array, n) {
    if (!Array.isArray(array) || n <= 0) {
        return [];
    }
    return array.slice(-n);
}
/**
 * Takes elements while predicate is true
 * @param array - Source array
 * @param predicate - Test function
 * @returns Elements taken
 * @example
 * takeWhile([1, 2, 3, 4], x => x < 3) // [1, 2]
 */
export function takeWhile(array, predicate) {
    if (!Array.isArray(array)) {
        return [];
    }
    const result = [];
    for (let i = 0; i < array.length; i++) {
        if (!predicate(array[i], i))
            break;
        result.push(array[i]);
    }
    return result;
}
/**
 * Drops first n elements from array
 * @param array - Source array
 * @param n - Number of elements to drop
 * @returns Remaining elements
 * @example
 * drop([1, 2, 3, 4], 2) // [3, 4]
 */
export function drop(array, n) {
    if (!Array.isArray(array) || n <= 0) {
        return array ? [...array] : [];
    }
    return array.slice(n);
}
/**
 * Drops elements while predicate is true
 * @param array - Source array
 * @param predicate - Test function
 * @returns Remaining elements
 * @example
 * dropWhile([1, 2, 3, 4], x => x < 3) // [3, 4]
 */
export function dropWhile(array, predicate) {
    if (!Array.isArray(array)) {
        return [];
    }
    let index = 0;
    while (index < array.length && predicate(array[index], index)) {
        index++;
    }
    return array.slice(index);
}
/**
 * Compacts array by removing falsy values
 * @param array - Source array
 * @returns Array without falsy values
 * @example
 * compact([0, 1, false, 2, '', 3, null]) // [1, 2, 3]
 */
export function compact(array) {
    if (!Array.isArray(array)) {
        return [];
    }
    return array.filter(Boolean);
}
/**
 * Zips multiple arrays together
 * @param arrays - Arrays to zip
 * @returns Zipped array
 * @example
 * zip([1, 2], ['a', 'b'], [true, false]) // [[1, 'a', true], [2, 'b', false]]
 */
export function zip(...arrays) {
    if (arrays.length === 0)
        return [];
    const maxLength = Math.max(...arrays.map((arr) => (Array.isArray(arr) ? arr.length : 0)));
    const result = [];
    for (let i = 0; i < maxLength; i++) {
        const tuple = [];
        for (const array of arrays) {
            tuple.push(Array.isArray(array) ? array[i] : undefined);
        }
        result.push(tuple);
    }
    return result;
}
/**
 * Unzips array of arrays
 * @param array - Array to unzip
 * @returns Unzipped arrays
 * @example
 * unzip([[1, 'a'], [2, 'b']]) // [[1, 2], ['a', 'b']]
 */
export function unzip(array) {
    if (!Array.isArray(array) || array.length === 0) {
        return [];
    }
    const maxLength = Math.max(...array.map((arr) => (Array.isArray(arr) ? arr.length : 0)));
    const result = [];
    for (let i = 0; i < maxLength; i++) {
        const tuple = [];
        for (const arr of array) {
            if (Array.isArray(arr)) {
                tuple.push(arr[i]);
            }
        }
        result.push(tuple);
    }
    return result;
}
/**
 * Shuffles array randomly
 * @param array - Source array
 * @returns Shuffled array (new array)
 * @example
 * shuffle([1, 2, 3, 4, 5])
 */
export function shuffle(array) {
    if (!Array.isArray(array)) {
        return [];
    }
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}
/**
 * Gets random element from array
 * @param array - Source array
 * @returns Random element
 * @example
 * sample([1, 2, 3, 4, 5]) // Random element
 */
export function sample(array) {
    if (!Array.isArray(array) || array.length === 0) {
        return undefined;
    }
    return array[Math.floor(Math.random() * array.length)];
}
/**
 * Gets n random elements from array
 * @param array - Source array
 * @param n - Number of elements
 * @returns Random elements
 * @example
 * sampleSize([1, 2, 3, 4, 5], 3) // 3 random elements
 */
export function sampleSize(array, n) {
    if (!Array.isArray(array) || n <= 0) {
        return [];
    }
    const shuffled = shuffle(array);
    return shuffled.slice(0, Math.min(n, array.length));
}
/**
 * Finds index of element using predicate
 * @param array - Source array
 * @param predicate - Search function
 * @param fromIndex - Start index
 * @returns Index or -1
 * @example
 * findIndex([1, 2, 3, 4], x => x > 2) // 2
 */
export function findIndex(array, predicate, fromIndex = 0) {
    if (!Array.isArray(array)) {
        return -1;
    }
    for (let i = fromIndex; i < array.length; i++) {
        if (predicate(array[i], i)) {
            return i;
        }
    }
    return -1;
}
/**
 * Finds last index of element using predicate
 * @param array - Source array
 * @param predicate - Search function
 * @param fromIndex - Start index (from end)
 * @returns Index or -1
 * @example
 * findLastIndex([1, 2, 3, 4, 3], x => x === 3) // 4
 */
export function findLastIndex(array, predicate, fromIndex) {
    if (!Array.isArray(array)) {
        return -1;
    }
    const startIndex = fromIndex !== undefined ? fromIndex : array.length - 1;
    for (let i = startIndex; i >= 0; i--) {
        if (predicate(array[i], i)) {
            return i;
        }
    }
    return -1;
}
/**
 * Creates array of values at given paths
 * @param array - Source array of objects
 * @param path - Property path
 * @returns Array of values
 * @example
 * pluck([{a: {b: 1}}, {a: {b: 2}}], 'a.b') // [1, 2]
 */
export function pluck(array, path) {
    if (!Array.isArray(array)) {
        return [];
    }
    return array.map((item) => get(item, path));
}
/**
 * Extracts object properties from array
 * @param array - Source array of objects
 * @param keys - Keys to pick
 * @returns Array of objects with picked keys
 * @example
 * pick([{a: 1, b: 2}, {a: 3, b: 4}], ['a']) // [{a: 1}, {a: 3}]
 */
export function pick(array, keys) {
    if (!Array.isArray(array) || !Array.isArray(keys)) {
        return [];
    }
    return array.map((item) => {
        const result = {};
        for (const key of keys) {
            if (key in item) {
                result[key] = item[key];
            }
        }
        return result;
    });
}
/**
 * Omits object properties from array
 * @param array - Source array of objects
 * @param keys - Keys to omit
 * @returns Array of objects without omitted keys
 * @example
 * omit([{a: 1, b: 2}, {a: 3, b: 4}], ['b']) // [{a: 1}, {a: 3}]
 */
export function omit(array, keys) {
    if (!Array.isArray(array) || !Array.isArray(keys)) {
        return [];
    }
    return array.map((item) => {
        const result = { ...item };
        for (const key of keys) {
            delete result[key];
        }
        return result;
    });
}
/**
 * Maps and flattens array in one operation
 * @param array - Source array
 * @param callback - Mapping function
 * @returns Flattened mapped array
 * @example
 * flatMap([1, 2, 3], x => [x, x * 2]) // [1, 2, 2, 4, 3, 6]
 */
export function flatMap(array, callback) {
    if (!Array.isArray(array)) {
        return [];
    }
    return array.reduce((acc, item, index) => {
        const result = callback(item, index);
        return acc.concat(result);
    }, []);
}
/**
 * Reduces array from right to left
 * @param array - Source array
 * @param callback - Reducer function
 * @param initialValue - Initial value
 * @returns Reduced value
 * @example
 * reduceRight([1, 2, 3], (acc, val) => acc + val, 0) // 6
 */
export function reduceRight(array, callback, initialValue) {
    if (!Array.isArray(array)) {
        return initialValue;
    }
    let accumulator = initialValue;
    for (let i = array.length - 1; i >= 0; i--) {
        accumulator = callback(accumulator, array[i], i);
    }
    return accumulator;
}
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
export function range(start, end, step = 1) {
    if (step === 0) {
        return [];
    }
    const result = [];
    if (step > 0) {
        for (let i = start; i < end; i += step) {
            result.push(i);
        }
    }
    else {
        for (let i = start; i > end; i += step) {
            result.push(i);
        }
    }
    return result;
}
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
export function fill(array, value, start = 0, end) {
    if (!Array.isArray(array)) {
        return [];
    }
    const result = [...array];
    const actualEnd = end === undefined ? result.length : end;
    for (let i = start; i < actualEnd && i < result.length; i++) {
        result[i] = value;
    }
    return result;
}
/**
 * Deeply clones array (including nested objects)
 * @param array - Source array
 * @returns Cloned array
 * @example
 * deepCloneArray([{a: 1}, {b: 2}])
 */
export function deepCloneArray(array) {
    if (!Array.isArray(array)) {
        return [];
    }
    return deepClone(array);
}
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
export function mergeByKey(arr1, arr2, ...keyOrMore) {
    // Determine the key and arrays
    let key;
    let arrays;
    if (typeof arr2 === 'string') {
        // Form: mergeByKey([arr], 'key')
        key = arr2;
        arrays = [arr1];
    }
    else {
        // Form: mergeByKey(arr1, arr2, 'key') or mergeByKey(arr1, arr2, arr3, 'key')
        const lastArg = keyOrMore[keyOrMore.length - 1];
        if (typeof lastArg === 'string') {
            key = lastArg;
            arrays = [
                arr1,
                arr2,
                ...keyOrMore.slice(0, -1).filter(Array.isArray),
            ];
        }
        else {
            // No key provided, default to 'id'
            key = 'id';
            arrays = [arr1, arr2, ...keyOrMore.filter(Array.isArray)];
        }
    }
    if (arrays.length === 0) {
        return [];
    }
    const map = new Map();
    for (const array of arrays) {
        if (Array.isArray(array)) {
            for (const item of array) {
                const keyValue = isObject(item)
                    ? get(item, key)
                    : undefined;
                if (keyValue !== undefined) {
                    const existing = map.get(keyValue);
                    map.set(keyValue, existing ? { ...existing, ...item } : item);
                }
            }
        }
    }
    return Array.from(map.values());
}
/**
 * Moves array element from one index to another
 * @param array - Source array
 * @param fromIndex - Source index
 * @param toIndex - Destination index
 * @returns New array with moved element
 * @example
 * move([1, 2, 3, 4], 0, 2) // [2, 3, 1, 4]
 */
export function move(array, fromIndex, toIndex) {
    if (!Array.isArray(array) || fromIndex === toIndex) {
        return array ? [...array] : [];
    }
    const result = [...array];
    const [removed] = result.splice(fromIndex, 1);
    result.splice(toIndex, 0, removed);
    return result;
}
/**
 * Rotates array elements
 * @param array - Source array
 * @param n - Number of positions (positive = right, negative = left)
 * @returns Rotated array
 * @example
 * rotate([1, 2, 3, 4], 1) // [4, 1, 2, 3]
 * rotate([1, 2, 3, 4], -1) // [2, 3, 4, 1]
 */
export function rotate(array, n) {
    if (!Array.isArray(array) || array.length === 0 || n === 0) {
        return array ? [...array] : [];
    }
    const len = array.length;
    const rotations = ((n % len) + len) % len;
    return [...array.slice(-rotations), ...array.slice(0, -rotations)];
}
/**
 * Inserts element at index
 * @param array - Source array
 * @param index - Insert index
 * @param items - Items to insert
 * @returns New array
 * @example
 * insert([1, 2, 4], 2, 3) // [1, 2, 3, 4]
 */
export function insert(array, index, ...items) {
    if (!Array.isArray(array)) {
        return items;
    }
    const result = [...array];
    result.splice(index, 0, ...items);
    return result;
}
/**
 * Removes element at index
 * @param array - Source array
 * @param index - Remove index
 * @param count - Number of elements to remove
 * @returns New array
 * @example
 * remove([1, 2, 3, 4], 1, 2) // [1, 4]
 */
export function remove(array, index, count = 1) {
    if (!Array.isArray(array)) {
        return [];
    }
    const result = [...array];
    result.splice(index, count);
    return result;
}
/**
 * Replaces element at index
 * @param array - Source array
 * @param index - Replace index
 * @param item - New item
 * @returns New array
 * @example
 * replace([1, 2, 3], 1, 5) // [1, 5, 3]
 */
export function replace(array, index, item) {
    if (!Array.isArray(array)) {
        return [];
    }
    const result = [...array];
    result[index] = item;
    return result;
}
/**
 * Filters array and removes null/undefined
 * @param array - Source array
 * @param predicate - Filter function
 * @returns Filtered array without null/undefined
 * @example
 * filterCompact([1, null, 2, undefined, 3], x => x) // [1, 2, 3]
 */
export function filterCompact(array, predicate) {
    if (!Array.isArray(array)) {
        return [];
    }
    const filtered = array.filter((item) => item != null);
    return predicate ? filtered.filter(predicate) : filtered;
}
/**
 * Creates cartesian product of arrays
 * @param arrays - Arrays to combine
 * @returns Cartesian product
 * @example
 * cartesian([1, 2], ['a', 'b']) // [[1, 'a'], [1, 'b'], [2, 'a'], [2, 'b']]
 */
export function cartesian(...arrays) {
    if (arrays.length === 0)
        return [[]];
    if (arrays.length === 1)
        return arrays[0].map((item) => [item]);
    return arrays.reduce((acc, array) => {
        return acc.flatMap((x) => array.map((y) => [...x, y]));
    }, [[]]);
}
/**
 * Finds all indices where predicate is true
 * @param array - Source array
 * @param predicate - Test function
 * @returns Array of indices
 * @example
 * findAllIndices([1, 2, 3, 2, 1], x => x === 2) // [1, 3]
 */
export function findAllIndices(array, predicate) {
    if (!Array.isArray(array)) {
        return [];
    }
    const indices = [];
    for (let i = 0; i < array.length; i++) {
        if (predicate(array[i], i)) {
            indices.push(i);
        }
    }
    return indices;
}
/**
 * Checks if arrays are equal
 * @param array1 - First array
 * @param array2 - Second array
 * @param deep - Deep comparison
 * @returns True if equal
 * @example
 * isEqual([1, 2, 3], [1, 2, 3]) // true
 */
export function isEqual(array1, array2, deep = true) {
    if (!Array.isArray(array1) || !Array.isArray(array2)) {
        return false;
    }
    if (array1.length !== array2.length) {
        return false;
    }
    for (let i = 0; i < array1.length; i++) {
        if (deep && isObject(array1[i]) && isObject(array2[i])) {
            // Deep comparison using JSON (simple approach)
            if (JSON.stringify(array1[i]) !== JSON.stringify(array2[i])) {
                return false;
            }
        }
        else if (array1[i] !== array2[i]) {
            return false;
        }
    }
    return true;
}
/**
 * Splits array into chunks where predicate changes
 * @param array - Source array
 * @param predicate - Grouping function
 * @returns Chunked array
 * @example
 * chunkBy([1, 1, 2, 2, 3], x => x) // [[1, 1], [2, 2], [3]]
 */
export function chunkBy(array, predicate) {
    if (!Array.isArray(array) || array.length === 0) {
        return [];
    }
    const result = [];
    let currentChunk = [array[0]];
    let currentKey = predicate(array[0], 0);
    for (let i = 1; i < array.length; i++) {
        const key = predicate(array[i], i);
        if (key === currentKey) {
            currentChunk.push(array[i]);
        }
        else {
            result.push(currentChunk);
            currentChunk = [array[i]];
            currentKey = key;
        }
    }
    result.push(currentChunk);
    return result;
}
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
export function updateBy(array, predicate, updates, updatesOrUndefined) {
    if (!Array.isArray(array)) {
        return [];
    }
    // Determine if we're using predicate form or key/value form
    const isPredicate = typeof predicate === 'function';
    const actualUpdates = isPredicate ? updates : updatesOrUndefined;
    return array.map((item) => {
        let shouldUpdate = false;
        if (isPredicate) {
            shouldUpdate = predicate(item);
        }
        else {
            const itemValue = isObject(item)
                ? get(item, predicate)
                : item;
            shouldUpdate = itemValue === updates;
        }
        if (shouldUpdate) {
            return { ...item, ...actualUpdates };
        }
        return item;
    });
}
/**
 * Removes duplicates and returns removed items
 * @param array - Source array
 * @param key - Optional key for objects
 * @returns Object with unique and duplicates arrays
 * @example
 * splitDuplicates([1, 2, 2, 3, 3]) // { unique: [1, 2, 3], duplicates: [2, 3] }
 */
export function splitDuplicates(array, key) {
    if (!Array.isArray(array)) {
        return { unique: [], duplicates: [] };
    }
    const seen = new Set();
    const unique = [];
    const duplicates = [];
    for (const item of array) {
        const value = key && isObject(item) ? get(item, key) : item;
        if (seen.has(value)) {
            duplicates.push(item);
        }
        else {
            seen.add(value);
            unique.push(item);
        }
    }
    return { unique, duplicates };
}
/**
 * Ensures array (converts non-array to array)
 * @param value - Value to ensure as array
 * @returns Array
 * @example
 * ensureArray(1) // [1]
 * ensureArray([1, 2]) // [1, 2]
 */
export function ensureArray(value) {
    if (Array.isArray(value)) {
        return value;
    }
    return value === undefined || value === null ? [] : [value];
}
/**
 * Wraps value in array if not already an array
 * @param value - Value to wrap
 * @returns Array
 * @example
 * wrap(1) // [1]
 * wrap([1]) // [1]
 */
export function wrap(value) {
    return ensureArray(value);
}
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
export function slidingWindow(array, size, step = 1) {
    if (!Array.isArray(array) || size < 1 || step < 1) {
        return [];
    }
    const windows = [];
    for (let i = 0; i <= array.length - size; i += step) {
        windows.push(array.slice(i, i + size));
    }
    return windows;
}
/**
 * Finds the minimum value in an array by comparing a key/selector
 * @param array - Source array
 * @param selector - Key path or selector function
 * @returns Element with minimum value, or undefined if array is empty
 * @example
 * minBy([{ age: 30 }, { age: 20 }], 'age') // { age: 20 }
 * minBy([{ price: 100 }, { price: 50 }], obj => obj.price) // { price: 50 }
 */
export function minBy(array, selector) {
    if (!Array.isArray(array) || array.length === 0) {
        return undefined;
    }
    let minItem = array[0];
    let minValue = typeof selector === 'function'
        ? selector(minItem)
        : get(minItem, selector);
    for (let i = 1; i < array.length; i++) {
        const item = array[i];
        const value = typeof selector === 'function'
            ? selector(item)
            : get(item, selector);
        if (value < minValue) {
            minValue = value;
            minItem = item;
        }
    }
    return minItem;
}
/**
 * Finds the maximum value in an array by comparing a key/selector
 * @param array - Source array
 * @param selector - Key path or selector function
 * @returns Element with maximum value, or undefined if array is empty
 * @example
 * maxBy([{ age: 30 }, { age: 20 }], 'age') // { age: 30 }
 * maxBy([{ price: 100 }, { price: 50 }], obj => obj.price) // { price: 100 }
 */
export function maxBy(array, selector) {
    if (!Array.isArray(array) || array.length === 0) {
        return undefined;
    }
    let maxItem = array[0];
    let maxValue = typeof selector === 'function'
        ? selector(maxItem)
        : get(maxItem, selector);
    for (let i = 1; i < array.length; i++) {
        const item = array[i];
        const value = typeof selector === 'function'
            ? selector(item)
            : get(item, selector);
        if (value > maxValue) {
            maxValue = value;
            maxItem = item;
        }
    }
    return maxItem;
}
/**
 * Calculates sum of values in array by key/selector
 * @param array - Source array
 * @param selector - Key path or selector function
 * @returns Sum of values
 * @example
 * sumBy([{ price: 10 }, { price: 20 }], 'price') // 30
 * sumBy([{ x: 5 }, { x: 10 }], obj => obj.x) // 15
 */
export function sumBy(array, selector) {
    if (!Array.isArray(array) || array.length === 0) {
        return 0;
    }
    let sum = 0;
    for (const item of array) {
        const value = typeof selector === 'function'
            ? selector(item)
            : get(item, selector);
        if (typeof value === 'number' && !isNaN(value)) {
            sum += value;
        }
    }
    return sum;
}
/**
 * Calculates average of values in array by key/selector
 * @param array - Source array
 * @param selector - Key path or selector function
 * @returns Average of values, or 0 if array is empty
 * @example
 * avgBy([{ score: 80 }, { score: 90 }], 'score') // 85
 * avgBy([{ x: 10 }, { x: 20 }], obj => obj.x) // 15
 */
export function avgBy(array, selector) {
    if (!Array.isArray(array) || array.length === 0) {
        return 0;
    }
    const sum = sumBy(array, selector);
    return sum / array.length;
}
/**
 * Counts frequency of each unique value in array
 * @param array - Source array
 * @returns Map of value to frequency count
 * @example
 * frequencies([1, 2, 2, 3, 3, 3]) // Map { 1 => 1, 2 => 2, 3 => 3 }
 * frequencies(['a', 'b', 'a']) // Map { 'a' => 2, 'b' => 1 }
 */
export function frequencies(array) {
    const freqMap = new Map();
    if (!Array.isArray(array)) {
        return freqMap;
    }
    for (const item of array) {
        freqMap.set(item, (freqMap.get(item) || 0) + 1);
    }
    return freqMap;
}
/**
 * Finds the most common value(s) in array
 * @param array - Source array
 * @param limit - Maximum number of values to return (default: 1)
 * @returns Array of most common values
 * @example
 * mostCommon([1, 2, 2, 3, 3, 3]) // [3]
 * mostCommon([1, 1, 2, 2, 3], 2) // [1, 2] or [2, 1]
 */
export function mostCommon(array, limit = 1) {
    if (!Array.isArray(array) || array.length === 0 || limit < 1) {
        return [];
    }
    const freqMap = frequencies(array);
    const sorted = Array.from(freqMap.entries()).sort((a, b) => b[1] - a[1]);
    return sorted.slice(0, limit).map(([value]) => value);
}
/**
 * Finds the least common value(s) in array
 * @param array - Source array
 * @param limit - Maximum number of values to return (default: 1)
 * @returns Array of least common values
 * @example
 * leastCommon([1, 2, 2, 3, 3, 3]) // [1]
 * leastCommon([1, 1, 2, 2, 3, 3], 3) // [1, 2, 3] or any order
 */
export function leastCommon(array, limit = 1) {
    if (!Array.isArray(array) || array.length === 0 || limit < 1) {
        return [];
    }
    const freqMap = frequencies(array);
    const sorted = Array.from(freqMap.entries()).sort((a, b) => a[1] - b[1]);
    return sorted.slice(0, limit).map(([value]) => value);
}
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
export async function batchProcess(array, batchSize, callback) {
    if (!Array.isArray(array) || batchSize < 1) {
        return;
    }
    const batches = chunk(array, batchSize);
    for (let i = 0; i < batches.length; i++) {
        await callback(batches[i], i);
    }
}
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
export async function batchProcessParallel(array, batchSize, concurrency, callback) {
    if (!Array.isArray(array) || batchSize < 1 || concurrency < 1) {
        return;
    }
    const batches = chunk(array, batchSize);
    const batchChunks = chunk(batches.map((batch, index) => ({ batch, index })), concurrency);
    for (const batchChunk of batchChunks) {
        await Promise.all(batchChunk.map(({ batch, index }) => callback(batch, index)));
    }
}
/**
 * Transposes a 2D array (rows become columns, columns become rows)
 * @param matrix - 2D array to transpose
 * @returns Transposed 2D array
 * @example
 * transpose([[1, 2], [3, 4], [5, 6]]) // [[1, 3, 5], [2, 4, 6]]
 */
export function transpose(matrix) {
    if (!Array.isArray(matrix) || matrix.length === 0) {
        return [];
    }
    const maxLength = Math.max(...matrix.map((row) => row.length));
    const result = [];
    for (let col = 0; col < maxLength; col++) {
        const column = [];
        for (let row = 0; row < matrix.length; row++) {
            if (col < matrix[row].length) {
                column.push(matrix[row][col]);
            }
        }
        result.push(column);
    }
    return result;
}
/**
 * Checks if two arrays are equal (shallow comparison)
 * @param array1 - First array
 * @param array2 - Second array
 * @returns True if arrays are equal
 * @example
 * isArrayEqual([1, 2, 3], [1, 2, 3]) // true
 * isArrayEqual([1, 2], [1, 2, 3]) // false
 */
export function isArrayEqual(array1, array2) {
    if (!Array.isArray(array1) || !Array.isArray(array2)) {
        return false;
    }
    if (array1.length !== array2.length) {
        return false;
    }
    for (let i = 0; i < array1.length; i++) {
        if (array1[i] !== array2[i]) {
            return false;
        }
    }
    return true;
}
/**
 * Checks if two arrays contain the same elements (order doesn't matter)
 * @param array1 - First array
 * @param array2 - Second array
 * @returns True if arrays contain same elements
 * @example
 * hasSameElements([1, 2, 3], [3, 2, 1]) // true
 * hasSameElements([1, 2], [1, 2, 2]) // false
 */
export function hasSameElements(array1, array2) {
    if (!Array.isArray(array1) || !Array.isArray(array2)) {
        return false;
    }
    if (array1.length !== array2.length) {
        return false;
    }
    const freq1 = frequencies(array1);
    const freq2 = frequencies(array2);
    if (freq1.size !== freq2.size) {
        return false;
    }
    for (const [key, count] of freq1) {
        if (freq2.get(key) !== count) {
            return false;
        }
    }
    return true;
}
/**
 * Checks if array1 is a subset of array2 (all elements in array1 exist in array2)
 * @param array1 - Subset array
 * @param array2 - Superset array
 * @returns True if array1 is a subset of array2
 * @example
 * isSubset([1, 2], [1, 2, 3, 4]) // true
 * isSubset([1, 5], [1, 2, 3, 4]) // false
 */
export function isSubset(array1, array2) {
    if (!Array.isArray(array1) || !Array.isArray(array2)) {
        return false;
    }
    const set2 = new Set(array2);
    return array1.every((item) => set2.has(item));
}
/**
 * Checks if array1 is a superset of array2 (all elements in array2 exist in array1)
 * @param array1 - Superset array
 * @param array2 - Subset array
 * @returns True if array1 is a superset of array2
 * @example
 * isSuperset([1, 2, 3, 4], [1, 2]) // true
 * isSuperset([1, 2, 3], [1, 5]) // false
 */
export function isSuperset(array1, array2) {
    return isSubset(array2, array1);
}
/**
 * Interleaves multiple arrays (takes one element from each in turn)
 * @param arrays - Arrays to interleave
 * @returns Interleaved array
 * @example
 * interleave([1, 2], ['a', 'b'], [true, false]) // [1, 'a', true, 2, 'b', false]
 */
export function interleave(...arrays) {
    if (arrays.length === 0) {
        return [];
    }
    const maxLength = Math.max(...arrays.map((arr) => arr.length));
    const result = [];
    for (let i = 0; i < maxLength; i++) {
        for (const arr of arrays) {
            if (i < arr.length) {
                result.push(arr[i]);
            }
        }
    }
    return result;
}
/**
 * Splits array into two arrays based on a predicate
 * Similar to partition but returns object with named properties
 * @param array - Source array
 * @param predicate - Function to test each element
 * @returns Object with 'pass' and 'fail' arrays
 * @example
 * bifurcate([1, 2, 3, 4], x => x % 2 === 0) // { pass: [2, 4], fail: [1, 3] }
 */
export function bifurcate(array, predicate) {
    const pass = [];
    const fail = [];
    if (!Array.isArray(array)) {
        return { pass, fail };
    }
    for (let i = 0; i < array.length; i++) {
        if (predicate(array[i], i)) {
            pass.push(array[i]);
        }
        else {
            fail.push(array[i]);
        }
    }
    return { pass, fail };
}
/**
 * Creates an array with a specified length filled with values from a generator function
 * @param length - Length of array
 * @param generator - Function that generates value for each index
 * @returns Generated array
 * @example
 * generate(5, i => i * 2) // [0, 2, 4, 6, 8]
 * generate(3, () => Math.random()) // [0.123, 0.456, 0.789]
 */
export function generate(length, generator) {
    if (length < 0) {
        return [];
    }
    const result = [];
    for (let i = 0; i < length; i++) {
        result.push(generator(i));
    }
    return result;
}
/**
 * Repeats an array n times
 * @param array - Source array
 * @param times - Number of times to repeat
 * @returns New array with repeated elements
 * @example
 * repeat([1, 2], 3) // [1, 2, 1, 2, 1, 2]
 */
export function repeat(array, times) {
    if (!Array.isArray(array) || times < 0) {
        return [];
    }
    const result = [];
    for (let i = 0; i < times; i++) {
        result.push(...array);
    }
    return result;
}
/**
 * Finds the median value in a numeric array
 * @param array - Array of numbers
 * @returns Median value, or undefined if array is empty
 * @example
 * median([1, 2, 3, 4, 5]) // 3
 * median([1, 2, 3, 4]) // 2.5
 */
export function median(array) {
    if (!Array.isArray(array) || array.length === 0) {
        return undefined;
    }
    const sorted = [...array].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
}
/**
 * Calculates the mode (most frequent value) in an array
 * @param array - Source array
 * @returns Most frequent value, or undefined if array is empty
 * @example
 * mode([1, 2, 2, 3, 3, 3]) // 3
 * mode(['a', 'b', 'b']) // 'b'
 */
export function mode(array) {
    const common = mostCommon(array, 1);
    return common.length > 0 ? common[0] : undefined;
}
/**
 * Removes all occurrences of specified values from array
 * @param array - Source array
 * @param values - Values to remove
 * @returns New array without specified values
 * @example
 * without([1, 2, 3, 2, 4], 2, 3) // [1, 4]
 */
export function without(array, ...values) {
    if (!Array.isArray(array)) {
        return [];
    }
    const excludeSet = new Set(values);
    return array.filter((item) => !excludeSet.has(item));
}
/**
 * Creates array of unique values that are in the first array but not in other arrays
 * @param array - Source array
 * @param others - Arrays to exclude
 * @returns Array with values only in first array
 * @example
 * differenceWith([1, 2, 3], [2], [3]) // [1]
 */
export function differenceWith(array, ...others) {
    if (!Array.isArray(array)) {
        return [];
    }
    const excludeSet = new Set(others.flat());
    return array.filter((item) => !excludeSet.has(item));
}
/**
 * Groups consecutive identical values together
 * @param array - Source array
 * @returns Array of arrays with consecutive identical values
 * @example
 * groupConsecutive([1, 1, 2, 2, 2, 3, 1]) // [[1, 1], [2, 2, 2], [3], [1]]
 */
export function groupConsecutive(array) {
    if (!Array.isArray(array) || array.length === 0) {
        return [];
    }
    const result = [];
    let currentGroup = [array[0]];
    for (let i = 1; i < array.length; i++) {
        if (array[i] === array[i - 1]) {
            currentGroup.push(array[i]);
        }
        else {
            result.push(currentGroup);
            currentGroup = [array[i]];
        }
    }
    result.push(currentGroup);
    return result;
}
/**
 * Removes consecutive duplicate values
 * @param array - Source array
 * @returns Array without consecutive duplicates
 * @example
 * dedupeConsecutive([1, 1, 2, 2, 2, 3, 1]) // [1, 2, 3, 1]
 */
export function dedupeConsecutive(array) {
    if (!Array.isArray(array) || array.length === 0) {
        return [];
    }
    const result = [array[0]];
    for (let i = 1; i < array.length; i++) {
        if (array[i] !== array[i - 1]) {
            result.push(array[i]);
        }
    }
    return result;
}
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
export function rank(array, method = 'standard') {
    if (!Array.isArray(array) || array.length === 0) {
        return [];
    }
    const indexed = array.map((value, index) => ({ value, index }));
    indexed.sort((a, b) => a.value - b.value);
    const ranks = new Array(array.length);
    if (method === 'ordinal') {
        for (let i = 0; i < indexed.length; i++) {
            ranks[indexed[i].index] = i + 1;
        }
    }
    else if (method === 'dense') {
        let denseRank = 1;
        ranks[indexed[0].index] = denseRank;
        for (let i = 1; i < indexed.length; i++) {
            if (indexed[i].value !== indexed[i - 1].value) {
                denseRank++;
            }
            ranks[indexed[i].index] = denseRank;
        }
    }
    else {
        // standard
        let i = 0;
        while (i < indexed.length) {
            let j = i;
            // Find all elements with same value
            while (j < indexed.length && indexed[j].value === indexed[i].value) {
                j++;
            }
            // Assign average rank to all tied elements
            const rankValue = i + 1;
            for (let k = i; k < j; k++) {
                ranks[indexed[k].index] = rankValue;
            }
            i = j;
        }
    }
    return ranks;
}
/**
 * Calculates the percentile value from a sorted or unsorted array
 * @param array - Array of numbers
 * @param percentile - Percentile to calculate (0-100)
 * @returns Percentile value, or undefined if array is empty
 * @example
 * percentile([1, 2, 3, 4, 5], 50) // 3 (median)
 * percentile([1, 2, 3, 4, 5, 6], 75) // 4.75
 */
export function percentile(array, percentile) {
    if (!Array.isArray(array) || array.length === 0) {
        return undefined;
    }
    if (percentile < 0 || percentile > 100) {
        return undefined;
    }
    const sorted = [...array].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    if (lower === upper) {
        return sorted[lower];
    }
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}
/**
 * Calculates quartiles (Q1, Q2/median, Q3) of an array
 * @param array - Array of numbers
 * @returns Object with q1, q2 (median), q3, and iqr (interquartile range)
 * @example
 * quartiles([1, 2, 3, 4, 5]) // { q1: 1.5, q2: 3, q3: 4.5, iqr: 3 }
 */
export function quartiles(array) {
    if (!Array.isArray(array) || array.length === 0) {
        return undefined;
    }
    const q1 = percentile(array, 25);
    const q2 = percentile(array, 50);
    const q3 = percentile(array, 75);
    return {
        q1,
        q2,
        q3,
        iqr: q3 - q1,
    };
}
/**
 * Calculates standard deviation of numeric array
 * @param array - Array of numbers
 * @param sample - If true, calculates sample standard deviation (default: false for population)
 * @returns Standard deviation, or undefined if array is empty
 * @example
 * standardDeviation([2, 4, 4, 4, 5, 5, 7, 9]) // 2
 */
export function standardDeviation(array, sample = false) {
    if (!Array.isArray(array) || array.length === 0) {
        return undefined;
    }
    if (sample && array.length === 1) {
        return undefined;
    }
    const avg = array.reduce((sum, val) => sum + val, 0) / array.length;
    const squareDiffs = array.map((value) => Math.pow(value - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) /
        (sample ? array.length - 1 : array.length);
    return Math.sqrt(avgSquareDiff);
}
/**
 * Calculates variance of numeric array
 * @param array - Array of numbers
 * @param sample - If true, calculates sample variance (default: false for population)
 * @returns Variance, or undefined if array is empty
 * @example
 * variance([2, 4, 4, 4, 5, 5, 7, 9]) // 4
 */
export function variance(array, sample = false) {
    const std = standardDeviation(array, sample);
    return std !== undefined ? Math.pow(std, 2) : undefined;
}
/**
 * Normalizes array values to 0-1 range (min-max normalization)
 * @param array - Array of numbers
 * @returns Normalized array
 * @example
 * normalize([1, 2, 3, 4, 5]) // [0, 0.25, 0.5, 0.75, 1]
 */
export function normalize(array) {
    if (!Array.isArray(array) || array.length === 0) {
        return [];
    }
    const min = Math.min(...array);
    const max = Math.max(...array);
    const range = max - min;
    if (range === 0) {
        return array.map(() => 0);
    }
    return array.map((value) => (value - min) / range);
}
/**
 * Standardizes array values (z-score normalization)
 * @param array - Array of numbers
 * @returns Standardized array with mean 0 and standard deviation 1
 * @example
 * standardize([2, 4, 4, 4, 5, 5, 7, 9]) // [-1.5, -0.5, -0.5, -0.5, 0, 0, 1, 2]
 */
export function standardize(array) {
    if (!Array.isArray(array) || array.length === 0) {
        return [];
    }
    const avg = array.reduce((sum, val) => sum + val, 0) / array.length;
    const std = standardDeviation(array);
    if (std === undefined || std === 0) {
        return array.map(() => 0);
    }
    return array.map((value) => (value - avg) / std);
}
/**
 * Applies a function cumulatively to array elements (like reduce but returns all intermediate results)
 * @param array - Source array
 * @param fn - Accumulator function
 * @param initial - Initial value
 * @returns Array of cumulative results
 * @example
 * scan([1, 2, 3, 4], (acc, x) => acc + x, 0) // [1, 3, 6, 10]
 */
export function scan(array, fn, initial) {
    if (!Array.isArray(array)) {
        return [];
    }
    const result = [];
    let accumulator = initial;
    for (let i = 0; i < array.length; i++) {
        accumulator = fn(accumulator, array[i], i);
        result.push(accumulator);
    }
    return result;
}
/**
 * Creates cumulative sum array
 * @param array - Array of numbers
 * @returns Array of cumulative sums
 * @example
 * cumulativeSum([1, 2, 3, 4]) // [1, 3, 6, 10]
 */
export function cumulativeSum(array) {
    return scan(array, (acc, x) => acc + x, 0);
}
/**
 * Creates array of differences between consecutive elements
 * @param array - Array of numbers
 * @returns Array of differences
 * @example
 * diff([1, 3, 6, 10]) // [2, 3, 4]
 */
export function diff(array) {
    if (!Array.isArray(array) || array.length < 2) {
        return [];
    }
    const result = [];
    for (let i = 1; i < array.length; i++) {
        result.push(array[i] - array[i - 1]);
    }
    return result;
}
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
export function pad(array, length, value, position = 'end') {
    if (!Array.isArray(array) || length <= array.length) {
        return [...array];
    }
    const padding = new Array(length - array.length).fill(value);
    return position === 'start' ? [...padding, ...array] : [...array, ...padding];
}
/**
 * Trims array to remove elements from start and end that match predicate
 * @param array - Source array
 * @param predicate - Function to test elements to trim
 * @returns Trimmed array
 * @example
 * trim([0, 0, 1, 2, 3, 0, 0], x => x === 0) // [1, 2, 3]
 */
export function trim(array, predicate) {
    if (!Array.isArray(array) || array.length === 0) {
        return [];
    }
    let start = 0;
    let end = array.length - 1;
    while (start <= end && predicate(array[start])) {
        start++;
    }
    while (end >= start && predicate(array[end])) {
        end--;
    }
    return array.slice(start, end + 1);
}
/**
 * Creates pairs of adjacent elements
 * @param array - Source array
 * @returns Array of pairs
 * @example
 * pairwise([1, 2, 3, 4]) // [[1, 2], [2, 3], [3, 4]]
 */
export function pairwise(array) {
    if (!Array.isArray(array) || array.length < 2) {
        return [];
    }
    const result = [];
    for (let i = 0; i < array.length - 1; i++) {
        result.push([array[i], array[i + 1]]);
    }
    return result;
}
/**
 * Creates array of index-value pairs
 * @param array - Source array
 * @returns Array of [index, value] tuples
 * @example
 * enumerate(['a', 'b', 'c']) // [[0, 'a'], [1, 'b'], [2, 'c']]
 */
export function enumerate(array) {
    if (!Array.isArray(array)) {
        return [];
    }
    return array.map((value, index) => [index, value]);
}
/**
 * Applies different functions to array elements based on their index
 * @param array - Source array
 * @param functions - Array of functions to apply
 * @returns Array with functions applied
 * @example
 * applyByIndex([1, 2, 3], [x => x * 2, x => x + 10, x => x ** 2]) // [2, 12, 9]
 */
export function applyByIndex(array, functions) {
    if (!Array.isArray(array)) {
        return [];
    }
    return array.map((item, index) => {
        const fn = functions[index % functions.length];
        return fn(item);
    });
}
/**
 * Rotates elements to left by n positions
 * @param array - Source array
 * @param n - Number of positions to rotate (default: 1)
 * @returns Rotated array
 * @example
 * rotateLeft([1, 2, 3, 4, 5], 2) // [3, 4, 5, 1, 2]
 */
export function rotateLeft(array, n = 1) {
    if (!Array.isArray(array) || array.length === 0) {
        return [];
    }
    const len = array.length;
    const rotations = ((n % len) + len) % len;
    return [...array.slice(rotations), ...array.slice(0, rotations)];
}
/**
 * Rotates elements to right by n positions
 * @param array - Source array
 * @param n - Number of positions to rotate (default: 1)
 * @returns Rotated array
 * @example
 * rotateRight([1, 2, 3, 4, 5], 2) // [4, 5, 1, 2, 3]
 */
export function rotateRight(array, n = 1) {
    return rotateLeft(array, -n);
}
/**
 * Swaps two elements in array by their indices
 * @param array - Source array
 * @param i - First index
 * @param j - Second index
 * @returns New array with swapped elements
 * @example
 * swap([1, 2, 3, 4], 0, 3) // [4, 2, 3, 1]
 */
export function swap(array, i, j) {
    if (!Array.isArray(array) ||
        i < 0 ||
        j < 0 ||
        i >= array.length ||
        j >= array.length) {
        return [...array];
    }
    const result = [...array];
    [result[i], result[j]] = [result[j], result[i]];
    return result;
}
/**
 * Reverses array segments between specified indices
 * @param array - Source array
 * @param start - Start index (inclusive)
 * @param end - End index (inclusive)
 * @returns Array with reversed segment
 * @example
 * reverseSegment([1, 2, 3, 4, 5], 1, 3) // [1, 4, 3, 2, 5]
 */
export function reverseSegment(array, start, end) {
    if (!Array.isArray(array) ||
        start < 0 ||
        end >= array.length ||
        start >= end) {
        return [...array];
    }
    const result = [...array];
    const segment = result.slice(start, end + 1).reverse();
    result.splice(start, end - start + 1, ...segment);
    return result;
}
/**
 * Checks if array is sorted in ascending order
 * @param array - Array to check
 * @param compareFn - Optional comparison function
 * @returns True if array is sorted
 * @example
 * isSorted([1, 2, 3, 4]) // true
 * isSorted([1, 3, 2, 4]) // false
 */
export function isSorted(array, compareFn) {
    if (!Array.isArray(array) || array.length <= 1) {
        return true;
    }
    const compare = compareFn || ((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    for (let i = 1; i < array.length; i++) {
        if (compare(array[i - 1], array[i]) > 0) {
            return false;
        }
    }
    return true;
}
/**
 * Checks if array contains duplicates
 * @param array - Array to check
 * @returns True if array has duplicates
 * @example
 * hasDuplicates([1, 2, 3]) // false
 * hasDuplicates([1, 2, 2, 3]) // true
 */
export function hasDuplicates(array) {
    if (!Array.isArray(array)) {
        return false;
    }
    return new Set(array).size !== array.length;
}
/**
 * Extracts values from array of objects by multiple keys
 * @param array - Array of objects
 * @param keys - Keys to extract
 * @returns Array of objects with only specified keys
 * @example
 * pickMany([{a: 1, b: 2, c: 3}], ['a', 'c']) // [{a: 1, c: 3}]
 */
export function pickMany(array, keys) {
    if (!Array.isArray(array)) {
        return [];
    }
    return array.map((obj) => {
        const result = {};
        for (const key of keys) {
            if (key in obj) {
                result[key] = obj[key];
            }
        }
        return result;
    });
}
/**
 * Maps array to object using key and value selectors
 * @param array - Source array
 * @param keySelector - Function to extract key
 * @param valueSelector - Function to extract value (optional, defaults to identity)
 * @returns Object with mapped keys and values
 * @example
 * toObject([{id: 1, name: 'A'}], x => x.id, x => x.name) // {1: 'A'}
 */
export function toObject(array, keySelector, valueSelector) {
    if (!Array.isArray(array)) {
        return {};
    }
    const result = {};
    for (let i = 0; i < array.length; i++) {
        const key = keySelector(array[i], i);
        const value = valueSelector
            ? valueSelector(array[i], i)
            : array[i];
        result[key] = value;
    }
    return result;
}
/**
 * Maps array elements asynchronously in sequence
 * @param array - Source array
 * @param fn - Async mapping function
 * @returns Promise resolving to mapped array
 * @example
 * await mapAsync([1, 2, 3], async x => await fetchData(x))
 */
export async function mapAsync(array, fn) {
    if (!Array.isArray(array)) {
        return [];
    }
    const result = [];
    for (let i = 0; i < array.length; i++) {
        result.push(await fn(array[i], i));
    }
    return result;
}
/**
 * Maps array elements asynchronously in parallel
 * @param array - Source array
 * @param fn - Async mapping function
 * @returns Promise resolving to mapped array
 * @example
 * await mapAsyncParallel([1, 2, 3], async x => await fetchData(x))
 */
export async function mapAsyncParallel(array, fn) {
    if (!Array.isArray(array)) {
        return [];
    }
    return Promise.all(array.map((item, index) => fn(item, index)));
}
/**
 * Filters array elements asynchronously
 * @param array - Source array
 * @param predicate - Async predicate function
 * @returns Promise resolving to filtered array
 * @example
 * await filterAsync([1, 2, 3], async x => await isValid(x))
 */
export async function filterAsync(array, predicate) {
    if (!Array.isArray(array)) {
        return [];
    }
    const result = [];
    for (let i = 0; i < array.length; i++) {
        if (await predicate(array[i], i)) {
            result.push(array[i]);
        }
    }
    return result;
}
/**
 * Reduces array asynchronously
 * @param array - Source array
 * @param fn - Async reducer function
 * @param initial - Initial accumulator value
 * @returns Promise resolving to final accumulator value
 * @example
 * await reduceAsync([1, 2, 3], async (acc, x) => acc + await process(x), 0)
 */
export async function reduceAsync(array, fn, initial) {
    if (!Array.isArray(array)) {
        return initial;
    }
    let accumulator = initial;
    for (let i = 0; i < array.length; i++) {
        accumulator = await fn(accumulator, array[i], i);
    }
    return accumulator;
}
/**
 * Finds first element that satisfies async predicate
 * @param array - Source array
 * @param predicate - Async predicate function
 * @returns Promise resolving to found element or undefined
 * @example
 * await findAsync([1, 2, 3], async x => await isValid(x))
 */
export async function findAsync(array, predicate) {
    if (!Array.isArray(array)) {
        return undefined;
    }
    for (let i = 0; i < array.length; i++) {
        if (await predicate(array[i], i)) {
            return array[i];
        }
    }
    return undefined;
}
/**
 * Checks if some element satisfies async predicate
 * @param array - Source array
 * @param predicate - Async predicate function
 * @returns Promise resolving to true if any element matches
 * @example
 * await someAsync([1, 2, 3], async x => await isValid(x))
 */
export async function someAsync(array, predicate) {
    if (!Array.isArray(array)) {
        return false;
    }
    for (let i = 0; i < array.length; i++) {
        if (await predicate(array[i], i)) {
            return true;
        }
    }
    return false;
}
/**
 * Checks if every element satisfies async predicate
 * @param array - Source array
 * @param predicate - Async predicate function
 * @returns Promise resolving to true if all elements match
 * @example
 * await everyAsync([1, 2, 3], async x => await isValid(x))
 */
export async function everyAsync(array, predicate) {
    if (!Array.isArray(array)) {
        return true;
    }
    for (let i = 0; i < array.length; i++) {
        if (!(await predicate(array[i], i))) {
            return false;
        }
    }
    return true;
}
/**
 * Calculates weighted average from array of {value, weight} objects or using selectors
 * @param array - Source array
 * @param valueSelector - Function to extract value
 * @param weightSelector - Function to extract weight
 * @returns Weighted average, or 0 if total weight is 0
 * @example
 * weightedAverage([{score: 80, credits: 3}, {score: 90, credits: 2}], x => x.score, x => x.credits) // 84
 */
export function weightedAverage(array, valueSelector, weightSelector) {
    if (!Array.isArray(array) || array.length === 0) {
        return 0;
    }
    let totalWeight = 0;
    let weightedSum = 0;
    for (const item of array) {
        const value = typeof valueSelector === 'function'
            ? valueSelector(item)
            : get(item, valueSelector);
        const weight = typeof weightSelector === 'function'
            ? weightSelector(item)
            : get(item, weightSelector);
        if (typeof value === 'number' && typeof weight === 'number') {
            weightedSum += value * weight;
            totalWeight += weight;
        }
    }
    return totalWeight === 0 ? 0 : weightedSum / totalWeight;
}
/**
 * Randomly selects elements with weights
 * @param array - Source array
 * @param weightSelector - Function to extract weight
 * @param count - Number of elements to select (default: 1)
 * @returns Array of selected elements
 * @example
 * weightedSample([{item: 'A', prob: 0.7}, {item: 'B', prob: 0.3}], x => x.prob, 10)
 */
export function weightedSample(array, weightSelector, count = 1) {
    if (!Array.isArray(array) || array.length === 0 || count < 1) {
        return [];
    }
    // Calculate cumulative weights
    const weights = [];
    let totalWeight = 0;
    for (const item of array) {
        const weight = typeof weightSelector === 'function'
            ? weightSelector(item)
            : get(item, weightSelector);
        totalWeight += typeof weight === 'number' && weight > 0 ? weight : 0;
        weights.push(totalWeight);
    }
    if (totalWeight === 0) {
        return [];
    }
    const result = [];
    for (let i = 0; i < count; i++) {
        const random = Math.random() * totalWeight;
        const index = weights.findIndex((w) => random < w);
        if (index !== -1) {
            result.push(array[index]);
        }
    }
    return result;
}
/**
 * Splits array into segments of varying sizes
 * @param array - Source array
 * @param sizes - Array of segment sizes
 * @returns Array of segments
 * @example
 * segment([1, 2, 3, 4, 5, 6], [2, 3, 1]) // [[1, 2], [3, 4, 5], [6]]
 */
export function segment(array, sizes) {
    if (!Array.isArray(array) || !Array.isArray(sizes)) {
        return [];
    }
    const result = [];
    let offset = 0;
    for (const size of sizes) {
        if (offset >= array.length)
            break;
        result.push(array.slice(offset, offset + size));
        offset += size;
    }
    return result;
}
/**
 * Creates array with elements that appear in first array specified number of times
 * @param array - Source array
 * @param count - Required occurrence count
 * @returns Array with elements appearing exactly count times
 * @example
 * selectByCount([1, 1, 2, 2, 2, 3], 2) // [1, 1, 2, 2]
 */
export function selectByCount(array, count) {
    if (!Array.isArray(array) || count < 1) {
        return [];
    }
    const freq = frequencies(array);
    const result = [];
    for (const item of array) {
        if (freq.get(item) === count) {
            result.push(item);
        }
    }
    return result;
}
/**
 * Filters array to keep only elements that pass predicate n consecutive times
 * @param array - Source array
 * @param n - Number of consecutive passes required
 * @param predicate - Predicate function
 * @returns Filtered array
 * @example
 * filterConsecutive([1, 2, 2, 3, 3, 3], 2, x => x > 1) // [2, 2, 3, 3, 3]
 */
export function filterConsecutive(array, n, predicate) {
    if (!Array.isArray(array) || n < 1) {
        return [];
    }
    const result = [];
    let consecutiveCount = 0;
    const buffer = [];
    for (const item of array) {
        if (predicate(item)) {
            consecutiveCount++;
            buffer.push(item);
            if (consecutiveCount >= n) {
                result.push(...buffer.splice(0, buffer.length - n + 1));
            }
        }
        else {
            consecutiveCount = 0;
            buffer.length = 0;
        }
    }
    if (consecutiveCount >= n) {
        result.push(...buffer);
    }
    return result;
}
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
export function mapWithContext(array, fn, initialContext) {
    if (!Array.isArray(array)) {
        return [];
    }
    const result = [];
    let context = initialContext;
    for (let i = 0; i < array.length; i++) {
        const { value, newContext } = fn(array[i], context, i);
        result.push(value);
        context = newContext;
    }
    return result;
}
/**
 * Groups array elements into fixed-size batches, with last batch potentially smaller
 * Similar to chunk but with better naming for batch processing scenarios
 * @param array - Source array
 * @param batchSize - Size of each batch
 * @returns Array of batches
 * @example
 * batch([1, 2, 3, 4, 5], 2) // [[1, 2], [3, 4], [5]]
 */
export function batch(array, batchSize) {
    return chunk(array, batchSize);
}
/**
 * Applies a function to pairs of elements from two arrays
 * @param array1 - First array
 * @param array2 - Second array
 * @param fn - Function to combine elements
 * @returns Array of combined results
 * @example
 * zipWith([1, 2, 3], [4, 5, 6], (a, b) => a + b) // [5, 7, 9]
 */
export function zipWith(array1, array2, fn) {
    if (!Array.isArray(array1) || !Array.isArray(array2)) {
        return [];
    }
    const length = Math.min(array1.length, array2.length);
    const result = [];
    for (let i = 0; i < length; i++) {
        result.push(fn(array1[i], array2[i]));
    }
    return result;
}
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
export function mergeArraysByKey(arrays, key, mergeStrategy = 'last') {
    if (!Array.isArray(arrays) || arrays.length === 0) {
        return [];
    }
    const map = new Map();
    for (const array of arrays) {
        if (!Array.isArray(array))
            continue;
        for (const item of array) {
            const keyValue = get(item, key);
            if (mergeStrategy === 'first') {
                if (!map.has(keyValue)) {
                    map.set(keyValue, item);
                }
            }
            else if (mergeStrategy === 'last') {
                map.set(keyValue, item);
            }
            else if (mergeStrategy === 'concat') {
                const existing = map.get(keyValue);
                if (Array.isArray(existing)) {
                    existing.push(item);
                }
                else if (existing) {
                    map.set(keyValue, [existing, item]);
                }
                else {
                    map.set(keyValue, item);
                }
            }
            else if (typeof mergeStrategy === 'function') {
                const existing = map.get(keyValue);
                if (existing && !Array.isArray(existing)) {
                    map.set(keyValue, mergeStrategy(existing, item));
                }
                else {
                    map.set(keyValue, item);
                }
            }
        }
    }
    const result = [];
    for (const value of map.values()) {
        if (Array.isArray(value) && mergeStrategy === 'concat') {
            result.push(...value);
        }
        else if (!Array.isArray(value)) {
            result.push(value);
        }
    }
    return result;
}
/**
 * Creates a lookup/index object for fast access by key
 * @param array - Array of objects
 * @param key - Key to index by
 * @returns Object mapping key values to array elements
 * @example
 * indexBy([{id: 1, name: 'A'}, {id: 2, name: 'B'}], 'id')
 * // {1: {id: 1, name: 'A'}, 2: {id: 2, name: 'B'}}
 */
export function indexBy(array, key) {
    return toObject(array, (item) => String(get(item, key)));
}
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
export function binarySearch(array, target, compareFn) {
    if (!Array.isArray(array) || array.length === 0) {
        return -1;
    }
    const compare = compareFn || ((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    let left = 0;
    let right = array.length - 1;
    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const comparison = compare(array[mid], target);
        if (comparison === 0) {
            return mid;
        }
        else if (comparison < 0) {
            left = mid + 1;
        }
        else {
            right = mid - 1;
        }
    }
    return -1;
}
/**
 * Inserts value into sorted array maintaining sort order
 * @param array - Sorted array
 * @param value - Value to insert
 * @param compareFn - Optional comparison function
 * @returns New sorted array with value inserted
 * @example
 * insertSorted([1, 3, 5, 7], 4) // [1, 3, 4, 5, 7]
 */
export function insertSorted(array, value, compareFn) {
    if (!Array.isArray(array)) {
        return [value];
    }
    const compare = compareFn || ((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const result = [...array];
    let insertIndex = 0;
    while (insertIndex < result.length &&
        compare(result[insertIndex], value) < 0) {
        insertIndex++;
    }
    result.splice(insertIndex, 0, value);
    return result;
}
