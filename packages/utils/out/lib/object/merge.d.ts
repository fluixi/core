import { AnyObject, CreateMutable, RecordObject, UnionToIntersection } from './types.js';
/**
 * Merges multiple objects or multiple arrays deeply without keeping references
 * Creates a new instance with combined properties/items
 *
 * @param sources - Objects or arrays to merge (cannot mix objects and arrays)
 * @returns Merged result (new instance, no references to source objects)
 *
 * @example
 * // Merging objects
 * const obj1 = { a: 1, b: { c: 2 } };
 * const obj2 = { b: { d: 3 }, e: 4 };
 * const result = merge(obj1, obj2);
 * // result: { a: 1, b: { c: 2, d: 3 }, e: 4 }
 *
 * @example
 * // Merging arrays
 * const arr1 = [1, 2, { a: 1 }];
 * const arr2 = [3, { a: 2, b: 3 }];
 * const result = merge(arr1, arr2);
 * // result: [1, 2, { a: 1 }, 3, { a: 2, b: 3 }]
 */
export declare function merge<T extends AnyObject[]>(...sources: T): T extends (infer U)[] ? CreateMutable<UnionToIntersection<U>> : never;
export declare function merge<T extends any[][]>(...sources: T): T extends (infer U)[] ? CreateMutable<UnionToIntersection<U>> : never;
/**
 * Merges objects or arrays with options for reference preservation and strict merging
 *
 * @param target - The target object/array to merge into (can be modified if preserveTarget is true)
 * @param sources - The source objects/arrays to merge from
 * @param options - Configuration options
 * @returns The merged result
 *
 * @example
 * // With reference preservation
 * const obj1 = { a: 1, b: { c: 2 } };
 * const result = deepMergeWithOptions(obj1, { b: { d: 3 }, e: 4 }, { preserveTarget: true });
 * // result === obj1 (same reference)
 * // result: { a: 1, b: { c: 2, d: 3 }, e: 4 }
 *
 * @example
 * // With strict merging (only merge properties that exist in target)
 * const obj1 = { a: 1, b: { c: 2 } };
 * const result = deepMergeWithOptions(obj1, { b: { d: 3 }, e: 4 }, { strict: true });
 * // result: { a: 1, b: { c: 2 } } - e is not added as it doesn't exist in obj1
 */
export declare function deepMergeWithOptions<T extends object>(target: T, ...args: any[]): T;
/**
 * Deep merges objects/arrays while preserving the reference to the first object/array
 * Modifies the first object directly rather than creating a new one
 *
 * @param target - The target object that will be modified
 * @param sources - The source objects to merge from
 * @returns The modified target object (same reference)
 *
 * @example
 * const obj1 = { a: 1, b: { c: 2 } };
 * const result = deepMergeKeepReference(obj1, { b: { d: 3 }, e: 4 });
 * // result === obj1 (same reference)
 * // obj1 is now: { a: 1, b: { c: 2, d: 3 }, e: 4 }
 */
export declare function deepMergeKeepReference<T extends object>(target: T, ...sources: object[]): T;
/**
 * Strict deep merge - only merges properties that already exist in the target
 * Does not add new properties that don't exist in the target
 *
 * @param target - The target object
 * @param sources - The source objects to merge from
 * @param preserveReference - Whether to preserve the reference to target (default: false)
 * @returns The merged object
 *
 * @example
 * const obj1 = { a: 1, b: { c: 2 } };
 * const result = deepMergeStrict(obj1, { b: { d: 3 }, e: 4 });
 * // result: { a: 1, b: { c: 2 } } - e is not added as it doesn't exist in obj1
 * //                                 d is not added as it doesn't exist in obj1.b
 */
export declare function deepMergeStrict<T extends object>(target: T, ...args: any[]): T;
/**
 * Helper to merge a value into a structure based on selector
 * @param target - Target object to merge into
 * @param selector - Selector string
 * @param value - Value to merge
 * @example
 * mergeIntoStructure({ a: { b: { c: 1 } } }, 'a.b.c', 2);
 * // { a: { b: { c: 2 } } }
 */
export declare const mergeIntoStructure: (target: RecordObject, selector: string, value: any) => void;
export { deepMergeKeepReference as deepMerge, deepMergeStrict as mergeStrict, deepMergeWithOptions as mergeWithOptions, };
//# sourceMappingURL=merge.d.ts.map