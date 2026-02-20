import type { AnyObject, ArrayFnParam, Callback, Compare, CompareWithProperty, DataParam, FilteredFnPropertyKey, Flattened, FnPropertyKey, Indices, IValueOfKey, KeyOf, PropertyOrArrayValue, PropertyValue, RangeCompare, SelectorFor, SelectorForIfIndices, SelectorOptions, SelectorSegment, SetterRange } from './types.js';
type A<T> = T extends AnyObject ? T : never;
/**
 * Setter interface for advanced object manipulation
 *
 */
export interface SetterType<T> {
    <K extends SelectorFor<A<T>> | (A<T> extends any[] ? Indices : never), V extends DataParam<A<T>, K> | (A<T> extends any[] ? SelectorForIfIndices<A<T>, K> : never)>(obj: A<T>, key: K, value?: V): any;
    <K extends SelectorFor<A<T>> | (A<T> extends any[] ? Indices : never), I extends A<T> extends any[] ? K extends SelectorFor<A<T>> ? 'K' : SelectorForIfIndices<A<T>, 0> : Indices | Compare<A<T>, K> | RangeCompare | (K extends Indices ? SelectorFor<A<T>> : SelectorFor<Flattened<KeyOf<A<T>, K>>>[]), V extends PropertyOrArrayValue<A<T>, K, I extends Indices ? I : never> | Flattened<DataParam<A<T>, K, I>>>(obj: A<T>, key: K, index: I, value: V): any;
    <K extends SelectorFor<A<T>> | (A<T> extends any[] ? Indices : never), I extends Indices | SelectorFor<Flattened<KeyOf<A<T>, K>>>[], P extends FnPropertyKey<A<T>, K> | PropertyValue<A<T>, K, I extends Indices ? I : never>, V extends PropertyOrArrayValue<A<T>, K, I extends Indices ? I : never, P> | CompareWithProperty<A<T>, K, P>>(obj: A<T>, key: K, indices: I, property: P, value: V): any;
    <K extends SelectorFor<A<T>> | (A<T> extends any[] ? Indices : never), KK extends SelectorFor<Flattened<KeyOf<A<T>, K>>>[], P extends FilteredFnPropertyKey<A<T>, K, KK>, V extends PropertyValue<A<T>, K, never, P>>(obj: A<T>, key: K, stringKeys: KK, property: P, value: V): any;
    <K extends SelectorFor<A<T>> | (A<T> extends any[] ? Indices : never), R extends RangeCompare | SelectorFor<Flattened<KeyOf<A<T>, K>>>[], P extends FnPropertyKey<A<T>, K>, V extends PropertyValue<A<T>, K, never, P>>(obj: A<T>, key: K, range: R, property: P, value: V): any;
}
type S<T, K> = SelectorFor<Flattened<Flattened<IValueOfKey<A<T>, K>>>>;
export interface SetterParamsType<T> {
    <K extends Callback<A<T>>>(key: K): any;
    <K extends SelectorFor<A<T>> | (A<T> extends any[] ? Indices : never) | SelectorFor<Flattened<KeyOf<T, K>>>[], V extends DataParam<A<T>, K> | (A<T> extends any[] ? SelectorForIfIndices<A<T>, K> : never)>(key: K, value?: V): any;
    <K extends SelectorFor<A<T>> | (A<T> extends any[] ? Indices : never) | SelectorFor<Flattened<KeyOf<T, K>>>[], I extends A<T> extends any[] ? K extends SelectorFor<A<T>> ? S<A<T>, K>[] : SelectorForIfIndices<A<T>, 0> : Indices | Compare<A<T>, K> | RangeCompare | (K extends Indices ? SelectorFor<A<T>> : S<A<T>, K>[]), V extends PropertyOrArrayValue<A<T>, K, I extends Indices ? I : never> | (I extends S<A<T>, K>[] ? Flattened<ArrayFnParam<A<T>, K, I>> : Flattened<DataParam<A<T>, K, I>>)>(key: K, index: I, value: V): any;
    <K extends SelectorFor<A<T>> | (A<T> extends any[] ? Indices : never) | SelectorFor<Flattened<KeyOf<T, K>>>[], I extends Indices | S<A<T>, K>[], P extends FnPropertyKey<A<T>, K> | PropertyValue<A<T>, K, I extends Indices ? I : never>, V extends PropertyOrArrayValue<A<T>, K, I extends Indices ? I : never, P> | CompareWithProperty<A<T>, K, P>>(key: K, indices: I, property: P, value: V): any;
    <K extends SelectorFor<A<T>> | (A<T> extends any[] ? Indices : never) | S<A<T>, K>[], KK extends S<A<T>, K>[], P extends FilteredFnPropertyKey<A<T>, K, KK>, V extends PropertyValue<A<T>, K, never, P>>(key: K, stringKeys: KK, property: P, value: V): any;
    <K extends SelectorFor<A<T>> | (A<T> extends any[] ? Indices : never) | S<A<T>, K>[], R extends RangeCompare | SelectorFor<Flattened<KeyOf<A<T>, K>>>[], P extends FnPropertyKey<A<T>, K>, V extends PropertyValue<A<T>, K, never, P>>(key: K, range: R, property: P, value: V): any;
}
/**
 * Gets values from an object while preserving structure
 * @param obj - Source object
 * @param selector - Selector string or array
 * @param options - Selector options
 * @returns Structured object with selected paths
 * @example
 * get({users: [{name: 'Alice'}, {name: 'Bob'}]}, 'users[*].name')
 * // Returns: {users: [{name: 'Alice'}, {name: 'Bob'}]}
 *
 * get({a: {b: 1}, c: {b: 2}}, ['a.b', 'c.b'])
 * // Returns: {a: {b: 1}, c: {b: 2}}
 */
export declare function get<T extends AnyObject, S extends SelectorFor<T>>(obj: T, selector?: S, options?: SelectorOptions & {
    preserveStructure?: boolean;
    multiple?: boolean;
}): T | undefined;
/**
 * Enhanced setter method with multiple patterns
 * @param obj - Target object
 * @param params - Parameters for setting values
 * @returns Modified object
 * @example
 * // Pattern 1: Simple value set
 * set(obj, 'users[0].name', 'Alice')
 *
 * // Pattern 2: Update function
 * set(obj, 'count', prev => prev + 1)
 *
 * // Pattern 3: Index with value
 * set(obj, 'users', 0, {name: 'Alice'})
 *
 * // Pattern 4: Index with sub-path
 * set(obj, 'users', 0, 'name', 'Alice')
 *
 * // Pattern 5: Multiple indices
 * set(obj, 'users', [0, 2, 4], 'active', true)
 *
 * // Pattern 6: Multiple keys
 * set(obj, 'settings', ['theme', 'language'], 'dark')
 *
 * // Pattern 7: Range
 * set(obj, 'users', {from: 0, to: 5, by: 2}, 'active', false)
 *
 * // Pattern 8: Filter function
 * set(obj, 'users', user => user.age > 18, 'eligible', true)
 *
 * // Pattern 9: Update object
 * set(obj, {users: [{name: 'Alice'}], count: 1})
 *
 * // Pattern 10: Multiple selectors
 * set(obj, ['users[0].name', 'users[1].name'], ['Alice', 'Bob'])
 */
export declare function set<T extends AnyObject, K extends SelectorFor<T> | (T extends any[] ? Indices : never), V extends DataParam<T, K> | (T extends any[] ? SelectorForIfIndices<T, K> : never)>(obj: T, key: K, value?: V): any;
export declare function set<T extends AnyObject, K extends SelectorFor<T> | (T extends any[] ? Indices : never), I extends T extends any[] ? K extends SelectorFor<T> ? 'K' : SelectorForIfIndices<T, 0> : Indices | Compare<T, K> | RangeCompare | (K extends Indices ? SelectorFor<T> : SelectorFor<Flattened<KeyOf<T, K>>>[]), V extends PropertyOrArrayValue<T, K, I extends Indices ? I : never> | Flattened<DataParam<T, K, I>>>(obj: T, key: K, index: I, value: V): any;
export declare function set<T extends AnyObject, K extends SelectorFor<T> | (T extends any[] ? Indices : never), I extends Indices | SelectorFor<Flattened<KeyOf<T, K>>>[], P extends FnPropertyKey<T, K> | PropertyValue<T, K, I extends Indices ? I : never>, V extends PropertyOrArrayValue<T, K, I extends Indices ? I : never, P> | CompareWithProperty<T, K, P>>(obj: T, key: K, indices: I, property: P, value: V): any;
export declare function set<T extends AnyObject, K extends SelectorFor<T> | (T extends any[] ? Indices : never), KK extends SelectorFor<Flattened<KeyOf<T, K>>>[], P extends FilteredFnPropertyKey<T, K, KK>, V extends PropertyValue<T, K, never, P>>(obj: T, key: K, stringKeys: KK, property: P, value: V): any;
export declare function set<T extends AnyObject, K extends SelectorFor<T> | (T extends any[] ? Indices : never), R extends RangeCompare | SelectorFor<Flattened<KeyOf<T, K>>>[], P extends FnPropertyKey<T, K>, V extends PropertyValue<T, K, never, P>>(obj: T, key: K, range: R, property: P, value: V): any;
export declare function set<T extends AnyObject, K extends SelectorFor<T> | (T extends any[] ? Indices : never), Fn extends Compare<T, K> | Indices, P extends FnPropertyKey<T, K>, V extends PropertyValue<T, K, never, P>>(obj: T, key: K, filterFn: Fn, property: P, value: V): any;
/**
 * utility function to check if an object is a range object
 * @param obj - The Object to check
 * @example
 * isRangeObject({ from: 0, to: 10 }); // true
 * isRangeObject({ from: 0, to: 10, by: 1 }); // true
 * isRangeObject({ from: 0, to: 10, by: '1' }); // true
 * isRangeObject({ by: 2 }); // false
 */
export declare function isRangeObject(obj: any): obj is SetterRange;
/**
 * Sets a value at a path
 * @param obj - The Object to set the value at
 * @param selector - The path to set the value at
 * @param value - The value to set
 * @param subPath - The subpath to set the value at
 * @returns The updated object
 * @example
 * setValueAtPath({ a: { b: { c: 1 } } }, 'a.b.c', 2); // { a: { b: { c: 2 } } }
 * setValueAtPath({ a: { b: { c: 1 } } }, 'a.b.c', (prev) => prev + 1); // { a: { b: { c: 2 } } }
 * setValueAtPath({ a: { b: { c: 1 } } }, 'a.b.c', 2, 'd'); // { a: { b: { c: { d: 2 } } } }
 * setValueAtPath({ a: { b: { c: 1 } } }, 'a.b.c', (prev) => prev + 1, 'd'); // { a: { b: { c: { d: 2 } } } }
 */
export declare function setValueAtPath<T extends AnyObject | any[], K extends SelectorFor<T> = SelectorFor<T>>(obj: T, selector: K, value: IValueOfKey<T, K> | ((prev: IValueOfKey<T, K>) => IValueOfKey<T, K>), subPath?: string): T;
/**
 * Sets value at index
 * @param obj - The Object to set the value at
 * @param selector - The path to set the value at
 * @param index - The index to set the value at
 * @param value - The value to set
 * @returns The updated object
 * @example
 * setValueAtIndex({ a: { b: [1, 2, 3] } }, 'a.b', 1, 4); // { a: { b: [1, 4, 3] } }
 * setValueAtIndex({ a: { b: [1, 2, 3] } }, 'a.b', 1, (prev) => prev + 1); // { a: { b: [1, 3, 3] } }
 * setValueAtIndex({ a: { b: [1, 2, 3] } }, 'a.b', 1, (prev) => prev + 1); // { a: { b: [1, 3, 3] } }
 */
export declare function setValueAtIndex<T extends AnyObject | any[], K extends SelectorFor<T> = SelectorFor<T>>(obj: T, selector: K, index: number, value: IValueOfKey<T, K> extends (infer U)[] ? U | Partial<U> | ((prev: U) => U | Partial<U>) : any): T;
/**
 * Sets value in a range
 * @param obj - The object to set the value on
 * @param selector - The selector to set the value at
 * @param range - The range to set the value in
 * @param value - The value to set
 * @example
 * const obj = { a: [1, 2, 3] };
 * setValueBetweenRange(obj, 'a', { from: 1, to: 2 }, 4);
 * console.log(obj); // { a: [1, 4, 4] }
 */
export declare function setValueBetweenRange<T extends AnyObject | any[], K extends SelectorFor<T> = SelectorFor<T>>(obj: T, selector: K, range: SetterRange, value: IValueOfKey<T, K> extends (infer U)[] ? U | Partial<U> | ((prev: U) => U | Partial<U>) : any): T;
/**
 * Sets value in a range with sub-path
 * @param obj - The object to set the value on
 * @param selector - The selector to set the value at
 * @param range - The range to set the value in
 * @param subPath - The sub-path to set the value at
 * @param value - The value to set
 * @example
 * const obj = { a: [1, 2, 3] };
 * setValueBetweenRangeWithSubPath(obj, 'a', { from: 1, to: 2 }, 'b', 4);
 * console.log(obj); // { a: [1, { b: 4 }, { b: 4 }] }
 */
export declare const setValueBetweenRangeWithSubPath: <T extends AnyObject | any[], K extends SelectorFor<T> = SelectorFor<T>>(obj: T, selector: K, range: SetterRange, subPath: string, value: any) => T;
/**
 * Casts properties to a given type
 */
export declare function castProps<T>(arr: any, props: any): T;
/**
 * Sets value for filtered items
 * @param obj - The object to modify.
 * @param selector - The selector for the property to modify.
 * @param filterFn - The filter function to apply to the items.
 * @param value - The value to set for the filtered items.
 * @example
 * const arr = [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }];
 * setValueWithFilter(arr, 'id', id => id === 1, { name: 'John Doe' });
 * console.log(arr); // [{ id: 1, name: 'John Doe' }, { id: 2, name: 'Jane' }]
 */
export declare function setValueWithFilter<T extends AnyObject | any[], K extends SelectorFor<T> = SelectorFor<T>>(obj: T, selector: K, filterFn: (item: IValueOfKey<T, K> extends (infer U)[] ? U : any, index: number) => boolean, value: IValueOfKey<T, K> extends (infer U)[] ? U | Partial<U> | ((prev: U) => U | Partial<U>) : any): T;
/**
 * Sets value for filtered items with sub-path
 * @param obj - The object to modify.
 * @param selector - The selector for the property to modify.
 * @param filterFn - The filter function to apply to the items.
 * @param subPath - The sub-path to modify.
 * @param value - The value to set for the filtered items.
 * @example
 * const arr = [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }];
 * setValueWithFilterWithSubPath(arr, 'id', id => id === 1, 'name', 'John Doe');
 * console.log(arr); // [{ id: 1, name: 'John Doe' }, { id: 2, name: 'Jane' }]
 */
export declare function setValueWithFilterWithSubPath<T extends AnyObject | any[], K extends SelectorFor<T> = SelectorFor<T>>(obj: T, selector: K, filterFn: (item: IValueOfKey<T, K> extends (infer U)[] ? U : any, index: number) => boolean, subPath: string, value: any): T;
/**
 * Merge update object at path
 * @param obj - The object to update
 * @param selector - The path to the object to update
 * @param updates - The object to merge with the existing object
 * @example
 * const obj = { a: { b: { c: 1 } } };
 * mergeUpdateAtPath(obj, 'a.b', { c: 2 });
 * console.log(obj); // { a: { b: { c: 2 } } }
 */
export declare function mergeUpdateAtPath<T extends AnyObject | any[], K extends SelectorFor<T> = SelectorFor<T>>(obj: T, selector: K, updates: IValueOfKey<T, K> extends AnyObject ? Partial<IValueOfKey<T, K>> : any): T;
/**
 * Set with array selectors
 * @param obj - The object to update
 * @param selectors - The array of paths to update
 * @param value - The value to set for each path
 * @example
 * const obj = { a: { b: { c: 1 } } };
 * setValueWithArraySelectors(obj, ['a.b', 'a.c'], { d: 2 });
 * console.log(obj); // { a: { b: { d: 2 }, c: { d: 2 } } }
 */
export declare function setValueWithArraySelectors<T extends AnyObject | any[]>(obj: T, selectors: string[], value: any): T;
/**
 * Gets value at path with createMissing option
 * @param obj - The object to get the value from.
 * @param selector - The path to the value.
 * @param options - Options for the operation.
 * @returns The value at the path.
 * @example
 * const a = { b: { c: 1 } };
 * ValueOfKey(a, 'b.c', { createMissing: true });
 * console.log(a); // 1
 */
export declare function ValueOfKey<T extends AnyObject | any[], K extends SelectorFor<T> | string>(obj: T, selector: K, options?: {
    createMissing?: boolean;
    add?: boolean;
    debug?: boolean;
}): any;
/**
 * Sets value at path (internal)
 */
export declare const setAtPath: <T extends AnyObject | any[], K extends string = string>(obj: T, selector: K, value: any, options?: {
    createMissing?: boolean;
}) => T;
/**
 * Creates a nested object structure from a path string
 *
 * This function generates an object hierarchy based on a path selector and assigns
 * a value at the deepest level. It builds the structure from the inside out,
 * handling properties, array indices, wildcards, and other selector types.
 *
 * @template T - The expected return type
 * @param path - The path string describing the structure to create
 * @param value - The value to place at the end of the path (optional)
 * @returns The generated object/array structure, or undefined if no segments
 *
 * @example
 * // Simple nested object
 * fromPath('user.profile.name', 'John')
 * // Returns: { user: { profile: { name: 'John' } } }
 *
 * @example
 * // Array with specific index
 * fromPath('users[0].name', 'Alice')
 * // Returns: { users: [{ name: 'Alice' }] }
 *
 * @example
 * // Array with wildcard
 * fromPath('items[*].active', true)
 * // Returns: { items: [true] }
 *
 * @example
 * // Deep nested with arrays
 * fromPath('company.departments[2].manager.name', 'Bob')
 * // Returns: { company: { departments: [undefined, undefined, { manager: { name: 'Bob' } }] } }
 *
 * @example
 * // Single property
 * fromPath('count', 42)
 * // Returns: { count: 42 }
 */
export declare const fromPath: <T extends AnyObject>(path: string, value?: any) => T | T[] | (T | T[])[] | undefined;
/**
 * Selects values from an object (legacy method, uses get internally)
 * @deprecated Use get() instead
 */
export declare const select: <T extends AnyObject, S extends SelectorFor<T>>(obj: T, selector: S, options?: SelectorOptions) => T | T[] | (T | T[])[] | undefined;
/**
 * Checks if a selector matches any value in object
 * @param obj - Source object
 * @param selector - Selector string or array
 * @param options - Selector options
 * @returns True if selector matches at least one value (or array of booleans for array selector)
 */
export declare const has: <T extends AnyObject, S extends SelectorFor<T>, O extends SelectorOptions>(obj: T, selector: S, options?: O) => boolean | boolean[];
/**
 * Deletes values from object using selector
 * @param obj - Target object
 * @param selector - Selector string or array
 * @param options - Selector options
 * @returns True if any values were deleted (or array of booleans for array selector)
 */
export declare const deletePath: <T extends AnyObject, S extends SelectorFor<T>, O extends SelectorOptions>(obj: T, selector: S, options?: O) => boolean | boolean[];
/**
 * Gets all matching paths from an object
 * @param obj - Source object
 * @param selector - Selector string or array (optional, if not provided returns all paths)
 * @param options - Selector options
 * @returns Array of path strings
 */
export declare const getPaths: <T extends AnyObject, S extends SelectorFor<T>, O extends SelectorOptions & {
    format?: "selector" | "string";
}>(obj: T, selector?: S, options?: O) => SelectorFor<T>[];
/**
 * Finds all paths that match a predicate
 * @param obj - Source object
 * @param predicate - Function to test each path/value pair
 * @returns Array of matching path strings
 * @example
 * findPaths({a: 1, b: {c: 2}}, (path, value) => value === 2) // ['b.c']
 */
export declare const findPaths: <T extends AnyObject, P extends <P_1 extends SelectorFor<T>, V extends IValueOfKey<T, P_1>>(path: P_1, value: V) => boolean>(obj: T, predicate: P) => string[];
/**
 * Flattens an object with array notation in keys
 * @param obj - Source object
 * @param separator - Separator for nested keys (default: '.')
 * @returns Flattened object with array notation
 * @example
 * flattenWithArrays({a: [{b: 1}, {b: 2}]}) // {'a[0].b': 1, 'a[1].b': 2}
 */
export declare const flattenWithArrays: (obj: AnyObject, separator?: string) => AnyObject;
/**
 * Unflattens an object with array notation in keys
 * @param obj - Source object
 * @returns Unflattened object
 * @example
 * unflattenWithArrays({'a[0].b': 1, 'a[1].b': 2}) // {a: [{b: 1}, {b: 2}]}
 */
export declare const unflattenWithArrays: (obj: AnyObject) => AnyObject;
/**
 * Merges objects with array notation support for paths
 * @param objects - Objects to merge
 * @returns Merged object
 */
export declare const deepMergeWithArrays: <T extends AnyObject[]>(...objects: T) => AnyObject;
/**
 * Traverse with path tracking
 * @param current - Current value
 * @param segments - Selector segments
 * @param depth - Current depth
 * @param maxDepth - Maximum depth
 * @param currentPath - Current path array
 * @param currentStringPath - Current string path array
 * @returns Array of values with paths
 * @example
 * traverseWithPaths({ a: { b: 1 } }, ['a', 'b'], 0, 2);
 * // [{ value: 1, path: 'a.b', stringPath: 'a.b' }]
 */
export declare function traverseWithPaths(current: any, segments: SelectorSegment[], depth: number, maxDepth: number, currentPath?: SelectorSegment[], currentStringPath?: string[]): Array<{
    value: any;
    path: string;
    stringPath: string;
}>;
/**
 * Updates a value at a path using a transformation function
 * @param obj - Target object
 * @param path - Path string
 * @param updater - Function to transform the current value
 * @returns Modified object
 * @example
 * update({a: {b: 1}}, 'a.b', (val) => val + 1) // {a: {b: 2}}
 * update({items: [{count: 1}]}, 'items[0].count', (count) => count * 2) // {items: [{count: 2}]}
 */
export declare const update: <T extends AnyObject, K extends SelectorFor<T>>(obj: T, path: K, updater: Callback<IValueOfKey<T, K>>) => T;
export declare const updateWithCallBack: <T extends AnyObject, K extends SelectorFor<T>>(obj: T, updater: Callback<T>) => T;
/**
 * Gets the type of value at a path
 * @param obj - Source object
 * @param path - Path string
 * @returns Type string or undefined
 * @example
 * getTypeAtPath({a: [{b: 1}]}, 'a[0].b') // 'number'
 * getTypeAtPath({a: null}, 'a.b') // undefined
 */
export declare const getTypeAtPath: (obj: AnyObject, path: string) => string | undefined;
export {};
//# sourceMappingURL=getter-setter.d.ts.map