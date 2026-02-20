import { isObject, type AnyObject } from '@awc/utils/object';

/**
 * Type guard to check if a value is an object array
 * @param value - Value to check
 * @returns True if value is an object array
 */
export const isObjectArray = (value: any): value is AnyObject[] => {
  return Array.isArray(value) && value.every((item) => isObject(item));
};

/**
 * Type guard to check if a value is an array
 * @param v - Value to check
 * @returns True if value is an array
 */
export function isArray<T = any>(v: unknown): v is T[] {
  return Array.isArray(v);
}

/**
 * Type guard to check if a value is a static array
 * @param v - Value to check
 * @returns True if value is a static array
 */
export function isStaticArray<T = any, U = any>(v: unknown): v is [T, U] {
  return Array.isArray(v);
}

/**
 * Type guard to check if a value is an array of 2-item tuples: [T, U][]
 * @param v - Value to check
 * @returns True if value is an array of 2-item tuples
 */
export function isDoubleArray<T = any, U = any>(v: unknown): v is [T, U][] {
  return (
    Array.isArray(v) &&
    v.every((item) => Array.isArray(item) && item.length === 2)
  );
}

/**
 * Type guard to check if a value is iterable
 * @param v - Value to check
 * @returns True if value is iterable
 */
export function isIterable(v: unknown): v is Iterable<unknown> {
  return v != null && typeof (v as any)[Symbol.iterator] === 'function';
}

/**
 * Type guard to check if a value is array-like
 * @param v - Value to check
 * @returns True if value is array-like
 */
export function isArrayLike(v: unknown): v is ArrayLike<unknown> {
  return (
    v != null &&
    typeof v === 'object' &&
    'length' in v &&
    typeof (v as any).length === 'number' &&
    (v as any).length >= 0 &&
    ((v as any).length === 0 || (v as any).length - 1 in v)
  );
}

/**
 * Type guard to check if an array is empty
 * @param v - Array to check
 * @returns True if array is empty
 */
export function isEmptyArray<T>(v: T[]): boolean {
  return Array.isArray(v) && v.length === 0;
}

/**
 * Type guard to check if a value is a non-empty array
 * @param v - Value to check
 * @returns True if value is a non-empty array
 */
export function isNonEmptyArray<T>(v: unknown): v is [T, ...T[]] {
  return Array.isArray(v) && v.length > 0;
}

/**
 * Type guard to check if a value is a typed array
 * @param v - Value to check
 * @returns True if value is a typed array (Int8Array, Uint8Array, etc.)
 */
export function isTypedArray(
  v: unknown
): v is
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array {
  return ArrayBuffer.isView(v) && !(v instanceof DataView);
}

/**
 * Type guard to check if a value is a readonly array
 * @param v - Value to check
 * @returns True if value is a readonly array
 */
export function isReadonlyArray<T = any>(v: unknown): v is readonly T[] {
  return Array.isArray(v);
}

/**
 * Safely get the last element of an array
 * @param arr - Array to get last element from
 * @returns Last element or undefined if array is empty
 */
export function last<T>(arr: T[]): T | undefined {
  return arr.length > 0 ? arr[arr.length - 1] : undefined;
}

/**
 * Safely get the first element of an array
 * @param arr - Array to get first element from
 * @returns First element or undefined if array is empty
 */
export function first<T>(arr: T[]): T | undefined {
  return arr.length > 0 ? arr[0] : undefined;
}

/**
 * Create an array from an iterable or array-like object with type safety
 * @param iterable - Iterable or array-like object
 * @returns Array from the iterable
 */
export function toArray<T>(iterable: Iterable<T> | ArrayLike<T>): T[] {
  if (Array.isArray(iterable)) {
    return [...iterable];
  }
  if (isIterable(iterable)) {
    return [...iterable];
  }
  return Array.from(iterable);
}

/**
 * Group array items by a key
 * @param arr - Array to group
 * @param keyFn - Function to extract group key
 * @returns Object with keys mapping to arrays of items
 */
export function groupArrayBy<T, K extends string | number | symbol>(
  arr: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return arr.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<K, T[]>);
}

// /**
//  * Chunk an array into smaller arrays of specified size
//  * @param arr - Array to chunk
//  * @param size - Size of each chunk
//  * @returns Array of chunks
//  */
// export function chunk<T>(arr: T[], size: number): T[][] {
//   if (size <= 0) return [];

//   const chunks: T[][] = [];
//   for (let i = 0; i < arr.length; i += size) {
//     chunks.push(arr.slice(i, i + size));
//   }
//   return chunks;
// }

/**
 * Flatten an array of arrays
 * @param arr - Array of arrays to flatten
 * @returns Flattened array
 */
export function flattenArray<T>(arr: T[][]): T[] {
  return arr.flat();
}

/**
 * Get array element by index with support for negative indices
 * @param arr - Array to get element from
 * @param index - Index (negative counts from end)
 * @returns Element at index or undefined if out of bounds
 */
export function at<T>(arr: T[], index: number): T | undefined {
  const normalizedIndex = index < 0 ? arr.length + index : index;
  return arr[normalizedIndex];
}
