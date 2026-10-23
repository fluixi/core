import {
  AnyObject,
  CreateMutable,
  RecordObject,
  UnionToIntersection,
} from './types.js';
import { isObject, isPlainObject } from './utils.js';
import { deepClone } from './clone.js';
import { diffObjectDetailed,  applyDiff, } from './diff.js';
import { parseSelector } from './selector.js';

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
export function merge<T extends AnyObject[]>(
  ...sources: T
): T extends (infer U)[] ? CreateMutable<UnionToIntersection<U>> : never;
export function merge<T extends any[][]>(
  ...sources: T
): T extends (infer U)[] ? CreateMutable<UnionToIntersection<U>> : never;
export function merge(...sources: any[]): any {
  if (sources.length === 0) return {};

  // Check if we're merging arrays or objects
  const firstItem = sources[0];
  const isArrayMerge = Array.isArray(firstItem);

  // Ensure consistent types (all objects or all arrays)
  for (const source of sources) {
    if (source && Array.isArray(source) !== isArrayMerge) {
      throw new Error('Cannot mix arrays and objects in deepMerge');
    }
  }

  // Create appropriate empty result
  let result = isArrayMerge ? [] : {};

  // Merge the sources into the result
  for (const source of sources) {
    // Skip null/undefined sources
    if (source == null) continue;

    if (isArrayMerge) {
      // Array merging - concatenate arrays after deep cloning items
      const resultArray = result as any[];
      const sourceArray = source as any[];
      for (const item of sourceArray) {
        resultArray.push(deepClone(item));
      }
    } else {
      // Object merging
      if (!isPlainObject(source)) continue;
      const resultObj = result as AnyObject;
      const sourceObj = source as AnyObject;

      // Handle regular properties
      for (const key in sourceObj) {
        if (Object.prototype.hasOwnProperty.call(sourceObj, key)) {
          const value = sourceObj[key];
          const existing = resultObj[key];

          if (existing === undefined) {
            // No existing value, deep clone the new value
            resultObj[key] = deepClone(value);
          } else if (Array.isArray(value) && Array.isArray(existing)) {
            // Both are arrays, concatenate them after deep cloning
            resultObj[key] = [
              ...existing,
              ...value.map((item) => deepClone(item)),
            ];
          } else if (isPlainObject(value) && isPlainObject(existing)) {
            // Both are plain objects, recursively merge
            resultObj[key] = merge(existing, value);
          } else {
            // Primitive or type mismatch, replace with cloned value
            resultObj[key] = deepClone(value);
          }
        }
      }

      // Handle symbols
      const symbols = Object.getOwnPropertySymbols(sourceObj);
      for (const symbol of symbols) {
        const value = sourceObj[symbol as any];
        const existing = resultObj[symbol as any];

        if (existing === undefined) {
          // No existing value, deep clone the new value
          resultObj[symbol as any] = deepClone(value);
        } else if (Array.isArray(value) && Array.isArray(existing)) {
          // Both are arrays, concatenate them after deep cloning
          resultObj[symbol as any] = [
            ...existing,
            ...value.map((item) => deepClone(item)),
          ];
        } else if (isPlainObject(value) && isPlainObject(existing)) {
          // Both are plain objects, recursively merge
          resultObj[symbol as any] = merge(existing, value);
        } else {
          // Primitive or type mismatch, replace with cloned value
          resultObj[symbol as any] = deepClone(value);
        }
      }
    }
  }

  return result;
}

function getKey(value: any, keys?: string[]){
  let key: string | undefined;
  if(typeof value === 'undefined' || value === null) return;
  const data_keys = keys ? keys : ["id"]
  if(typeof value === 'object'){
    if(!Array.isArray(value)){
      let i = 0
      while(!key){
        key = data_keys[i]
        i+=1;
      }
    }
  }
  return key;
}

type Primitive = string | number | boolean | null | undefined;

export function mergeArrays<T>(
  arr1: T[],
  arr2: T[],
  options?: {
    key?: keyof T;       // for objects
    override?: boolean;  // arr2 overrides arr1
  }
): T[] {
  const { key, override = true } = options || {};

  // 👉 Case 1: primitives
  if (!key) {
    return Array.from(new Set([...arr1, ...arr2]));
  }

  // 👉 Case 2: objects with key
  const map = new Map<any, T>();

  for (const item of arr1) {
    map.set((item as any)[key], item);
  }

  for (const item of arr2) {
    const existing = map.get((item as any)[key]);

    if (!existing) {
      map.set((item as any)[key], item);
    } else {
      map.set(
        (item as any)[key],
        override
          ? { ...existing, ...item } // merge + override
          : { ...item, ...existing } // keep original
      );
    }
  }

  return Array.from(map.values());
}

function mergeInPlace(target: any, source: any) {
  for (const key in source) {
    const tVal = target[key];
    const sVal = source[key];
    const diff = diffObjectDetailed(tVal, sVal)

    if (Array.isArray(tVal) && Array.isArray(sVal)) {
      // keep same array reference
      tVal.length = 0;
      tVal.push(...sVal);
    } else if (
      typeof tVal === 'object' &&
      typeof sVal === 'object' &&
      tVal &&
      sVal && 
      diff.hasChanges
    ) {
       applyDiff(tVal, sVal)
    } else {
      target[key] = sVal;
    }
  }
}

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
export function deepMergeWithOptions<T extends object>(
  target: T,
  ...args: any[]
): T {
  if (args.length === 0) return deepClone(target) as T;

  // Check if last argument is options
  let options = { preserveTarget: false, strict: false };
  let sources: object[] = args;

  const lastArg = args[args.length - 1];
  if (
    lastArg &&
    typeof lastArg === 'object' &&
    ('preserveTarget' in lastArg || 'strict' in lastArg)
  ) {
    options = { ...options, ...(lastArg as any) };
    sources = args.slice(0, -1);
  }

  // Create or use target as result base
  const result = options.preserveTarget ? target : deepClone(target);

  // Ensure consistent types (all objects or all arrays)
  const isArrayMerge = Array.isArray(result);
  for (const source of sources) {
    if (source && Array.isArray(source) !== isArrayMerge) {
      throw new Error('Cannot mix arrays and objects in deepMergeWithOptions');
    }
  }

  // Process each source
  for (const source of sources) {
    if (source == null) continue;

    if (isArrayMerge) {
      // Array merging
      const resultArray = result as any[];
      const sourceArray = source as any[];

      if (options.strict) {
        // In strict mode, only modify existing array elements
        for (let i = 0; i < resultArray.length && i < sourceArray.length; i++) {
          if (isPlainObject(resultArray[i]) && isPlainObject(sourceArray[i])) {
            resultArray[i] = deepMergeWithOptions(
              resultArray[i],
              sourceArray[i],
              options
            );
          } else {
            // For non-objects in strict mode, only replace if same type
            if (typeof resultArray[i] === typeof sourceArray[i]) {
              resultArray[i] = deepClone(sourceArray[i]);
            }
          }
        }
      } else {
        // In non-strict mode, concatenate arrays
        // console.log('pushing', [...resultArray], [...sourceArray])
        mergeInPlace(resultArray, sourceArray)

        //     //   }

        //     // }else{

      }
    } else {
      // Object merging
      if (!isPlainObject(source)) continue;
      const resultObj = result as AnyObject;
      const sourceObj = source as AnyObject;

      // Handle regular properties
      for (const key in sourceObj) {
        if (!Object.prototype.hasOwnProperty.call(sourceObj, key)) continue;

        const value = sourceObj[key];

        if (options.strict && !(key in resultObj)) {
          // In strict mode, skip properties that don't exist in the target
          continue;
        }

        const existing = resultObj[key];

        if (existing === undefined) {
          // Property doesn't exist in result yet, clone and add it
          resultObj[key] = deepClone(value);
        } else if (Array.isArray(value) && Array.isArray(existing)) {
          // Both are arrays, handle according to options
          if (options.strict) {
            // In strict mode, recursively merge array elements
            resultObj[key] = deepMergeWithOptions(existing, value, options);
          } else {
            // In non-strict mode, concatenate arrays
            resultObj[key] = [
              ...existing,
              ...value.map((item) => deepClone(item)),
            ];
          }
        } else if (isPlainObject(value) && isPlainObject(existing)) {
          // Both are plain objects, recursively merge
          resultObj[key] = deepMergeWithOptions(existing, value, options);
        } else {
          // Primitive or type mismatch, replace with cloned value
          resultObj[key] = deepClone(value);
        }
      }

      // Handle symbols
      const symbols = Object.getOwnPropertySymbols(sourceObj);
      for (const symbol of symbols) {
        if (options.strict && !((symbol as any) in resultObj)) {
          // In strict mode, skip symbols that don't exist in the target
          continue;
        }

        const value = sourceObj[symbol as any];
        const existing = resultObj[symbol as any];

        if (existing === undefined) {
          // Symbol doesn't exist in result yet, clone and add it
          resultObj[symbol as any] = deepClone(value);
        } else if (Array.isArray(value) && Array.isArray(existing)) {
          // Both are arrays, handle according to options
          if (options.strict) {
            // In strict mode, recursively merge array elements
            resultObj[symbol as any] = deepMergeWithOptions(
              existing,
              value,
              options
            );
          } else {
            // In non-strict mode, concatenate arrays
            resultObj[symbol as any] = [
              ...existing,
              ...value.map((item) => deepClone(item)),
            ];
          }
        } else if (isPlainObject(value) && isPlainObject(existing)) {
          // Both are plain objects, recursively merge
          resultObj[symbol as any] = deepMergeWithOptions(
            existing,
            value,
            options
          );
        } else {
          // Primitive or type mismatch, replace with cloned value
          resultObj[symbol as any] = deepClone(value);
        }
      }
    }
  }

  return result as T;
}

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
export function deepMergeKeepReference<T extends object>(
  target: T,
  ...sources: object[]
): T {
  return deepMergeWithOptions(target, ...sources, {
    preserveTarget: true,
  });
}

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
export function deepMergeStrict<T extends object>(
  target: T,
  ...args: any[]
): T {
  // Check if last argument is a boolean flag for preserving reference
  let preserveReference = false;
  let sources = args;

  if (args.length > 0 && typeof args[args.length - 1] === 'boolean') {
    preserveReference = args[args.length - 1] as boolean;
    sources = args.slice(0, -1);
  }

  return deepMergeWithOptions(target, ...sources, {
    preserveTarget: preserveReference,
    strict: true,
  });
}

/**
 * Helper to merge a value into a structure based on selector
 * @param target - Target object to merge into
 * @param selector - Selector string
 * @param value - Value to merge
 * @example
 * mergeIntoStructure({ a: { b: { c: 1 } } }, 'a.b.c', 2);
 * // { a: { b: { c: 2 } } }
 */
export const mergeIntoStructure = (
  target: RecordObject,
  selector: string,
  value: any
): void => {
  const segments = parseSelector(selector);
  let current = target as any;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const isLast = i === segments.length - 1;

    switch (segment.type) {
      case 'property':
        if (isLast) {
          current[String(segment.value)] = value;
        } else {
          if (!current[String(segment.value)]) {
            const nextSegment = segments[i + 1];
            current[String(segment.value)] =
              nextSegment.type === 'index' ||
              nextSegment.type === 'slice' ||
              nextSegment.type === 'union' ||
              nextSegment.type === 'wildcard'
                ? []
                : {};
          }
          current = current[String(segment.value)];
        }
        break;

      case 'index':
        if (!Array.isArray(current)) {
          current = [];
        }
        const index = segment.value as number;
        if (isLast) {
          if (index >= current.length) {
            for (let j = current.length; j <= index; j++) {
              current.push(undefined);
            }
          }
          current[index] = value;
        } else {
          if (!current[index]) {
            const nextSegment = segments[i + 1];
            current[index] =
              nextSegment.type === 'index' ||
              nextSegment.type === 'slice' ||
              nextSegment.type === 'union' ||
              nextSegment.type === 'wildcard'
                ? []
                : {};
          }
          current = current[index];
        }
        break;

      case 'wildcard':
        // For wildcards in get, we need to handle all elements
        if (Array.isArray(current)) {
          if (isLast) {
            // Fill all positions with value
            for (let j = 0; j < current.length; j++) {
              current[j] = value;
            }
          } else {
            // Ensure all elements have the structure
            const nextSegment = segments[i + 1];
            for (let j = 0; j < current.length; j++) {
              if (!current[j]) {
                current[j] =
                  nextSegment.type === 'index' ||
                  nextSegment.type === 'slice' ||
                  nextSegment.type === 'union' ||
                  nextSegment.type === 'wildcard'
                    ? []
                    : {};
              }
            }
            // Continue with first element (structure should be same for all)
            if (current.length > 0) {
              current = current[0];
            }
          }
        }
        break;
    }
  }
};

// Export aliases for convenience
export {
  deepMergeKeepReference as deepMerge,
  deepMergeStrict as mergeStrict,
  deepMergeWithOptions as mergeWithOptions,
};
