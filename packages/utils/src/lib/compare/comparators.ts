import { isPrimitive, isUndefinedOrNull } from '../helpers.js';
import { isObject } from '@awc/utils/object';

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
      return keys.every(
        (k) => (compare1 as any)[k as any] === (compare2 as any)[k as any]
      );
    return false;
  }

  if (isObject(compare1) && isObject(compare2)) {
    const obj1Keys = keys || Object.keys(compare1).sort();
    const obj2Keys = keys || Object.keys(compare2).sort();
    if (obj1Keys.length !== obj2Keys.length) return false;
    return obj1Keys.every(
      (key) => (compare1 as any)[key] === (compare2 as any)[key]
    );
  }

  return compare1 === compare2;
};

/**
 * Checks if two objects are deeply equal
 * @param obj1 - First object
 * @param obj2 - Second object
 * @returns True if objects are deeply equal
 * @example
 * deepEqual({a: 1, b: {c: 2}}, {a: 1, b: {c: 2}}) // true
 * deepEqual({a: 1}, {a: 1, b: 2}) // false
 */
export const deepEqual = (obj1: any, obj2: any): boolean => {
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) return false;
    return obj1.every((item, index) => deepEqual(item, obj2[index]));
  }
  // Same reference or both null/undefined
  if (obj1 === obj2) return true;

  // Check for null/undefined
  if (obj1 == null || obj2 == null) return false;

  // Check type
  if (typeof obj1 !== typeof obj2) return false;

  // Check for primitive types
  if (typeof obj1 !== 'object' && typeof obj2 !== 'object') {
    return obj1 === obj2;
  }

  // Check for Date
  if (obj1 instanceof Date && obj2 instanceof Date) {
    return obj1.getTime() === obj2.getTime();
  }

  // Check for RegExp
  if (obj1 instanceof RegExp && obj2 instanceof RegExp) {
    return obj1.toString() === obj2.toString();
  }

  // Check if both are objects
  if (!isObject(obj1) || !isObject(obj2)) return false;

  // Check keys length
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  // Check each property
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;

    const val1 = (obj1 as any)[key];
    const val2 = (obj2 as any)[key];

    if (!deepEqual(val1, val2)) return false;
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
