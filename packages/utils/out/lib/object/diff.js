/**
 * @fileoverview Object diff utilities for comparing and tracking changes
 * @description Provides utilities to diff objects and return structured changes
 */
import { isObject } from './utils.js';
/**
 * Default equality function using strict equality
 */
const defaultEqualityFn = (a, b) => a === b;
/**
 * Deep equality check for arrays
 */
const deepArrayEqual = (arr1, arr2) => {
    if (arr1.length !== arr2.length)
        return false;
    for (let i = 0; i < arr1.length; i++) {
        if (Array.isArray(arr1[i]) && Array.isArray(arr2[i])) {
            if (!deepArrayEqual(arr1[i], arr2[i]))
                return false;
        }
        else if (isObject(arr1[i]) && isObject(arr2[i])) {
            if (!deepObjectEqual(arr1[i], arr2[i]))
                return false;
        }
        else if (arr1[i] !== arr2[i]) {
            return false;
        }
    }
    return true;
};
/**
 * Deep equality check for objects
 */
const deepObjectEqual = (obj1, obj2) => {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    if (keys1.length !== keys2.length)
        return false;
    for (const key of keys1) {
        if (!(key in obj2))
            return false;
        const val1 = obj1[key];
        const val2 = obj2[key];
        if (Array.isArray(val1) && Array.isArray(val2)) {
            if (!deepArrayEqual(val1, val2))
                return false;
        }
        else if (isObject(val1) && isObject(val2)) {
            if (!deepObjectEqual(val1, val2))
                return false;
        }
        else if (val1 !== val2) {
            return false;
        }
    }
    return true;
};
/**
 * Compares two objects and returns only the changed values while preserving the object structure
 *
 * @param oldObj - The original object
 * @param newObj - The new object to compare against
 * @param options - Configuration options for diff behavior
 * @returns Object with the same structure containing only changed values
 *
 * @example
 * ```ts
 * const old = { a: 1, b: { c: 2, d: 3 }, e: 5 };
 * const new = { a: 1, b: { c: 4, d: 3 }, e: 5, f: 6 };
 * const diff = diffObject(old, new);
 * // Returns: { b: { c: 4 }, f: 6 }
 * ```
 *
 * @example
 * ```ts
 * // With arrays
 * const old = { items: [1, 2, 3], meta: { count: 3 } };
 * const new = { items: [1, 2, 4], meta: { count: 4 } };
 * const diff = diffObject(old, new);
 * // Returns: { items: [1, 2, 4], meta: { count: 4 } }
 * ```
 *
 * @example
 * ```ts
 * // Include deleted properties
 * const old = { a: 1, b: 2, c: 3 };
 * const new = { a: 1, c: 4 };
 * const diff = diffObject(old, new, { includeDeleted: true });
 * // Returns: { b: undefined, c: 4 }
 * ```
 */
export const diffObject = (oldObj, newObj, options = {}) => {
    const { includeDeleted = false, includeAdded = true, deepArrayComparison = true, equalityFn = defaultEqualityFn, preserveStructure = false, } = options;
    // Handle null/undefined cases
    if (oldObj == null && newObj == null) {
        return {};
    }
    if (oldObj == null) {
        return includeAdded ? { ...newObj } : {};
    }
    if (newObj == null) {
        if (includeDeleted) {
            const result = {};
            for (const key in oldObj) {
                result[key] = undefined;
            }
            return result;
        }
        return {};
    }
    // Ensure both are objects
    if (!isObject(oldObj) || !isObject(newObj)) {
        return equalityFn(oldObj, newObj)
            ? {}
            : newObj;
    }
    const result = {};
    const processedKeys = new Set();
    // Process all keys in newObj
    for (const key in newObj) {
        processedKeys.add(key);
        const oldValue = oldObj[key];
        const newValue = newObj[key];
        // Key doesn't exist in old object - it's added
        if (!(key in oldObj)) {
            if (includeAdded) {
                result[key] = newValue;
            }
            continue;
        }
        // Both values are arrays
        if (Array.isArray(oldValue) && Array.isArray(newValue)) {
            if (deepArrayComparison) {
                if (!deepArrayEqual(oldValue, newValue)) {
                    result[key] = newValue;
                }
                else if (preserveStructure) {
                    result[key] = undefined;
                }
            }
            else {
                if (oldValue !== newValue) {
                    result[key] = newValue;
                }
                else if (preserveStructure) {
                    result[key] = undefined;
                }
            }
            continue;
        }
        // Both values are objects - recurse
        if (isObject(oldValue) && isObject(newValue)) {
            const nestedDiff = diffObject(oldValue, newValue, options);
            // Only include if there are changes
            if (Object.keys(nestedDiff).length > 0) {
                result[key] = nestedDiff;
            }
            else if (preserveStructure) {
                result[key] = undefined;
            }
            continue;
        }
        // Primitive comparison or type mismatch
        if (!equalityFn(oldValue, newValue)) {
            result[key] = newValue;
        }
        else if (preserveStructure) {
            result[key] = undefined;
        }
    }
    // Process deleted keys (exist in old but not in new)
    if (includeDeleted) {
        for (const key in oldObj) {
            if (!processedKeys.has(key)) {
                result[key] = undefined;
            }
        }
    }
    return result;
};
/**
 * Returns detailed diff with metadata about changes for objects and arrays
 *
 * @param oldObj - The original object or array
 * @param newObj - The new object or array to compare against
 * @param options - Configuration options for diff behavior
 * @returns Detailed diff result with metadata including array indices in paths
 *
 * @example
 * ```ts
 * // Object example
 * const old = { a: 1, b: 2, c: 3 };
 * const new = { a: 1, b: 4, d: 5 };
 * const result = diffObjectDetailed(old, new);
 * // {
 * //   changes: { b: 4, d: 5 },
 * //   added: ['d'],
 * //   deleted: ['c'],
 * //   modified: ['b'],
 * //   hasChanges: true
 * // }
 * ```
 *
 * @example
 * ```ts
 * // Nested array example
 * const old = { items: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }] };
 * const new = { items: [{ id: 1, name: 'x' }, { id: 2, name: 'b' }] };
 * const result = diffObjectDetailed(old, new);
 * // modified: ['items[0].name']
 * ```
 *
 * @example
 * ```ts
 * // Top-level array example
 * const old = [1, 2, 3, 4];
 * const new = [1, 5, 3];
 * const result = diffObjectDetailed(old, new);
 * // {
 * //   changes: [1, 5, 3],  // Returns the new array with changes
 * //   added: [],
 * //   deleted: ['[3]'],     // Index 3 was removed
 * //   modified: ['[1]'],    // Index 1 changed from 2 to 5
 * //   hasChanges: true
 * // }
 * ```
 *
 * @example
 * ```ts
 * // Array of objects example
 * const old = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
 * const new = [{ id: 1, name: 'Alicia' }, { id: 2, name: 'Bob' }];
 * const result = diffObjectDetailed(old, new);
 * // {
 * //   changes: [{ id: 1, name: 'Alicia' }, { id: 2, name: 'Bob' }],
 * //   modified: ['[0]'],   // First element modified
 * //   hasChanges: true
 * // }
 * ```
 */
export const diffObjectDetailed = (oldObj, newObj, options = {}) => {
    const added = [];
    const deleted = [];
    const modified = [];
    const changes = {};
    const { includeDeleted = false, includeAdded = true, deepArrayComparison = true, equalityFn = defaultEqualityFn, } = options;
    // Handle arrays at the top level
    if (Array.isArray(oldObj) && Array.isArray(newObj)) {
        const maxLength = Math.max(oldObj.length, newObj.length);
        const arrayChanges = [];
        let hasArrayChanges = false;
        for (let i = 0; i < maxLength; i++) {
            const indexPath = `[${i}]`;
            if (i >= oldObj.length) {
                // Added element
                added.push(indexPath);
                arrayChanges[i] = newObj[i];
                hasArrayChanges = true;
            }
            else if (i >= newObj.length) {
                // Deleted element
                if (includeDeleted) {
                    deleted.push(indexPath);
                    hasArrayChanges = true;
                }
            }
            else {
                // Compare elements
                const oldElement = oldObj[i];
                const newElement = newObj[i];
                if (isObject(oldElement) && isObject(newElement)) {
                    const nestedDiff = diffObjectDetailed(oldElement, newElement, options);
                    if (nestedDiff.hasChanges) {
                        modified.push(indexPath);
                        arrayChanges[i] = newElement;
                        hasArrayChanges = true;
                    }
                    else {
                        arrayChanges[i] = oldElement;
                    }
                }
                else if (Array.isArray(oldElement) && Array.isArray(newElement)) {
                    const nestedDiff = diffObjectDetailed(oldElement, newElement, options);
                    if (nestedDiff.hasChanges) {
                        modified.push(indexPath);
                        arrayChanges[i] = newElement;
                        hasArrayChanges = true;
                    }
                    else {
                        arrayChanges[i] = oldElement;
                    }
                }
                else if (!equalityFn(oldElement, newElement)) {
                    modified.push(indexPath);
                    arrayChanges[i] = newElement;
                    hasArrayChanges = true;
                }
                else {
                    arrayChanges[i] = oldElement;
                }
            }
        }
        return {
            changes: (hasArrayChanges ? arrayChanges : {}),
            added,
            deleted,
            modified,
            hasChanges: hasArrayChanges,
        };
    }
    // Helper to collect paths with array index support and categorize them
    const collectDetailedPaths = (old, newVal, currentPath = '') => {
        const result = {
            added: [],
            deleted: [],
            modified: [],
        };
        // Handle arrays
        if (Array.isArray(old) && Array.isArray(newVal)) {
            const maxLength = Math.max(old.length, newVal.length);
            for (let i = 0; i < maxLength; i++) {
                const indexPath = currentPath ? `${currentPath}[${i}]` : `[${i}]`;
                if (i >= old.length) {
                    // Added element
                    result.added.push(indexPath);
                }
                else if (i >= newVal.length) {
                    // Deleted element
                    result.deleted.push(indexPath);
                }
                else {
                    // Compare elements
                    const oldElement = old[i];
                    const newElement = newVal[i];
                    if (isObject(oldElement) && isObject(newElement)) {
                        const nested = collectDetailedPaths(oldElement, newElement, indexPath);
                        result.added.push(...nested.added);
                        result.deleted.push(...nested.deleted);
                        result.modified.push(...nested.modified);
                    }
                    else if (Array.isArray(oldElement) && Array.isArray(newElement)) {
                        const nested = collectDetailedPaths(oldElement, newElement, indexPath);
                        result.added.push(...nested.added);
                        result.deleted.push(...nested.deleted);
                        result.modified.push(...nested.modified);
                    }
                    else if (oldElement !== newElement) {
                        result.modified.push(indexPath);
                    }
                }
            }
            return result;
        }
        // Handle objects
        if (isObject(old) && isObject(newVal)) {
            const allKeys = new Set([
                ...Object.keys(old || {}),
                ...Object.keys(newVal || {}),
            ]);
            for (const key of allKeys) {
                const oldValue = old?.[key];
                const newValue = newVal?.[key];
                const path = currentPath ? `${currentPath}.${key}` : key;
                if (!(key in (old || {}))) {
                    // Added
                    result.added.push(path);
                }
                else if (!(key in (newVal || {}))) {
                    // Deleted
                    result.deleted.push(path);
                }
                else if (Array.isArray(oldValue) && Array.isArray(newValue)) {
                    // Compare arrays
                    if (!deepArrayEqual(oldValue, newValue)) {
                        const nested = collectDetailedPaths(oldValue, newValue, path);
                        result.added.push(...nested.added);
                        result.deleted.push(...nested.deleted);
                        result.modified.push(...nested.modified);
                    }
                }
                else if (isObject(oldValue) && isObject(newValue)) {
                    // Recurse into objects
                    const nested = collectDetailedPaths(oldValue, newValue, path);
                    result.added.push(...nested.added);
                    result.deleted.push(...nested.deleted);
                    result.modified.push(...nested.modified);
                }
                else if (oldValue !== newValue) {
                    // Modified
                    result.modified.push(path);
                }
            }
        }
        return result;
    };
    // Handle null/undefined cases
    if (oldObj == null && newObj == null) {
        return { changes: {}, added, deleted, modified, hasChanges: false };
    }
    if (oldObj == null) {
        if (includeAdded && newObj) {
            for (const key in newObj) {
                added.push(key);
                changes[key] = newObj[key];
            }
        }
        return {
            changes,
            added,
            deleted,
            modified,
            hasChanges: added.length > 0,
        };
    }
    if (newObj == null) {
        if (includeDeleted) {
            for (const key in oldObj) {
                deleted.push(key);
                changes[key] = undefined;
            }
        }
        return {
            changes,
            added,
            deleted,
            modified,
            hasChanges: deleted.length > 0,
        };
    }
    const processedKeys = new Set();
    // Process all keys in newObj
    for (const key in newObj) {
        processedKeys.add(key);
        const oldValue = oldObj[key];
        const newValue = newObj[key];
        // Key doesn't exist in old object - it's added
        if (!(key in oldObj)) {
            if (includeAdded) {
                added.push(key);
                changes[key] = newValue;
            }
            continue;
        }
        // Check if values are different
        let isDifferent = false;
        if (Array.isArray(oldValue) && Array.isArray(newValue)) {
            isDifferent = deepArrayComparison
                ? !deepArrayEqual(oldValue, newValue)
                : oldValue !== newValue;
            if (isDifferent) {
                const paths = collectDetailedPaths(oldValue, newValue, key);
                added.push(...paths.added);
                deleted.push(...paths.deleted);
                modified.push(...paths.modified);
                changes[key] = newValue;
            }
        }
        else if (isObject(oldValue) && isObject(newValue)) {
            const nestedDiff = diffObject(oldValue, newValue, options);
            isDifferent = Object.keys(nestedDiff).length > 0;
            if (isDifferent) {
                const paths = collectDetailedPaths(oldValue, newValue, key);
                added.push(...paths.added);
                deleted.push(...paths.deleted);
                modified.push(...paths.modified);
                changes[key] = nestedDiff;
            }
        }
        else {
            isDifferent = !equalityFn(oldValue, newValue);
            if (isDifferent) {
                modified.push(key);
                changes[key] = newValue;
            }
        }
    }
    // Process deleted keys
    if (includeDeleted) {
        for (const key in oldObj) {
            if (!processedKeys.has(key)) {
                deleted.push(key);
                changes[key] = undefined;
            }
        }
    }
    return {
        changes,
        added,
        deleted,
        modified,
        hasChanges: added.length > 0 || deleted.length > 0 || modified.length > 0,
    };
};
/**
 * Checks if two objects have any differences
 *
 * @param oldObj - The original object
 * @param newObj - The new object to compare against
 * @param options - Configuration options for diff behavior
 * @returns True if objects are different
 *
 * @example
 * ```ts
 * hasObjectChanges({ a: 1 }, { a: 1 }) // false
 * hasObjectChanges({ a: 1 }, { a: 2 }) // true
 * ```
 */
export const hasObjectChanges = (oldObj, newObj, options = {}) => {
    const diff = diffObject(oldObj, newObj, options);
    return Object.keys(diff).length > 0;
};
/**
 * Applies a diff object to an original object or array to produce the new object/array
 *
 * @param baseObj - The base object or array to apply changes to
 * @param diff - The diff object or array containing changes
 * @param keepRef - If true, modifies the original object/array instead of creating a copy
 * @returns New object/array with changes applied
 *
 * @example
 * ```ts
 * // Object example
 * const base = { a: 1, b: { c: 2, d: 3 } };
 * const diff = { b: { c: 4 } };
 * const result = applyDiff(base, diff);
 * // Returns: { a: 1, b: { c: 4, d: 3 } }
 * ```
 *
 * @example
 * ```ts
 * // Array example
 * const base = [1, 2, 3, 4];
 * const diff = [10, undefined, 30]; // undefined means no change
 * const result = applyDiff(base, diff);
 * // Returns: [10, 2, 30, 4]
 * ```
 *
 * @example
 * ```ts
 * // Nested array/object example
 * const base = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
 * const diff = [{ name: 'Alicia' }, undefined]; // Change first item's name
 * const result = applyDiff(base, diff);
 * // Returns: [{ id: 1, name: 'Alicia' }, { id: 2, name: 'Bob' }]
 * ```
 */
export const applyDiff = (baseObj, diff, keepRef = false) => {
    // Handle arrays at the top level
    if (Array.isArray(baseObj) && Array.isArray(diff)) {
        const result = keepRef ? baseObj : [...baseObj];
        // Apply changes from diff array
        for (let i = 0; i < diff.length; i++) {
            const diffValue = diff[i];
            if (diffValue === undefined) {
                // Skip undefined values (they represent no change)
                continue;
            }
            // If both elements are objects, recursively apply
            if (isObject(result[i]) && isObject(diffValue)) {
                result[i] = applyDiff(result[i], diffValue);
            }
            else if (Array.isArray(result[i]) && Array.isArray(diffValue)) {
                result[i] = applyDiff(result[i], diffValue);
            }
            else {
                result[i] = diffValue;
            }
        }
        return result;
    }
    if (!isObject(baseObj)) {
        return diff;
    }
    if (!isObject(diff)) {
        return baseObj;
    }
    const result = keepRef ? baseObj : { ...baseObj };
    for (const key in diff) {
        const diffValue = diff[key];
        // Handle undefined (deleted keys)
        if (diffValue === undefined) {
            delete result[key];
            continue;
        }
        // If both are arrays, recursively apply
        if (Array.isArray(result[key]) && Array.isArray(diffValue)) {
            result[key] = applyDiff(result[key], diffValue);
        }
        else if (isObject(result[key]) && isObject(diffValue)) {
            // If both are objects, recursively apply
            result[key] = applyDiff(result[key], diffValue);
        }
        else {
            result[key] = diffValue;
        }
    }
    return result;
};
/**
 * Gets paths of all changed values with array index notation support
 *
 * @param oldObj - The original object
 * @param newObj - The new object to compare against
 * @param options - Configuration options for diff behavior
 * @returns Array of paths to changed values (e.g., ['a.b[0].name', 'c[1].value'])
 *
 * @example
 * ```ts
 * const old = { a: 1, b: { c: 2, d: 3 } };
 * const new = { a: 1, b: { c: 4, d: 3 }, e: 5 };
 * const paths = getChangedPaths(old, new);
 * // Returns: ['b.c', 'e']
 * ```
 *
 * @example
 * ```ts
 * const old = { items: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }] };
 * const new = { items: [{ id: 1, name: 'x' }, { id: 2, name: 'b' }] };
 * const paths = getChangedPaths(old, new);
 * // Returns: ['items[0].name']
 * ```
 */
export const getChangedPaths = (oldObj, newObj, options = {}) => {
    const paths = [];
    const collectPaths = (old, newVal, currentPath = '') => {
        if (old === newVal)
            return;
        // Handle arrays with index notation
        if (Array.isArray(old) && Array.isArray(newVal)) {
            const maxLength = Math.max(old.length, newVal.length);
            for (let i = 0; i < maxLength; i++) {
                const indexPath = currentPath ? `${currentPath}[${i}]` : `[${i}]`;
                if (i >= old.length) {
                    // Element was added
                    paths.push(indexPath);
                }
                else if (i >= newVal.length) {
                    // Element was deleted
                    paths.push(indexPath);
                }
                else {
                    const oldElement = old[i];
                    const newElement = newVal[i];
                    if (isObject(oldElement) && isObject(newElement)) {
                        // Recurse into object elements
                        collectPaths(oldElement, newElement, indexPath);
                    }
                    else if (Array.isArray(oldElement) && Array.isArray(newElement)) {
                        // Recurse into nested arrays
                        collectPaths(oldElement, newElement, indexPath);
                    }
                    else if (oldElement !== newElement) {
                        // Primitive value changed
                        paths.push(indexPath);
                    }
                }
            }
            return;
        }
        // Handle non-object/non-array primitives
        if (!isObject(old) || !isObject(newVal)) {
            if (currentPath)
                paths.push(currentPath);
            return;
        }
        // Handle objects
        const allKeys = new Set([
            ...Object.keys(old || {}),
            ...Object.keys(newVal || {}),
        ]);
        for (const key of allKeys) {
            const oldValue = old?.[key];
            const newValue = newVal?.[key];
            const path = currentPath ? `${currentPath}.${key}` : key;
            if (!(key in (old || {})) || !(key in (newVal || {}))) {
                paths.push(path);
            }
            else if (Array.isArray(oldValue) && Array.isArray(newValue)) {
                // Compare arrays with index notation
                collectPaths(oldValue, newValue, path);
            }
            else if (isObject(oldValue) && isObject(newValue)) {
                collectPaths(oldValue, newValue, path);
            }
            else if (oldValue !== newValue) {
                paths.push(path);
            }
        }
    };
    collectPaths(oldObj, newObj);
    return paths;
};
