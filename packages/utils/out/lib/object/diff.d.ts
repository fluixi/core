/**
 * @fileoverview Object diff utilities for comparing and tracking changes
 * @description Provides utilities to diff objects and return structured changes
 */
import type { AnyObject } from './types.js';
/**
 * Options for diffObject function
 */
export interface DiffOptions {
    /**
     * If true, includes properties that exist in oldObj but not in newObj
     * @default false
     */
    includeDeleted?: boolean;
    /**
     * If true, includes properties that exist in newObj but not in oldObj
     * @default true
     */
    includeAdded?: boolean;
    /**
     * If true, compares arrays by deep equality instead of reference
     * @default true
     */
    deepArrayComparison?: boolean;
    /**
     * Custom equality function for comparing values
     * @default strict equality (===)
     */
    equalityFn?: (a: any, b: any) => boolean;
    /**
     * If true, preserves the full object structure with undefined for unchanged values
     * @default false
     */
    preserveStructure?: boolean;
}
/**
 * Diff result with metadata about changes
 */
export interface DiffResult<T = any> {
    /**
     * Object containing only changed values
     */
    changes: Partial<T>;
    /**
     * Paths that were added (exist in new but not in old)
     */
    added: string[];
    /**
     * Paths that were deleted (exist in old but not in new)
     */
    deleted: string[];
    /**
     * Paths that were modified (exist in both but have different values)
     */
    modified: string[];
    /**
     * Whether any changes were detected
     */
    hasChanges: boolean;
}
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
export declare const diffObject: <T extends AnyObject>(oldObj: T, newObj: T, options?: DiffOptions) => Partial<T>;
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
export declare const diffObjectDetailed: <T extends AnyObject>(oldObj: T, newObj: T, options?: DiffOptions) => DiffResult<T>;
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
export declare const hasObjectChanges: <T extends AnyObject>(oldObj: T, newObj: T, options?: DiffOptions) => boolean;
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
export declare const applyDiff: <T extends AnyObject>(baseObj: T, diff: Partial<T>, keepRef?: boolean) => T;
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
export declare const getChangedPaths: <T extends AnyObject>(oldObj: T, newObj: T, options?: DiffOptions) => string[];
//# sourceMappingURL=diff.d.ts.map