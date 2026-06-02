import { isPrimitive, isUndefinedOrNull } from '../helpers.js';
import { isObject } from '@fluixi/utils/object';

export const hasLength = (data: any) => {
  const type = typeof data;
  let hasValue = false;
  if (isUndefinedOrNull(data)) {
    return false;
  }
  switch (type) {
    case 'string':
      hasValue = data.length > 0;
      break;
    case 'number':
      hasValue = true;
      break;
    case 'object':
      if (Array.isArray(data)) {
        hasValue = data.length > 0;
      } else {
        hasValue = Object.keys(data).length > 0;
      }
      break;
    case 'boolean':
      hasValue = data;
  }
  return hasValue;
};

/**
 * The isEqual function compares two objects and returns true if they are equal.
 *
 * @param compare1: T Define the type of object that will be passed into the function
 * @param compare2: T Compare the two objects
 *
 * @return A boolean value
 *
 * @docauthor Ibrahima Touré
 */
export const isDeepEqual = <T extends string | any>(
  compare1: T,
  compare2: T,
  keys?: string[]
): boolean => {
  if (compare1 === undefined || compare2 === undefined) return false;
  if (compare1 === null || compare2 === null) return compare1 === compare2;
  if (Array.isArray(compare1) && Array.isArray(compare2)) {
    if (compare1.length !== compare2.length) return false;
    return compare1.every((v, i) => isDeepEqual(v, compare2[i]));
  }

  if (keys && keys.length > 0) {
    if (isPrimitive(compare1) && isPrimitive(compare2))
      return compare1 === compare2;
    if (isObject(compare1) && isObject(compare2))
      return keys.every((k) =>
        isDeepEqual((compare1 as any)[k], (compare2 as any)[k])
      );
    return false;
  }

  if (isObject(compare1) && isObject(compare2)) {
    const obj1Keys = Object.keys(compare1).sort();
    const obj2Keys = Object.keys(compare2).sort();
    if (obj1Keys.length !== obj2Keys.length) return false;
    // Fixed: use recursive isDeepEqual instead of === for nested values
    return obj1Keys.every((key) =>
      isDeepEqual((compare1 as any)[key], (compare2 as any)[key])
    );
  }

  return compare1 === compare2;
};

// ─── deepEqual options ────────────────────────────────────────────────────────

export interface DeepEqualOptions {
  /**
   * When `true`, arrays are compared as unordered sets: two arrays are equal
   * if every element in the first has a deeply-equal counterpart in the second,
   * regardless of position.
   *
   * The option propagates recursively, so nested arrays are also compared
   * without order.
   *
   * @example
   * deepEqual([1,2,3], [3,1,2])                        // false  (default)
   * deepEqual([1,2,3], [3,1,2], { unordered: true })   // true
   * deepEqual(
   *   [{ id: 1 }, { id: 2 }],
   *   [{ id: 2 }, { id: 1 }],
   *   { unordered: true }
   * ) // true
   */
  unordered?: boolean;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * O(n²) unordered array equality.
 * Finds a unique match in `b` for every element in `a`.
 */
function unorderedArrayEqual(
  a: any[],
  b: any[],
  opts: DeepEqualOptions
): boolean {
  // Each b-slot can only be consumed once
  const used = new Uint8Array(b.length);

  outer: for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      if (!used[j] && deepEqual(a[i], b[j], opts)) {
        used[j] = 1;
        continue outer;
      }
    }
    return false; // no match for a[i]
  }
  return true;
}

// ─── deepEqual ────────────────────────────────────────────────────────────────

/**
 * Structural deep equality check.
 *
 * Handles: primitives, null/undefined, Date, RegExp, Array, Map, Set, and
 * plain objects. Recurses into nested structures.
 *
 * @param obj1 - First value
 * @param obj2 - Second value
 * @param options - Comparison options (see {@link DeepEqualOptions})
 *
 * @example
 * deepEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } })  // true
 * deepEqual([1, 2, 3], [3, 2, 1])                            // false
 * deepEqual([1, 2, 3], [3, 2, 1], { unordered: true })       // true
 * deepEqual(
 *   [{ id: 2 }, { id: 1 }],
 *   [{ id: 1 }, { id: 2 }],
 *   { unordered: true }
 * ) // true
 */
export const deepEqual = (
  obj1: any,
  obj2: any,
  options: DeepEqualOptions = {}
): boolean => {
  // Fast path: same reference, same primitive, or both null/undefined
  if (obj1 === obj2) return true;

  // One side is null/undefined but not the other (=== already handled above)
  if (obj1 == null || obj2 == null) return false;

  // Type mismatch
  if (typeof obj1 !== typeof obj2) return false;

  // ── Arrays ──────────────────────────────────────────────────────────────
  const isArr1 = Array.isArray(obj1);
  const isArr2 = Array.isArray(obj2);
  if (isArr1 !== isArr2) return false;
  if (isArr1 && isArr2) {
    if (obj1.length !== obj2.length) return false;
    return options.unordered
      ? unorderedArrayEqual(obj1, obj2, options)
      : obj1.every((item: any, i: number) => deepEqual(item, obj2[i], options));
  }

  // ── Primitive (non-object) types ─────────────────────────────────────────
  if (typeof obj1 !== 'object') return obj1 === obj2;

  // ── Date ─────────────────────────────────────────────────────────────────
  const isDate1 = obj1 instanceof Date;
  const isDate2 = obj2 instanceof Date;
  if (isDate1 !== isDate2) return false;
  if (isDate1) return (obj1 as Date).getTime() === (obj2 as Date).getTime();

  // ── RegExp ───────────────────────────────────────────────────────────────
  const isRE1 = obj1 instanceof RegExp;
  const isRE2 = obj2 instanceof RegExp;
  if (isRE1 !== isRE2) return false;
  if (isRE1) return obj1.toString() === obj2.toString();

  // ── Map ──────────────────────────────────────────────────────────────────
  const isMap1 = obj1 instanceof Map;
  const isMap2 = obj2 instanceof Map;
  if (isMap1 !== isMap2) return false;
  if (isMap1) {
    if (obj1.size !== obj2.size) return false;
    for (const [k, v] of obj1 as Map<any, any>) {
      if (!(obj2 as Map<any, any>).has(k)) return false;
      if (!deepEqual(v, (obj2 as Map<any, any>).get(k), options)) return false;
    }
    return true;
  }

  // ── Set ──────────────────────────────────────────────────────────────────
  const isSet1 = obj1 instanceof Set;
  const isSet2 = obj2 instanceof Set;
  if (isSet1 !== isSet2) return false;
  if (isSet1) {
    if (obj1.size !== obj2.size) return false;
    // Sets are inherently unordered; use the unordered algorithm for deep items
    const bArr = [...(obj2 as Set<any>)];
    const used = new Uint8Array(bArr.length);
    outer: for (const v of obj1 as Set<any>) {
      for (let j = 0; j < bArr.length; j++) {
        if (!used[j] && deepEqual(v, bArr[j], options)) {
          used[j] = 1;
          continue outer;
        }
      }
      return false;
    }
    return true;
  }

  // ── Plain objects ─────────────────────────────────────────────────────────
  if (!isObject(obj1) || !isObject(obj2)) return false;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!Object.prototype.hasOwnProperty.call(obj2, key)) return false;
    if (!deepEqual((obj1 as any)[key], (obj2 as any)[key], options)) return false;
  }

  return true;
};

/**
 * Checks if two values are equal
 * @param a - The first value to compare
 * @param b - The second value to compare
 * @returns True if values are equal
 * @example
 * isEqual(1, 1) // true
 * isEqual(1, '1') // false
 * isEqual(null, undefined) // false
 */
export function isEqual<T>(a: T, b: T): boolean {
  return Object.is(a, b);
}
