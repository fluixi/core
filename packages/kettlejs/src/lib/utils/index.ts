/**
 * @fileoverview General utilities for KettleJS
 * @module @awc/kettlejs/utils
 *
 * This module provides general utility functions for common operations.
 */

/**
 * Debounces a function call
 *
 * @template T - Function type
 * @param {T} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {(...args: Parameters<T>) => void} Debounced function
 *
 * @example
 * ```typescript
 * import { debounce } from '@awc/kettlejs/utils';
 *
 * const handleInput = debounce((value: string) => {
 *   console.log('Input:', value);
 * }, 300);
 * ```
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttles a function call
 *
 * @template T - Function type
 * @param {T} fn - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {(...args: Parameters<T>) => void} Throttled function
 *
 * @example
 * ```typescript
 * import { throttle } from '@awc/kettlejs/utils';
 *
 * const handleScroll = throttle(() => {
 *   console.log('Scrolled');
 * }, 100);
 * ```
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Creates a memoized version of a function
 *
 * @template T - Function type
 * @param {T} fn - Function to memoize
 * @returns {T} Memoized function
 *
 * @example
 * ```typescript
 * import { memoize } from '@awc/kettlejs/utils';
 *
 * const expensiveCalc = memoize((n: number) => {
 *   return n * n;
 * });
 * ```
 */
export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Deep clones an object
 *
 * @template T - Object type
 * @param {T} obj - Object to clone
 * @returns {T} Cloned object
 *
 * @example
 * ```typescript
 * import { deepClone } from '@awc/kettlejs/utils';
 *
 * const original = { a: 1, b: { c: 2 } };
 * const copy = deepClone(original);
 * ```
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }

  if (obj instanceof Array) {
    return Array.from(obj).map((item) => deepClone(item)) as T;
  }

  if (obj instanceof Set) {
    return new Set(Array.from(obj).map((item) => deepClone(item))) as T;
  }

  if (obj instanceof Map) {
    return new Map(
      Array.from(obj.entries()).map(([key, value]) => [
        deepClone(key),
        deepClone(value),
      ])
    ) as T;
  }

  const clonedObj = {} as T;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      clonedObj[key] = deepClone(obj[key]);
    }
  }
  return clonedObj;
}

/**
 * Deep merges multiple objects
 *
 * @template T - Object type
 * @param {...Partial<T>[]} objects - Objects to merge
 * @returns {T} Merged object
 *
 * @example
 * ```typescript
 * import { deepMerge } from '@awc/kettlejs/utils';
 *
 * const result = deepMerge(
 *   { a: 1, b: { c: 2 } },
 *   { b: { d: 3 } }
 * );
 * // { a: 1, b: { c: 2, d: 3 } }
 * ```
 */
export function deepMerge<T extends Record<string, any>>(
  ...objects: Partial<T>[]
): T {
  const result = {} as T;

  for (const obj of objects) {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        if (
          value !== null &&
          typeof value === 'object' &&
          !Array.isArray(value)
        ) {
          result[key] = deepMerge(
            result[key] as any || {},
            value as any
          ) as T[Extract<keyof T, string>];
        } else {
          result[key] = value as T[Extract<keyof T, string>];
        }
      }
    }
  }

  return result;
}

/**
 * Generates a unique ID
 *
 * @param {string} prefix - Optional prefix
 * @returns {string} Unique ID
 *
 * @example
 * ```typescript
 * import { uniqueId } from '@awc/kettlejs/utils';
 *
 * const id = uniqueId('component-');
 * // 'component-abc123def456'
 * ```
 */
export function uniqueId(prefix: string = ''): string {
  return prefix + Math.random().toString(36).substr(2, 9);
}

/**
 * Formats a number with commas
 *
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 *
 * @example
 * ```typescript
 * import { formatNumber } from '@awc/kettlejs/utils';
 *
 * formatNumber(1234567); // '1,234,567'
 * ```
 */
export function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Formats bytes to human readable string
 *
 * @param {number} bytes - Number of bytes
 * @param {number} decimals - Decimal places (default: 2)
 * @returns {string} Formatted string
 *
 * @example
 * ```typescript
 * import { formatBytes } from '@awc/kettlejs/utils';
 *
 * formatBytes(1024); // '1 KB'
 * formatBytes(1048576); // '1 MB'
 * ```
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Capitalizes first letter of a string
 *
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 *
 * @example
 * ```typescript
 * import { capitalize } from '@awc/kettlejs/utils';
 *
 * capitalize('hello'); // 'Hello'
 * ```
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Converts string to kebab-case
 *
 * @param {string} str - String to convert
 * @returns {string} Kebab-case string
 *
 * @example
 * ```typescript
 * import { kebabCase } from '@awc/kettlejs/utils';
 *
 * kebabCase('HelloWorld'); // 'hello-world'
 * ```
 */
export function kebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Converts string to camelCase
 *
 * @param {string} str - String to convert
 * @returns {string} CamelCase string
 *
 * @example
 * ```typescript
 * import { camelCase } from '@awc/kettlejs/utils';
 *
 * camelCase('hello-world'); // 'helloWorld'
 * ```
 */
export function camelCase(str: string): string {
  return str.replace(/[-_\s](.)/g, (_, char) => char.toUpperCase());
}

/**
 * Clamps a number between min and max
 *
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 *
 * @example
 * ```typescript
 * import { clamp } from '@awc/kettlejs/utils';
 *
 * clamp(5, 0, 10); // 5
 * clamp(-5, 0, 10); // 0
 * clamp(15, 0, 10); // 10
 * ```
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Generates a random number between min and max
 *
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random number
 *
 * @example
 * ```typescript
 * import { random } from '@awc/kettlejs/utils';
 *
 * const num = random(1, 100);
 * ```
 */
export function random(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Checks if a value is empty
 *
 * @param {any} value - Value to check
 * @returns {boolean} True if empty
 *
 * @example
 * ```typescript
 * import { isEmpty } from '@awc/kettlejs/utils';
 *
 * isEmpty(''); // true
 * isEmpty([]); // true
 * isEmpty({}); // true
 * isEmpty(null); // true
 * isEmpty('text'); // false
 * ```
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Picks specific keys from an object
 *
 * @template T - Object type
 * @template K - Keys to pick
 * @param {T} obj - Source object
 * @param {...K[]} keys - Keys to pick
 * @returns {Pick<T, K>} Object with picked keys
 *
 * @example
 * ```typescript
 * import { pick } from '@awc/kettlejs/utils';
 *
 * const obj = { a: 1, b: 2, c: 3 };
 * pick(obj, 'a', 'c'); // { a: 1, c: 3 }
 * ```
 */
export function pick<T extends object, K extends keyof T>(
  obj: T,
  ...keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach((key) => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

/**
 * Omits specific keys from an object
 *
 * @template T - Object type
 * @template K - Keys to omit
 * @param {T} obj - Source object
 * @param {...K[]} keys - Keys to omit
 * @returns {Omit<T, K>} Object without omitted keys
 *
 * @example
 * ```typescript
 * import { omit } from '@awc/kettlejs/utils';
 *
 * const obj = { a: 1, b: 2, c: 3 };
 * omit(obj, 'b'); // { a: 1, c: 3 }
 * ```
 */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  ...keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach((key) => {
    delete result[key];
  });
  return result as Omit<T, K>;
}

/**
 * Groups array items by a key
 *
 * @template T - Array item type
 * @template K - Key type
 * @param {T[]} array - Array to group
 * @param {(item: T) => K} fn - Key extraction function
 * @returns {Map<K, T[]>} Grouped items
 *
 * @example
 * ```typescript
 * import { groupBy } from '@awc/kettlejs/utils';
 *
 * const users = [
 *   { name: 'Alice', role: 'admin' },
 *   { name: 'Bob', role: 'user' },
 *   { name: 'Charlie', role: 'admin' }
 * ];
 * const grouped = groupBy(users, u => u.role);
 * // Map { 'admin' => [...], 'user' => [...] }
 * ```
 */
export function groupBy<T, K>(
  array: T[],
  fn: (item: T) => K
): Map<K, T[]> {
  return array.reduce((acc, item) => {
    const key = fn(item);
    const group = acc.get(key) || [];
    group.push(item);
    acc.set(key, group);
    return acc;
  }, new Map<K, T[]>());
}

/**
 * Creates an array of numbers from start to end
 *
 * @param {number} start - Start number
 * @param {number} end - End number
 * @param {number} step - Step size (default: 1)
 * @returns {number[]} Array of numbers
 *
 * @example
 * ```typescript
 * import { range } from '@awc/kettlejs/utils';
 *
 * range(0, 5); // [0, 1, 2, 3, 4, 5]
 * range(0, 10, 2); // [0, 2, 4, 6, 8, 10]
 * ```
 */
export function range(start: number, end: number, step: number = 1): number[] {
  const result: number[] = [];
  for (let i = start; i <= end; i += step) {
    result.push(i);
  }
  return result;
}

/**
 * Retries an async function
 *
 * @template T - Return type
 * @param {() => Promise<T>} fn - Async function to retry
 * @param {number} retries - Number of retries (default: 3)
 * @param {number} delay - Delay between retries in ms (default: 1000)
 * @returns {Promise<T>} Promise that resolves with the result
 *
 * @example
 * ```typescript
 * import { retry } from '@awc/kettlejs/utils';
 *
 * const data = await retry(
 *   () => fetch('/api/data').then(r => r.json()),
 *   3,
 *   1000
 * );
 * ```
 */
export async function retry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise((resolve) => setTimeout(resolve, delay));
    return retry(fn, retries - 1, delay);
  }
}

/**
 * Sleep for specified milliseconds
 *
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>} Promise that resolves after delay
 *
 * @example
 * ```typescript
 * import { sleep } from '@awc/kettlejs/utils';
 *
 * await sleep(1000); // Wait 1 second
 * ```
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Type guard to check if value is defined
 *
 * @template T - Value type
 * @param {T | null | undefined} value - Value to check
 * @returns {value is T} True if value is defined
 *
 * @example
 * ```typescript
 * import { isDefined } from '@awc/kettlejs/utils';
 *
 * const values = [1, null, 2, undefined, 3];
 * const defined = values.filter(isDefined); // [1, 2, 3]
 * ```
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Creates a chainable pipe function
 *
 * @param {...Function[]} fns - Functions to chain
 * @returns {Function} Piped function
 *
 * @example
 * ```typescript
 * import { pipe } from '@awc/kettlejs/utils';
 *
 * const transform = pipe(
 *   (x: number) => x * 2,
 *   (x: number) => x + 1,
 *   (x: number) => x.toString()
 * );
 * transform(5); // '11'
 * ```
 */
export function pipe<T>(...fns: Array<(arg: any) => any>): (arg: T) => any {
  return (arg: T) => fns.reduce((acc, fn) => fn(acc), arg);
}
