import { mergeArraysByKey } from '../array/advanced.js';
import { isPrimitive } from '../helpers.js';
import { deepClone } from './clone.js';
import { applyDiff } from './diff.js';
import { deepMerge, mergeIntoStructure } from './merge.js';
import { parseSelector, stringifySelector } from './selector.js';
import type {
  AnyObject,
  ArrayFnParam,
  Callback,
  Compare,
  CompareWithProperty,
  DataParam,
  FilteredFnPropertyKey,
  Flattened,
  FnPropertyKey,
  Indices,
  IValueOfKey,
  KeyOf,
  ParamUpdateValue,
  PropertyOrArrayValue,
  PropertyValue,
  RangeCompare,
  SelectorFor,
  SelectorForIfIndices,
  SelectorOptions,
  SelectorSegment,
  SetterRange,
} from './types.js';
import { isObject, traverseStructure } from './utils.js';

type A<T> = T extends AnyObject ? T : never;
/**
 * Setter interface for advanced object manipulation
 *
 */
export interface SetterType<T> {
  <
    K extends SelectorFor<A<T>> | (A<T> extends any[] ? Indices : never),
    V extends
      | DataParam<A<T>, K>
      | (A<T> extends any[] ? SelectorForIfIndices<A<T>, K> : never)
  >(
    obj: A<T>,
    key: K,
    value?: V
  ): any;

  <
    K extends SelectorFor<A<T>> | (A<T> extends any[] ? Indices : never),
    I extends A<T> extends any[]
      ? K extends SelectorFor<A<T>>
        ? 'K'
        : SelectorForIfIndices<A<T>, 0>
      :
          | Indices
          | Compare<A<T>, K>
          | RangeCompare
          | (K extends Indices
              ? SelectorFor<A<T>>
              : SelectorFor<Flattened<KeyOf<A<T>, K>>>[]),
    V extends
      | PropertyOrArrayValue<A<T>, K, I extends Indices ? I : never>
      | Flattened<DataParam<A<T>, K, I>>
  >(
    obj: A<T>,
    key: K,
    index: I,
    value: V
  ): any;
  <
    K extends SelectorFor<A<T>> | (A<T> extends any[] ? Indices : never),
    I extends Indices | SelectorFor<Flattened<KeyOf<A<T>, K>>>[],
    P extends
      | FnPropertyKey<A<T>, K>
      | PropertyValue<A<T>, K, I extends Indices ? I : never>,
    V extends
      | PropertyOrArrayValue<A<T>, K, I extends Indices ? I : never, P>
      | CompareWithProperty<A<T>, K, P>
  >(
    obj: A<T>,
    key: K,
    indices: I,
    property: P,
    value: V
  ): any;
  <
    K extends SelectorFor<A<T>> | (A<T> extends any[] ? Indices : never),
    KK extends SelectorFor<Flattened<KeyOf<A<T>, K>>>[],
    P extends FilteredFnPropertyKey<A<T>, K, KK>,
    V extends PropertyValue<A<T>, K, never, P>
  >(
    obj: A<T>,
    key: K,
    stringKeys: KK,
    property: P,
    value: V
  ): any;

  <
    K extends SelectorFor<A<T>> | (A<T> extends any[] ? Indices : never),
    R extends RangeCompare | SelectorFor<Flattened<KeyOf<A<T>, K>>>[],
    P extends FnPropertyKey<A<T>, K>,
    V extends PropertyValue<A<T>, K, never, P>
  >(
    obj: A<T>,
    key: K,
    range: R,
    property: P,
    value: V
  ): any;
}

type S<T, K> = SelectorFor<Flattened<Flattened<IValueOfKey<A<T>, K>>>>;

type Primitive = string | number | boolean | Date | null | undefined;

export interface SetterParamsType<T> {
  <
    V extends ParamUpdateValue<T>
    // | Callback<A<T>> | A<T>
    // | (T extends Primitive ? ParamUpdateValue<T> : never)
  >(
    value: V
  ): any;
  <
    K extends
      | SelectorFor<A<T>>
      | (A<T> extends any[] ? Indices : never)
      | SelectorFor<Flattened<KeyOf<T, K>>>[],
    V extends
      | DataParam<A<T>, K>
      | (A<T> extends any[] ? SelectorForIfIndices<A<T>, K> : never)
  >(
    key: K,
    value: V
  ): any;

  <
    K extends
      | SelectorFor<A<T>>
      | (A<T> extends any[] ? Indices : never)
      | SelectorFor<Flattened<KeyOf<T, K>>>[],
    I extends A<T> extends any[]
      ? K extends SelectorFor<A<T>>
        ? S<A<T>, K>[]
        : SelectorForIfIndices<A<T>, 0>
      :
          | Indices
          | Compare<A<T>, K>
          | RangeCompare
          | (K extends Indices ? SelectorFor<A<T>> : S<A<T>, K>[]),
    V extends
      | PropertyOrArrayValue<A<T>, K, I extends Indices ? I : never>
      | (I extends S<A<T>, K>[]
          ? Flattened<ArrayFnParam<A<T>, K, I>>
          : Flattened<DataParam<A<T>, K, I>>)
  >(
    key: K,
    index: I,
    value: V
  ): any;
  <
    K extends
      | SelectorFor<A<T>>
      | (A<T> extends any[] ? Indices : never)
      | SelectorFor<Flattened<KeyOf<T, K>>>[],
    I extends Indices | S<A<T>, K>[],
    P extends
      | FnPropertyKey<A<T>, K>
      | PropertyValue<A<T>, K, I extends Indices ? I : never>,
    V extends
      | PropertyOrArrayValue<A<T>, K, I extends Indices ? I : never, P>
      | CompareWithProperty<A<T>, K, P>
  >(
    key: K,
    indices: I,
    property: P,
    value: V
  ): any;
  <
    K extends
      | SelectorFor<A<T>>
      | (A<T> extends any[] ? Indices : never)
      | S<A<T>, K>[],
    KK extends S<A<T>, K>[],
    P extends FilteredFnPropertyKey<A<T>, K, KK>,
    V extends PropertyValue<A<T>, K, never, P>
  >(
    key: K,
    stringKeys: KK,
    property: P,
    value: V
  ): any;

  <
    K extends
      | SelectorFor<A<T>>
      | (A<T> extends any[] ? Indices : never)
      | S<A<T>, K>[],
    R extends RangeCompare | SelectorFor<Flattened<KeyOf<A<T>, K>>>[],
    P extends FnPropertyKey<A<T>, K>,
    V extends PropertyValue<A<T>, K, never, P>
  >(
    key: K,
    range: R,
    property: P,
    value: V
  ): any;
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
export function get<T extends AnyObject, S extends SelectorFor<T>>(
  obj: T,
  selector?: S,
  options: SelectorOptions & {
    preserveStructure?: boolean;
    multiple?: boolean;
  } = {}
): T | undefined {
  const {
    preserveStructure,
    multiple,
    throwOnError = false,
    defaultValue,
    maxDepth = 20,
  } = options;

  if (!obj || typeof obj !== 'object') {
    return defaultValue as T;
  }

  // If no selector provided, return the object
  if (!selector) {
    return obj as T;
  }
  // console.log('try to get', selector)

  // Handle array of selectors
  if (Array.isArray(selector)) {
    if (preserveStructure) {
      // Return an object with all selected paths
      const result: AnyObject = {};
      for (const sel of selector) {
        const value = get(obj, sel, { ...options, preserveStructure: false });
        if (value !== undefined) {
          // Merge the value into result preserving structure
          mergeIntoStructure(result, sel, value);
        }
      }
      return result as T;
    } else {
      // Return array of values
      return selector.map((sel) =>
        get(obj as any, sel as any, { ...options, preserveStructure: false })
      ) as any as T;
    }
  }

  const segments = parseSelector(selector, { ...options, throwOnError });
  // console.log('segments', segments)
  if (segments.length === 0) {
    return obj as T;
  }
  if (typeof preserveStructure === 'undefined' || preserveStructure === false) {
    // console.log('p')
    const v = ValueOfKey(obj, selector);
    if (multiple === false && Array.isArray(v)) {
      return v[0];
    }
    if (v === undefined && defaultValue !== undefined) {
      return defaultValue as T;
    }
    return v;
  }

  // Get structured result
  const result = traverseStructure(obj, segments, 0, maxDepth);

  if (result === undefined && defaultValue !== undefined) {
    return defaultValue as T;
  }

  return result as T;
}

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
export function set<
  T extends AnyObject,
  K extends SelectorFor<T> | (T extends any[] ? Indices : never),
  V extends
    | DataParam<T, K>
    | (T extends any[] ? SelectorForIfIndices<T, K> : never)
>(obj: T, key: K, value?: V): any;
export function set<
  T extends AnyObject,
  K extends SelectorFor<T> | (T extends any[] ? Indices : never),
  I extends T extends any[]
    ? K extends SelectorFor<T>
      ? 'K'
      : SelectorForIfIndices<T, 0>
    :
        | Indices
        | Compare<T, K>
        | RangeCompare
        | (K extends Indices
            ? SelectorFor<T>
            : SelectorFor<Flattened<KeyOf<T, K>>>[]),
  V extends
    | PropertyOrArrayValue<T, K, I extends Indices ? I : never>
    | Flattened<DataParam<T, K, I>>
>(obj: T, key: K, index: I, value: V): any;
// 4. Array indices + property
export function set<
  T extends AnyObject,
  K extends SelectorFor<T> | (T extends any[] ? Indices : never),
  I extends Indices | SelectorFor<Flattened<KeyOf<T, K>>>[],
  P extends
    | FnPropertyKey<T, K>
    | PropertyValue<T, K, I extends Indices ? I : never>,
  V extends
    | PropertyOrArrayValue<T, K, I extends Indices ? I : never, P>
    | CompareWithProperty<T, K, P>
>(obj: T, key: K, indices: I, property: P, value: V): any;
export function set<
  T extends AnyObject,
  K extends SelectorFor<T> | (T extends any[] ? Indices : never),
  KK extends SelectorFor<Flattened<KeyOf<T, K>>>[],
  P extends FilteredFnPropertyKey<T, K, KK>,
  V extends PropertyValue<T, K, never, P>
>(obj: T, key: K, stringKeys: KK, property: P, value: V): any;

export function set<
  T extends AnyObject,
  K extends SelectorFor<T> | (T extends any[] ? Indices : never),
  R extends RangeCompare | SelectorFor<Flattened<KeyOf<T, K>>>[],
  P extends FnPropertyKey<T, K>,
  V extends PropertyValue<T, K, never, P>
>(obj: T, key: K, range: R, property: P, value: V): any;

export function set<
  T extends AnyObject,
  K extends SelectorFor<T> | (T extends any[] ? Indices : never),
  Fn extends Compare<T, K> | Indices,
  P extends FnPropertyKey<T, K>,
  V extends PropertyValue<T, K, never, P>
>(obj: T, key: K, filterFn: Fn, property: P, value: V): any;
// Implementation
export function set(
  obj: any,
  first?: any,
  second?: any,
  third?: any,
  fourth?: any
): any {
  // if (params.length === 0) return obj;

  const params = [] as any[];
  if (typeof first !== 'undefined') params.push(first);
  if (typeof second !== 'undefined') params.push(second);
  if (typeof third !== 'undefined') params.push(third);
  if (typeof fourth !== 'undefined') params.push(fourth);

  if (isPrimitive(obj)) {
    if (typeof first === 'function') {
      return first(obj);
    }
    return first;
  }
  // const [first, second, third, fourth, fifth] = params;

  // Pattern 1 & 2: set(obj, "path", value) or set(obj, "path", updateFunction)
  // console.log('set v', first, second, params.length);

  if (params.length === 1) {
    if (typeof params[0] === 'function') {
      return updateWithCallBack(obj, params[0]);
    }

    obj = params[0];
    if (Array.isArray(params[0])) {
      if (Array.isArray(obj)) {
        if (first.length === 0) {
          for (let i = 0; i < obj.length; i++) {
            obj.pop();
          }
        } else {
          // for (let i = 0; i < obj.length; i++) {
          //   obj.pop();
          // }
          // obj.push(...params[0]);
          obj = params[0];
          // console.log('params', params);
          return obj;
          // if (obj.length > 0) {
          //   mergeArraysByKey([obj, params[0] as any], 'id');
          // } else {
          //   obj.push(...params[0]);
          // }
        }
      }
      // updateWithCallBack(obj, (value) => );
    } else if (typeof params[0] === 'object' && !Array.isArray(params[0])) {
      if (typeof obj === 'object' && !Array.isArray(obj)) {
        deepMerge(obj, params[0]);
      }
      // if (Array.isArray(obj)) {
      //   obj.push(params[0]);
      // } else {
      //   obj = { ...obj, ...params[0] };
      // }
      // return updateWithCallBack(obj, (value) => ({ ...value, ...params[0] }));
    } else {
      obj = params[0];
    }

    return obj;
    // return updateWithCallBack(obj, (value) => params[0]);
  }

  if (Array.isArray(obj)) {
    if (
      typeof first === 'string' &&
      (isArrayOfString(second) || typeof second === 'string') &&
      params.length === 3
    ) {
      if (Array.isArray(second)) {
        for (let i = 0; i < second.length; i++) {
          setValueAtPath(obj, first, third, second[i]);
        }

        return obj;
      }
      return setValueAtPath(obj, first, third, second as any);
    }
    if (
      typeof first === 'string' &&
      typeof second === 'function' &&
      params.length === 2
    ) {
      return setValueAtPath(obj, first, second);
    }
  }

  // if (Array.isArray(obj) && typeof second === 'object') {
  //   console.log('items', obj, first, second);
  // }
  if (
    typeof first === 'string' &&
    (params.length === 2 || params.length === 3)
  ) {
    if (isRangeObject(second)) {
      return setValueBetweenRange(
        obj,
        first as any,
        second as any,
        third as any
      );
    }
    // console.log('len 1', params.length);
    if (typeof second === 'number' && typeof third !== 'undefined') {
      return setValueAtIndex(obj, first, second, third as any);
    }
    if (
      Array.isArray(second) &&
      second.length > 0 &&
      second.every((s) => typeof s === 'number')
    ) {
      return setValueWithIndices(obj, first, second as any, third as any);
    }

    if (typeof third !== 'undefined' && typeof second === 'function') {
      return setValueWithFilter(obj, first as any, second as any, third as any);
    }
    return setValueAtPath(obj, first, second as any, third as any);
  }
  // Pattern 3 & 4: set(obj, "path", index, value) or set(obj, "path", index, subPath, value)
  if (typeof first === 'string' && typeof second === 'number') {
    // console.log('len 2')
    if (params.length === 3) {
      return setValueAtIndex(obj, first, second, third as any);
    } else if (params.length === 4) {
      return setIndexWithSubPath(
        obj,
        first,
        second,
        third as any,
        fourth as any
      );
    }
  }

  // Pattern 5 & 6: set(obj, "path", indices, value) or set(obj, "path", indices, subPath, value)
  if (typeof first === 'string' && Array.isArray(second)) {
    if (params.length === 3) {
      return setValueWithIndices(obj, first, second as any, third as any);
    } else if (params.length === 4) {
      return setValueWithIndicesWithSubPath(
        obj,
        first,
        second as any,
        third as any as string,
        fourth as any
      );
    }
  }

  // Pattern 7 & 8: set(obj, "path", range, value) or set(obj, "path", range, subPath, value)
  if (
    typeof first === 'string' &&
    typeof second === 'object' &&
    !Array.isArray(second) &&
    second !== null
  ) {
    const range = second as SetterRange;
    if ('from' in range || 'to' in range) {
      if (params.length === 3) {
        return setValueBetweenRange(obj, first, range, third as any);
      } else if (params.length === 4) {
        return setValueBetweenRangeWithSubPath(
          obj,
          first,
          range,
          third as any as string,
          fourth as any
        );
      }
    }
  }

  // Pattern 9: set(obj, updateObject)
  if (
    typeof first === 'object' &&
    !Array.isArray(first) &&
    params.length === 1
  ) {
    return deepMerge(obj, first);
  }

  // Pattern 10: set(obj, "path", updateObject)
  if (
    typeof first === 'string' &&
    typeof second === 'object' &&
    !Array.isArray(second) &&
    params.length === 2
  ) {
    return mergeUpdateAtPath(obj, first, second);
  }

  // console.log('we here', params.length)
  // Pattern 11 & 12: set(obj, "path", filter, value) or set(obj, "path", filter, subPath, value)
  if (typeof first === 'string' && typeof second === 'function') {
    if (params.length === 3) {
      // console.log('set filter')
      return setValueWithFilter(
        obj,
        first,
        second as (item: any) => boolean,
        third as any
      );
    } else if (params.length === 4) {
      return setValueWithFilterWithSubPath(
        obj,
        first,
        second as (item: any) => boolean,
        third as any as string,
        fourth as any
      );
    }
  }

  // Pattern 13: Array selectors
  if (Array.isArray(first)) {
    if (
      params.length === 2 &&
      typeof second === 'object' &&
      !Array.isArray(second)
    ) {
      // Array of selectors with update object
      return setValueWithArraySelectors(obj, first as string[], second);
    } else if (params.length === 2) {
      // Array of selectors with single value
      return setValueWithArraySelectors(obj, first as string[], second as any);
    }
  }

  console.log('params not found', params);
  throw new Error(`Invalid set parameters: ${JSON.stringify(params)}`);
}

function handleFunctionParams(
  selector: string,
  data: any,
  value: any,
  isArray = false
) {
  const paths = parseSelector(selector);
  const isWildcard = paths[paths.length - 1].type === 'wildcard';
  const containWildcard =
    paths.some((path) => path.type === 'wildcard') && Array.isArray(data);
  let finalValue;
  if (
    isWildcard ||
    (containWildcard && isArray) ||
    (containWildcard && paths.length === 2)
  ) {
    if (Array.isArray(data)) {
      for (let i = 0; i < data.length; i++) {
        const v =
          typeof value === 'function'
            ? value(data[i])
            : typeof data[i] === 'object'
            ? deepMerge(data[i], value)
            : value;
        if (!finalValue) finalValue = [];
        finalValue.push(v);
      }
    } else {
      console.log('is wildcard but not array');
    }
  }
  if (!isWildcard && !finalValue) {
    finalValue = typeof value === 'function' ? value(data) : value;
  }
  if (selector === 'person.wife.childs') {
    console.log('final', { finalValue, data, value });
  }

  return finalValue;
}

/**
 * utility function to check if an object is a range object
 * @param obj - The Object to check
 * @example
 * isRangeObject({ from: 0, to: 10 }); // true
 * isRangeObject({ from: 0, to: 10, by: 1 }); // true
 * isRangeObject({ from: 0, to: 10, by: '1' }); // true
 * isRangeObject({ by: 2 }); // false
 */
export function isRangeObject(obj: any): obj is SetterRange {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'from' in obj &&
    'to' in obj &&
    typeof obj.from === 'number' &&
    typeof obj.to === 'number' &&
    obj.from < obj.to &&
    obj.from >= 0 &&
    obj.to > 0
  );
}

function isArrayOfString(value: any): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

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
export function setValueAtPath<
  T extends AnyObject | any[],
  K extends SelectorFor<T> = SelectorFor<T>
>(
  obj: T,
  selector: K,
  value: IValueOfKey<T, K> | ((prev: IValueOfKey<T, K>) => IValueOfKey<T, K>),
  subPath?: string
): T {
  // console.log('set value', selector);
  const paths = parseSelector(selector);
  let target = ValueOfKey(obj, selector, {
    paths,
    createMissing: true,
  } as any);
  if (selector === 'person.wife.childs') {
    console.log('set at p', target, value);
  }
  let get_value;
  if (subPath) {
    if (typeof value === 'function') {
      get_value = get(target, subPath);
    }
  }
  const data = subPath ? get_value : target;
  const finalValue = handleFunctionParams(
    selector,
    data,
    value,
    Array.isArray(obj)
  );
  // if (selector === '[*]') {
  //   console.log('finalValue', finalValue, selector);
  // }

  if (subPath) {
    const result = setAtPath(obj, `${selector}.${subPath}`, finalValue, {
      createMissing: true,
    });
    return result;
  } else {
    const r = setAtPath(obj, selector, finalValue, { createMissing: true });
    // if (selector === '[*]') {
    //   // console.log('r', r);
    //   // console.log('r', obj);
    // }
    // console.log('r', obj);
    return r;
  }
}

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
export function setValueAtIndex<
  T extends AnyObject | any[],
  K extends SelectorFor<T> = SelectorFor<T>
>(
  obj: T,
  selector: K,
  index: number,
  value: IValueOfKey<T, K> extends (infer U)[]
    ? U | Partial<U> | ((prev: U) => U | Partial<U>)
    : any
): T {
  const target = ValueOfKey(obj, selector, { createMissing: true });
  if (!Array.isArray(target)) {
    throw new Error(`Target at ${selector} is not an array ${index}`);
  }
  const target_copy = structuredClone(target);
  const finalValue = handleFunctionParams(selector, target_copy[index], value);

  if (index < 0) {
    // Negative index counts from end
    const actualIndex = target.length + index;
    if (actualIndex < 0) {
      throw new Error(`Index ${index} is out of bounds`);
    }
    return setAtPath(obj, `${selector}[${actualIndex}]`, finalValue, {
      createMissing: true,
    });
  }

  // console.log('set index', index, `${selector}[${index}]`)
  return setAtPath(obj, `${selector}[${index}]`, finalValue, {
    createMissing: true,
  });
}

/**
 * Sets value at index with sub-path
 * @param obj - The object to set the value on
 * @param selector - The selector to set the value at
 * @param index - The index to set the value at
 * @param subPath - The sub-path to set the value at
 * @param value - The value to set
 * @example
 * const obj = { a: [1, 2, 3] };
 * setIndexWithSubPath(obj, 'a', 1, 'b', 4);
 * console.log(obj); // { a: [1, { b: 4 }, 3] }
 */
const setIndexWithSubPath = <
  T extends AnyObject | any[],
  K extends SelectorFor<T> = SelectorFor<T>
>(
  obj: T,
  selector: K,
  index: number,
  subPath: string,
  value: any
): T => {
  // console.log('sub is fn', {obj, selector, index, subPath, value});
  if (typeof subPath === 'function') {
    return setValueAtPath(obj, `${selector}[${index}]` as any, subPath);
  }
  if (typeof subPath === 'string') {
    return setValueAtPath(obj, `${selector}[${index}]` as any, value, subPath);
  }
  return null as any;
};

/**
 * Sets value at multiple indices
 * @param obj - The object to set the value on
 * @param selector - The selector to set the value at
 * @param indices - The indices to set the value at
 * @param value - The value to set
 * @example
 * const obj = { a: [1, 2, 3] };
 * setValueWithIndices(obj, 'a', [1, 2], 4);
 * console.log(obj); // { a: [1, 4, 4] }
 */
const setValueWithIndices = <
  T extends AnyObject | any[],
  K extends SelectorFor<T> = SelectorFor<T>
>(
  obj: T,
  selector: K,
  indices: (number | string)[],
  value: IValueOfKey<T, K> extends (infer U)[]
    ? U | Partial<U> | ((prev: U) => U | Partial<U>)
    : any
): T => {
  const target = ValueOfKey(obj, selector);
  // console.log('setting index', target)
  if (!Array.isArray(target)) {
    throw new Error(`Target at ${selector} is not an array`);
  }

  for (const index of indices) {
    if (typeof index === 'number') {
      setValueAtIndex(obj, selector, index, value as any);
    } else if (typeof index === 'string') {
      setValueAtPath(obj, selector as any, value as any, index);
    }
  }

  return obj;
};

/**
 * Sets value at multiple indices with sub-path
 * @param obj - The object to set the value on
 * @param selector - The selector to set the value at
 * @param indices - The indices to set the value at
 * @param subPath - The sub-path to set the value at
 * @param value - The value to set
 * @example
 * const obj = { a: [1, 2, 3] };
 * setValueWithIndicesWithSubPath(obj, 'a', [1, 2], 'b', 4);
 * console.log(obj); // { a: [1, { b: 4 }, { b: 4 }] }
 */
const setValueWithIndicesWithSubPath = <
  T extends AnyObject | any[],
  K extends SelectorFor<T> = SelectorFor<T>
>(
  obj: T,
  selector: K,
  indices: number[],
  subPath: string,
  value: any
): T => {
  const updater = (prev: any) => {
    const newValue =
      typeof value === 'function'
        ? value(prev ? ValueOfKey(prev, subPath) : undefined)
        : value;
    const result = prev ? { ...prev } : {};
    setAtPath(result, subPath, newValue);
    return result;
  };
  return setValueWithIndices(obj, selector, indices, updater as any);
};

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
export function setValueBetweenRange<
  T extends AnyObject | any[],
  K extends SelectorFor<T> = SelectorFor<T>
>(
  obj: T,
  selector: K,
  range: SetterRange,
  value: IValueOfKey<T, K> extends (infer U)[]
    ? U | Partial<U> | ((prev: U) => U | Partial<U>)
    : any
): T {
  const target = ValueOfKey(obj, selector);
  if (!Array.isArray(target)) {
    throw new Error(`Target at ${selector} is not an array`);
  }

  const from = range.from ?? 0;
  const to = range.to ?? target.length - 1;
  const by = range.by ?? 1;

  const indices: number[] = [];
  for (let i = from; i <= to; i += by) {
    if (i >= 0 && i < target.length) {
      indices.push(i);
    }
  }

  return setValueWithIndices(obj, selector, indices, value);
}

function getValueFnParams(prev: any, subPath: string) {
  return prev ? ValueOfKey(prev, subPath) : undefined;
}

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
export const setValueBetweenRangeWithSubPath = <
  T extends AnyObject | any[],
  K extends SelectorFor<T> = SelectorFor<T>
>(
  obj: T,
  selector: K,
  range: SetterRange,
  subPath: string,
  value: any
): T => {
  const updater = (prev: any) => {
    const newValue =
      typeof value === 'function'
        ? value(prev ? ValueOfKey(prev, subPath) : undefined)
        : value;
    const result = prev ? { ...prev } : {};
    setAtPath(result, subPath, newValue);
    return result;
  };
  return setValueBetweenRange(obj, selector, range, updater as any);
};

type ArrayObject<T, P extends object> = T[] & P;

/**
 * Casts properties to a given type
 */
export function castProps<T>(arr: any, props: any): T {
  return Object.assign(arr, props) as T;
  // return arr as T;
}

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
export function setValueWithFilter<
  T extends AnyObject | any[],
  K extends SelectorFor<T> = SelectorFor<T>
>(
  obj: T,
  selector: K,
  filterFn: (
    item: IValueOfKey<T, K> extends (infer U)[] ? U : any,
    index: number
  ) => boolean,
  value: IValueOfKey<T, K> extends (infer U)[]
    ? U | Partial<U> | ((prev: U) => U | Partial<U>)
    : any
): T {
  const target = ValueOfKey(obj, selector);
  if (!Array.isArray(target)) {
    throw new Error(`Target at ${selector} is not an array`);
  }

  const indices: number[] = [];
  const target_copy = [...target];
  target.forEach((item, index) => {
    if (filterFn(item, index)) {
      // console.log('set filter for done', index)
      indices.push(index);
    }
  });

  return setValueWithIndices(obj, selector, indices, value);
}

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
export function setValueWithFilterWithSubPath<
  T extends AnyObject | any[],
  K extends SelectorFor<T> = SelectorFor<T>
>(
  obj: T,
  selector: K,
  filterFn: (
    item: IValueOfKey<T, K> extends (infer U)[] ? U : any,
    index: number
  ) => boolean,
  subPath: string,
  value: any
): T {
  const updater = (prev: any) => {
    const newValue =
      typeof value === 'function'
        ? value(prev ? ValueOfKey(prev, subPath) : undefined)
        : value;
    const result = prev ? { ...prev } : {};
    setAtPath(result, subPath, newValue);
    return result;
  };
  return setValueWithFilter(obj, selector, filterFn, updater as any);
}

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
export function mergeUpdateAtPath<
  T extends AnyObject | any[],
  K extends SelectorFor<T> = SelectorFor<T>
>(
  obj: T,
  selector: K,
  updates: IValueOfKey<T, K> extends AnyObject
    ? Partial<IValueOfKey<T, K>>
    : any
): T {
  const current = ValueOfKey(obj, selector, { createMissing: true });
  const merged = deepMerge(current || {}, updates);
  return setAtPath(obj, selector, merged, { createMissing: true });
}

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
export function setValueWithArraySelectors<T extends AnyObject | any[]>(
  obj: T,
  selectors: string[],
  value: any
): T {
  if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
    // Update object for multiple selectors
    for (const [path, val] of Object.entries(value)) {
      if (selectors.includes(path)) {
        setAtPath(obj, path, val, { createMissing: true });
      }
    }
  } else {
    // Single value for all selectors
    for (const selector of selectors) {
      const finalValue = handleFunctionParams(
        selector,
        ValueOfKey(obj, selector),
        value
      );

      setAtPath(obj, selector, finalValue, { createMissing: true });
    }
  }
  return obj;
}

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
export function ValueOfKey<
  T extends AnyObject | any[],
  K extends SelectorFor<T> | string
>(
  obj: T,
  selector: K,
  options: { createMissing?: boolean; add?: boolean; debug?: boolean } = {}
): any {
  const { createMissing = false, add = false, debug = false } = options;
  const segments = parseSelector(selector);
  let current: any = obj;
  let updateEvenIfNotlast = false;
  let chained_property = '';
  const stringify = selector;

  if (
    typeof current === 'object' &&
    !Array.isArray(current) &&
    stringify.length > 0
  ) {
    if (current[stringify]) {
      current = current[stringify];
      return current;
    }
  }
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const isLast = segments.length > 1 ? i === segments.length - 1 : false;

    if (current === null && !createMissing) {
      return undefined;
    }
    if (debug) {
      console.log('current is', current, segment, isLast);
    }

    const nextSegment = segments[i + 1];
    switch (segment.type) {
      case 'property':
        if (current && typeof current === 'object') {
          if (Array.isArray(current)) {
            // Handle numeric property as array index
            if (typeof segment.value === 'number') {
              const index = segment.value as number;
              if (createMissing && index >= current.length) {
                for (let j = current.length; j <= index; j++) {
                  current.push(undefined);
                }
              }
              if (
                createMissing &&
                (current[index] === null || current[index] === undefined) &&
                (!isLast || updateEvenIfNotlast)
              ) {
                if (nextSegment) {
                  current[index] =
                    nextSegment.type === 'index' ||
                    nextSegment.type === 'slice' ||
                    nextSegment.type === 'union' ||
                    nextSegment.type === 'wildcard'
                      ? []
                      : {};
                } else {
                  current[index] = null;
                }
                updateEvenIfNotlast = false;
              }
              current = current[index];
              if (nextSegment) {
                updateEvenIfNotlast = true;
                continue;
              }
            } else if (add) {
              current.push({
                [String(segment.value)]: null,
              });
            } else {
              current = current.map((item: any) => item[String(segment.value)]);
            }
            if (nextSegment) {
              continue;
            }
            return filterDefined(current);
          } else {
            if (
              current[chained_property] &&
              chained_property.split('.').length >= 2
            ) {
              current = current[chained_property];
              continue;
            }
            if (
              createMissing &&
              (current[String(segment.value)] === null ||
                current[String(segment.value)] === undefined) &&
              (!isLast || updateEvenIfNotlast)
            ) {
              if (nextSegment) {
                current[String(segment.value)] =
                  nextSegment.type === 'index' ||
                  nextSegment.type === 'slice' ||
                  nextSegment.type === 'union' ||
                  nextSegment.type === 'wildcard'
                    ? []
                    : {};
              } else {
                current[String(segment.value)] = null;
              }
              updateEvenIfNotlast = false;
              current = current[String(segment.value)];
              if (nextSegment) {
                updateEvenIfNotlast = true;
                continue;
              }
              // break;
            }
            if (!current) {
              current = { [String(segment.value)]: null };
            } else {
              if (!current[String(segment.value)] && createMissing) {
                current[String(segment.value)] = null;
              }
              if (
                selector === 'person.wife.childs' &&
                segment.value === 'childs'
              ) {
                console.log('cp', { current, segment });
              }
              current = current[String(segment.value)];
            }
            if (debug) {
              console.log('current is after', current);
            }
            if (nextSegment) {
              continue;
            }
          }
        } else if (createMissing) {
          // const nextSegment = segments[i + 1];
          current = {};
          current[String(segment.value)] =
            nextSegment.type === 'index' ||
            nextSegment.type === 'slice' ||
            nextSegment.type === 'union' ||
            nextSegment.type === 'wildcard'
              ? []
              : {};
          current = current[String(segment.value)];
        } else {
          if (debug) {
            console.log('is undefined');
          }
          return undefined;
        }
        break;

      case 'index':
      case 'wildcard':
        if (Array.isArray(current)) {
          if (segment.type === 'index') {
            const index = segment.value as number;
            if (index < 0) {
              current = current[current.length - Math.abs(index)];
              continue;
            }
            if (
              createMissing &&
              (index >= current.length ||
                current[index] == null ||
                current[index] == undefined) &&
              !isLast
            ) {
              for (let j = current.length; j <= index; j++) {
                current.push(undefined);
              }
              if (nextSegment) {
                current[index] =
                  nextSegment.type === 'index' ||
                  nextSegment.type === 'slice' ||
                  nextSegment.type === 'union' ||
                  nextSegment.type === 'wildcard'
                    ? []
                    : {};
              }
            }
            current = current[index];
            // if(!isLast){
            //   console.log('not')
            //   continue
            // }
            // console.log('index is', current, index, i, nextSegment)
            // if(nextSegment){
            //   continue
            // }
          } else {
            if (!isLast) {
              continue;
            }
          }
        } else if (createMissing) {
          const nextSegment = segments[i + 1];
          current = [];
          const index = segment.value as number;
          for (let j = 0; j <= index; j++) {
            current.push(undefined);
          }
          current[index] =
            nextSegment.type === 'index' ||
            nextSegment.type === 'slice' ||
            nextSegment.type === 'union' ||
            nextSegment.type === 'wildcard'
              ? []
              : {};
          current = current[index];
        } else {
          if (segment.type === 'index' && typeof current === 'object') {
            // Here we need to check if the current is an object and if potentially the segment value is key of the object
            if (current && current[String(segment.value)] !== undefined) {
              current = current[String(segment.value)];
              continue;
            }
          }
          if (typeof current === 'object') {
            const values = Object.values(current);
            current = values;
            continue;
          }
          return undefined;
        }
        break;

      default:
        return undefined;
    }
  }

  return filterDefined(current);
}

function filterDefined(obj: any) {
  if (Array.isArray(obj)) {
    return obj.filter((item: any) => typeof item !== 'undefined');
  }
  return obj;
}
/**
 * Sets value at path (internal)
 */
export const setAtPath = <
  T extends AnyObject | any[],
  K extends string = string
>(
  obj: T,
  selector: K,
  value: any,
  options: { createMissing?: boolean } = {}
): T => {
  if (selector === '[*]') {
    return applyDiff(obj, value);
  }
  const { createMissing = true } = options;

  const segments = parseSelector(selector);

  if (segments.length === 0) {
    return obj;
  }

  const lastSegment = segments[segments.length - 1];
  let current: any = obj;

  // Navigate to parent of last segment
  for (let i = 0; i < segments.length - 1; i++) {
    // console.log('i', i)
    const segment = segments[i];

    if (current == null) {
      if (!createMissing) return obj;
      throw new Error(`Cannot navigate through null/undefined at segment ${i}`);
    }

    const nextSegment = segments[i + 1];

    // let shoul
    const shouldBeArray =
      nextSegment.type === 'index' ||
      nextSegment.type === 'slice' ||
      nextSegment.type === 'union' ||
      nextSegment.type === 'wildcard';
    if (segment.type === 'property') {
      // if (selector === '[*].meta.count') {
      //   console.log('on property first', { selector, current });
      // }
      // Handle numeric property on array as index
      if (Array.isArray(current) && typeof typeof segment.value === 'number') {
        const index = segment.value as number;
        if (index < 0) {
          throw new Error(`Negative index ${index} not allowed`);
        }
        if (index >= current.length && createMissing) {
          for (let j = current.length; j <= index; j++) {
            current.push(undefined);
          }
        }
        if (
          (current[index] === null || current[index] === undefined) &&
          createMissing
        ) {
          current[index] = shouldBeArray ? [] : {};
        }
        current = current[index];
      } else {
        if (
          (current[String(segment.value)] === null ||
            current[String(segment.value)] === undefined) &&
          createMissing
        ) {
          // console.log('not exist', String(segment.value))
          current[String(segment.value)] = shouldBeArray ? [] : {};
        }
        if (typeof current === 'object' && !Array.isArray(current)) {
          current = current[String(segment.value)];
        }
      }
      // console.log('is obj', current, nextSegment)
      // console.log('prop', current)
      if (nextSegment) {
        // console.log('next seg', nextSegment)
        continue;
      }
      break;
    } else if (segment.type === 'index' || segment.type === 'wildcard') {
      // console.log('ind', current)
      // if (selector === '[*].meta.count') {
      //   console.log('on index or  wildcard first', { selector, current });
      // }
      if (!Array.isArray(current)) {
        if (!createMissing) return obj;
        current = [];
      }

      if (segment.type === 'index') {
        const index = segment.value as number;
        if (index < 0) {
          throw new Error(`Negative index ${index} not allowed`);
        }

        // console.log('is index')
        if (index >= current.length && createMissing) {
          // console.log('creating new element')
          for (let j = current.length; j <= index; j++) {
            current.push(undefined);
          }
        }

        if (
          (current[index] === null || current[index] === undefined) &&
          createMissing
        ) {
          current[index] = shouldBeArray ? [] : undefined;
        }

        current = current[index];
      }
      if (nextSegment) {
        // console.log('next seg', nextSegment)
        continue;
      }
      break;
    } else {
      throw new Error(`Invalid segment type for set: ${segment.type}`);
    }
  }

  // if (selector === 'person.wife.childs') {
  //   console.log('is array data', { current, value, lastSegment });
  // }

  // Set the value
  switch (lastSegment.type) {
    case 'property':
      // Handle numeric property on array as index
      if (Array.isArray(current) && typeof lastSegment.value === 'number') {
        const index = lastSegment.value as number;
        if (index < 0) {
          throw new Error(`Negative index ${index} not allowed`);
        }
        if (index >= current.length) {
          for (let j = current.length; j <= index; j++) {
            current.push(undefined);
          }
        }
        if (Array.isArray(value)) {
          current[index] = deepMerge(
            structuredClone(current[index]),
            value[index]
          );
        } else {
          current[index] = value;
        }
      } else {
        if (!current) current = {};
        if (Array.isArray(current)) {
          const paths = selector.split('.');
          let ob: any;
          if (paths.length >= 2) {
            paths.shift();
            // if (Array.isArray(value)) {

            // }else{

            // }
            if (selector === 'person.wife.childs') {
              console.log('is array data', { current, value });
            }
            for (let i = 0; i < current.length; i++) {
              if (Array.isArray(value)) {
                ob = fromPath(paths.join('.'), value[i]);
                current[i] =
                  typeof current[i] === 'object'
                    ? deepMerge(current[i], ob)
                    : ob;
              } else {
                ob = fromPath(paths.join('.'), value);
                current[i] =
                  typeof current[i] === 'object'
                    ? deepMerge(current[i], ob)
                    : ob;
              }
            }
          } else {
            ob = {
              [String(lastSegment.value)]: value,
            };
          }
        } else {
          if (selector === 'person.wife.childs') {
            console.log('on property', {
              current,
              lastSegment,
              value,
              key: String(lastSegment.value),
            });
          }
          if (Array.isArray(value) && value.length === 0) {
            if (typeof current[String(lastSegment.value)] === 'undefined') {
              current[String(lastSegment.value)] = [];
            } else {
              current[String(lastSegment.value)] = [];
            }
          } else {
            current[String(lastSegment.value)] = value;
          }
        }
      }
      break;

    case 'index':
    case 'wildcard':
      if (!Array.isArray(current)) {
        throw new Error(`Cannot use index on non-array for final segment`);
      }
      // if (selector === '[*].meta.count') {
      //   console.log('on index or Wildcard last', { selector, current });
      // }

      const index = lastSegment.value as number;
      if (lastSegment.type === 'index') {
        if (index < 0) {
          throw new Error(`Negative index ${index} not allowed`);
        }

        if (index >= current.length) {
          for (let j = current.length; j <= index; j++) {
            current.push(undefined);
          }
        }

        if (Array.isArray(value)) {
          if (typeof current[index] === typeof value[index]) {
            try {
              current[index] = deepMerge(
                deepClone(current[index]),
                value[index]
              );
            } catch (e) {
              console.log('expected on array', {
                selector,
                current,
                value,
                index,
              });
              console.log('current', current);
              throw Error('expected on array');
            }
          } else {
            // current[index] = value[index];
            // setValueAtIndex(current, selector, index, value[index]);
            current[index] = value;
          }
        } else {
          current[index] = value;
        }
      } else if (lastSegment.type === 'wildcard') {
        if (Array.isArray(value)) {
          for (let i = 0; i < current.length; i++) {
            if (typeof current[i] === 'object') {
              current[i] = deepMerge(current[i], value[i]);
            } else {
              current[i] = value[i];
            }
          }
        } else {
          for (let i = 0; i < current.length; i++) {
            if (typeof current[i] === 'object') {
              current[i] = deepMerge(current[i], value);
            } else {
              current[i] = value;
            }
          }
        }
      }
      break;

    default:
      throw new Error(
        `Invalid final segment type for set: ${lastSegment.type}`
      );
  }

  return obj;
};

const updateLastKey = (object: any, value: any) => {
  let obj = object ?? {};
  const keys = Object.keys(obj);
  let lastKey = keys[keys.length - 1];
  if (lastKey === undefined) {
    obj = value;
    return obj;
  }
  while (lastKey !== undefined) {
    const current = obj[lastKey];
    if (typeof current !== 'object' || Array.isArray(current)) {
      if (Array.isArray(current)) {
        if (current.length === 0) {
          current.push(value);
        } else {
          for (let i = 0; i < current.length; i++) {
            if (typeof current[i] === 'object' && !Array.isArray(current[i])) {
              updateLastKey(current[i], value);
            } else {
              current[i] = deepMerge(current[i], value);
            }
          }
        }
      } else {
        obj[lastKey] = value;
      }
      break;
    }
    const currentKeys = Object.keys(current);
    const nextKey = currentKeys[currentKeys.length - 1];
    obj = current;
    lastKey = nextKey;
  }
};

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
export const fromPath = <T extends AnyObject>(
  path: string,
  value?: any
): T | T[] | (T | T[])[] | undefined => {
  const segments = parseSelector(path);

  if (segments.length === 0) {
    return value;
  }

  // Build the structure from the end to the beginning
  let result: any = value;

  for (let i = segments.length - 1; i >= 0; i--) {
    const segment = segments[i];

    if (segment.type === 'property') {
      // Create an object with this property
      result = { [String(segment.value)]: result };
    } else if (segment.type === 'index') {
      // Create an array with the value at the specified index
      const index = parseInt(String(segment.value));
      const arr: any[] = [];
      arr[index] = result;
      result = arr;
    } else if (segment.type === 'wildcard') {
      // Create an array with one element (or wrap existing value)
      if (Array.isArray(result)) {
        // If result is already an array, keep it as is
        result = result;
      } else {
        // Wrap in array
        result = [result];
      }
    } else if (segment.type === 'slice') {
      // For slices, create an array with the value
      // The actual slice logic would be handled when reading, not creating
      if (!Array.isArray(result)) {
        result = [result];
      }
    } else if (segment.type === 'union') {
      // For union (multiple indices), create an array
      if (!Array.isArray(result)) {
        result = [result];
      }
    } else if (segment.type === 'filter') {
      // For filters, create an array
      if (!Array.isArray(result)) {
        result = [result];
      }
    } else if (segment.type === 'descendant') {
      // For descendant selectors, wrap in current structure
      // The actual recursive logic would be handled when reading
      result = result;
    }
  }

  return result;
};

/**
 * Selects values from an object (legacy method, uses get internally)
 * @deprecated Use get() instead
 */
export const select = <T extends AnyObject, S extends SelectorFor<T>>(
  obj: T,
  selector: S,
  options: SelectorOptions = {}
): T | T[] | (T | T[])[] | undefined => {
  return get(obj, selector, { ...options, preserveStructure: false });
};

/**
 * Checks if a selector matches any value in object
 * @param obj - Source object
 * @param selector - Selector string or array
 * @param options - Selector options
 * @returns True if selector matches at least one value (or array of booleans for array selector)
 */
export const has = <
  T extends AnyObject,
  S extends SelectorFor<T>,
  O extends SelectorOptions
>(
  obj: T,
  selector: S,
  options: O = {} as O
): boolean | boolean[] => {
  // Handle array of selectors
  if (Array.isArray(selector)) {
    return selector.map((sel) => has(obj, sel, options) as boolean);
  }

  const result = get(obj, selector, { ...options, preserveStructure: false });
  if (Array.isArray(result)) {
    if (result.length > 0) {
      return result.every((r) => r !== undefined);
    }
    return false;
  }
  return result !== undefined;
};

/**
 * Deletes values from object using selector
 * @param obj - Target object
 * @param selector - Selector string or array
 * @param options - Selector options
 * @returns True if any values were deleted (or array of booleans for array selector)
 */
export const deletePath = <
  T extends AnyObject,
  S extends SelectorFor<T>,
  O extends SelectorOptions
>(
  obj: T,
  selector: S,
  options: O = {} as O
): boolean | boolean[] => {
  const { throwOnError = false } = options;

  // Handle array of selectors
  if (Array.isArray(selector)) {
    return selector.map((sel) => deletePath(obj, sel, options) as boolean);
  }

  const segments = parseSelector(selector, { throwOnError });

  if (segments.length === 0) {
    return false;
  }

  const lastSegment = segments[segments.length - 1];

  // For wildcards, we need to find all matching paths and delete them
  if (
    segments.some(
      (s) => s.type === 'wildcard' || s.type === 'slice' || s.type === 'union'
    )
  ) {
    const paths = getPaths(obj, selector, options);
    let deleted = false;

    for (const path of paths) {
      if (deleteSinglePath(obj, path)) {
        deleted = true;
      }
    }

    return deleted;
  }

  // For single path deletion
  let current: any = obj;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];

    if (current == null) {
      return false;
    }

    switch (segment.type) {
      case 'property':
        current = current[String(segment.value)];
        break;

      case 'index':
        if (!Array.isArray(current)) return false;
        const index = segment.value as number;
        if (index < 0 || index >= current.length) return false;
        current = current[index];
        break;

      default:
        return false;
    }
  }

  if (current == null) {
    return false;
  }

  switch (lastSegment.type) {
    case 'property':
      if (String(lastSegment.value) in current) {
        delete current[String(lastSegment.value)];
        return true;
      }
      break;

    case 'index':
      if (!Array.isArray(current)) return false;
      const index = lastSegment.value as number;
      if (index >= 0 && index < current.length) {
        current.splice(index, 1);
        return true;
      }
      break;
  }

  return false;
};

/**
 * Helper for deleting a single path
 */
const deleteSinglePath = (obj: AnyObject, selector: string): boolean => {
  const segments = parseSelector(selector);

  if (segments.length === 0) {
    return false;
  }

  const lastSegment = segments[segments.length - 1];
  let current: any = obj;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];

    if (current == null) {
      return false;
    }

    switch (segment.type) {
      case 'property':
        current = current[String(segment.value)];
        break;

      case 'index':
        if (!Array.isArray(current)) return false;
        const index = segment.value as number;
        if (index < 0 || index >= current.length) return false;
        current = current[index];
        break;

      default:
        return false;
    }
  }

  if (current == null) {
    return false;
  }

  switch (lastSegment.type) {
    case 'property':
      if (String(lastSegment.value) in current) {
        delete current[String(lastSegment.value)];
        return true;
      }
      break;

    case 'index':
      if (!Array.isArray(current)) return false;
      const index = lastSegment.value as number;
      if (index >= 0 && index < current.length) {
        current.splice(index, 1);
        return true;
      }
      break;
  }

  return false;
};

/**
 * Gets all matching paths from an object
 * @param obj - Source object
 * @param selector - Selector string or array (optional, if not provided returns all paths)
 * @param options - Selector options
 * @returns Array of path strings
 */
export const getPaths = <
  T extends AnyObject,
  S extends SelectorFor<T>,
  O extends SelectorOptions & { format?: 'selector' | 'string' }
>(
  obj: T,
  selector?: S,
  options: O = {} as O
): SelectorFor<T>[] => {
  const { format = 'selector', maxDepth = 20 } = options;

  // Handle array of selectors
  if (selector && Array.isArray(selector)) {
    const allPaths: SelectorFor<T>[] = [];
    for (const sel of selector) {
      const paths = getPaths(obj, sel, options);
      allPaths.push(...paths);
    }
    return allPaths;
  }

  if (selector) {
    // Get paths matching the selector
    const segments = parseSelector(selector, options);
    const results = traverseWithPaths(obj, segments, 0, maxDepth);
    return results.map((r) =>
      format === 'selector' ? r.path : r.stringPath
    ) as SelectorFor<T>[];
  }

  // Get all paths
  const allPaths: Array<{ path: string; stringPath: string }> = [];

  const traverseAll = (
    current: any,
    path: SelectorSegment[] = [],
    stringPath: string[] = [],
    depth: number = 0
  ) => {
    if (depth > maxDepth) return;

    // Add current path
    if (path.length > 0) {
      const pathStr = stringifySelector(path);
      allPaths.push({ path: pathStr, stringPath: stringPath.join('.') });
    }

    if (current && typeof current === 'object') {
      if (Array.isArray(current)) {
        for (let i = 0; i < current.length; i++) {
          traverseAll(
            current[i],
            [...path, { type: 'index', value: i, raw: `[${i}]` }],
            [...stringPath, `[${i}]`],
            depth + 1
          );
        }
      } else {
        for (const key in current) {
          if (current.hasOwnProperty(key)) {
            traverseAll(
              current[key],
              [...path, { type: 'property', value: key, raw: key }],
              [...stringPath, key],
              depth + 1
            );
          }
        }
      }
    }
  };

  traverseAll(obj);
  return allPaths.map((p) =>
    format === 'selector' ? p.path : p.stringPath
  ) as SelectorFor<T>[];
};

/**
 * Finds all paths that match a predicate
 * @param obj - Source object
 * @param predicate - Function to test each path/value pair
 * @returns Array of matching path strings
 * @example
 * findPaths({a: 1, b: {c: 2}}, (path, value) => value === 2) // ['b.c']
 */
export const findPaths = <
  T extends AnyObject,
  P extends <P extends SelectorFor<T>, V extends IValueOfKey<T, P>>(
    path: P,
    value: V
  ) => boolean
>(
  obj: T,
  predicate: P
): string[] => {
  const paths = getPaths(obj);
  return paths.filter((path) => {
    const value = get(obj, path);
    return predicate(path, value as any);
  });
};

/**
 * Flattens an object with array notation in keys
 * @param obj - Source object
 * @param separator - Separator for nested keys (default: '.')
 * @returns Flattened object with array notation
 * @example
 * flattenWithArrays({a: [{b: 1}, {b: 2}]}) // {'a[0].b': 1, 'a[1].b': 2}
 */
export const flattenWithArrays = (
  obj: AnyObject,
  separator: string = '.'
): AnyObject => {
  const result: AnyObject = {};

  const traverse = (current: any, path: SelectorSegment[] = []) => {
    if (current == null) return;
    const trav = traverseStructure(current, path, 0, 20);
    if (trav !== undefined) {
      result[stringifySelector(path)] = trav;
      return;
    }
    if (Array.isArray(current)) {
      for (let i = 0; i < current.length; i++) {
        const newPath = [
          ...path,
          { type: 'index', value: i, raw: `[${i}]` } as SelectorSegment,
        ];
        traverse(current[i], newPath);
      }
    } else if (isObject(current)) {
      for (const key in current) {
        if (current.hasOwnProperty(key)) {
          const newPath = [
            ...path,
            { type: 'property', value: key, raw: key } as SelectorSegment,
          ];
          traverse((current as any)[key], newPath);
        }
      }

      // Handle symbols
      const symbols = Object.getOwnPropertySymbols(current);
      for (const symbol of symbols) {
        const newPath = [
          ...path,
          {
            type: 'property',
            value: symbol.toString(),
            raw: symbol.toString(),
          } as SelectorSegment,
        ];
        traverse((current as any)[symbol], newPath);
      }
    } else {
      // Primitive value - add to result
      const pathStr = stringifySelector(path);
      result[pathStr] = current;
    }
  };

  traverse(obj);
  return result;
};

/**
 * Unflattens an object with array notation in keys
 * @param obj - Source object
 * @returns Unflattened object
 * @example
 * unflattenWithArrays({'a[0].b': 1, 'a[1].b': 2}) // {a: [{b: 1}, {b: 2}]}
 */
export const unflattenWithArrays = (obj: AnyObject): AnyObject => {
  const result: AnyObject = {};

  for (const key in obj) {
    set(result, key, obj[key]);
  }

  return result;
};

/**
 * Merges objects with array notation support for paths
 * @param objects - Objects to merge
 * @returns Merged object
 */
export const deepMergeWithArrays = <T extends AnyObject[]>(
  ...objects: T
): AnyObject => {
  const result: AnyObject = {};

  for (const obj of objects) {
    if (!isObject(obj)) continue;

    const flat = flattenWithArrays(obj);
    for (const path in flat) {
      set(result, path, flat[path]);
    }
  }

  return result;
};
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
export function traverseWithPaths(
  current: any,
  segments: SelectorSegment[],
  depth: number,
  maxDepth: number,
  currentPath: SelectorSegment[] = [],
  currentStringPath: string[] = []
): Array<{ value: any; path: string; stringPath: string }> {
  if (depth > maxDepth) return [];
  if (segments.length === 0)
    return [
      {
        value: current,
        path: stringifySelector(currentPath),
        stringPath: currentStringPath.join('.'),
      },
    ];

  const segment = segments[0];
  const remaining = segments.slice(1);
  const results: Array<{ value: any; path: string; stringPath: string }> = [];

  // Handle descendant selector
  if (segment.type === 'descendant') {
    // Current level
    results.push(
      ...traverseWithPaths(
        current,
        remaining,
        depth + 1,
        maxDepth,
        currentPath,
        currentStringPath
      )
    );

    // Recursive descent
    if (current && typeof current === 'object') {
      if (Array.isArray(current)) {
        for (let i = 0; i < current.length; i++) {
          results.push(
            ...traverseWithPaths(
              current[i],
              segments, // Use same segments for recursion
              depth + 1,
              maxDepth,
              [...currentPath, { type: 'index', value: i, raw: `[${i}]` }],
              [...currentStringPath, `[${i}]`]
            )
          );
        }
      } else {
        for (const key in current) {
          if (current.hasOwnProperty(key)) {
            results.push(
              ...traverseWithPaths(
                current[key],
                segments,
                depth + 1,
                maxDepth,
                [...currentPath, { type: 'property', value: key, raw: key }],
                [...currentStringPath, key]
              )
            );
          }
        }
      }
    }

    return results;
  }

  // Handle other segment types
  switch (segment.type) {
    case 'property':
      if (
        current &&
        typeof current === 'object' &&
        String(segment.value) in current
      ) {
        const next = current[String(segment.value)];
        results.push(
          ...traverseWithPaths(
            next,
            remaining,
            depth + 1,
            maxDepth,
            [...currentPath, segment],
            [...currentStringPath, String(segment.value)]
          )
        );
      }
      break;

    case 'index':
      if (Array.isArray(current)) {
        const index = segment.value as number;
        if (index >= 0 && index < current.length) {
          results.push(
            ...traverseWithPaths(
              current[index],
              remaining,
              depth + 1,
              maxDepth,
              [...currentPath, segment],
              [...currentStringPath, `[${index}]`]
            )
          );
        }
      } else if (current && typeof current === 'object') {
        const key = String(segment.value);
        if (key in current) {
          results.push(
            ...traverseWithPaths(
              current[key],
              remaining,
              depth + 1,
              maxDepth,
              [...currentPath, { ...segment, type: 'property' }],
              [...currentStringPath, key]
            )
          );
        }
      }
      break;

    case 'wildcard':
      if (current && typeof current === 'object') {
        if (Array.isArray(current)) {
          for (let i = 0; i < current.length; i++) {
            results.push(
              ...traverseWithPaths(
                current[i],
                remaining,
                depth + 1,
                maxDepth,
                [...currentPath, { type: 'index', value: i, raw: `[${i}]` }],
                [...currentStringPath, `[${i}]`]
              )
            );
          }
        } else {
          for (const key in current) {
            if (current.hasOwnProperty(key)) {
              results.push(
                ...traverseWithPaths(
                  current[key],
                  remaining,
                  depth + 1,
                  maxDepth,
                  [...currentPath, { type: 'property', value: key, raw: key }],
                  [...currentStringPath, key]
                )
              );
            }
          }
        }
      }
      break;

    case 'slice':
      if (Array.isArray(current)) {
        const [start, end] = segment.value as [number, number];
        const actualStart = Math.max(0, start);
        const actualEnd = Math.min(
          current.length,
          end === Infinity ? current.length : end
        );

        for (let i = actualStart; i < actualEnd; i++) {
          results.push(
            ...traverseWithPaths(
              current[i],
              remaining,
              depth + 1,
              maxDepth,
              [...currentPath, { type: 'index', value: i, raw: `[${i}]` }],
              [...currentStringPath, `[${i}]`]
            )
          );
        }
      }
      break;

    case 'union':
      if (Array.isArray(current)) {
        const indices = segment.value as number[];
        for (const index of indices) {
          if (index >= 0 && index < current.length) {
            results.push(
              ...traverseWithPaths(
                current[index],
                remaining,
                depth + 1,
                maxDepth,
                [
                  ...currentPath,
                  { type: 'index', value: index, raw: `[${index}]` },
                ],
                [...currentStringPath, `[${index}]`]
              )
            );
          }
        }
      }
      break;

    case 'filter':
      if (Array.isArray(current)) {
        const filterFn = segment.value as (item: any) => boolean;
        for (let i = 0; i < current.length; i++) {
          if (filterFn(current[i])) {
            results.push(
              ...traverseWithPaths(
                current[i],
                remaining,
                depth + 1,
                maxDepth,
                [...currentPath, { type: 'index', value: i, raw: `[${i}]` }],
                [...currentStringPath, `[${i}]`]
              )
            );
          }
        }
      }
      break;
  }

  return results;
}

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
export const update = <T extends AnyObject, K extends SelectorFor<T>>(
  obj: T,
  path: K,
  updater: Callback<IValueOfKey<T, K>>
): T => {
  const currentValue = get(obj, path);
  const newValue = updater(currentValue as any);
  return setValueAtPath(obj as any, path as any, newValue as any);
};
export const updateWithCallBack = <
  T extends AnyObject,
  K extends SelectorFor<T>
>(
  obj: T,
  updater: Callback<T>
): T => {
  const newValue = updater(obj as any);
  // console.log('update trigger', obj, path, newValue)
  // if(typeof newValue === 'number'){
  //   return setAtPath(obj, path, newValue);
  // }
  // return setValueAtPath(obj as any, path as any, newValue as any);
  // console.log('callback update', newValue);
  return deepMerge(obj, newValue);
  // return obj;
};

/**
 * Gets the type of value at a path
 * @param obj - Source object
 * @param path - Path string
 * @returns Type string or undefined
 * @example
 * getTypeAtPath({a: [{b: 1}]}, 'a[0].b') // 'number'
 * getTypeAtPath({a: null}, 'a.b') // undefined
 */
export const getTypeAtPath = (
  obj: AnyObject,
  path: string
): string | undefined => {
  const value = get(obj, path);
  if (value === undefined) return undefined;
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
};
