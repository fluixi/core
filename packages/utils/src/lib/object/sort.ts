import { isPlainObject } from './utils.js';
import type { AnyObject, SelectorFor } from './types.js';

// Public types

export type SortOrder = 'asc' | 'desc';

/**
 * Options for `sort()`.
 *
 * @template T - Element type when sorting an array, or the record type.
 *
 * Array sorting
 *   sort(users, { by: 'name' })
 *   sort(users, { by: ['lastName', 'firstName'], order: ['asc', 'asc'] })
 *   sort(scores, { order: 'desc' })
 *   sort(items, { comparator: (a, b) => a.priority - b.priority })
 *
 * Record sorting (orders keys)
 *   sort(config, { priorityKeys: ['id', 'name'] })
 *
 * Deep / recursive
 *   sort(tree, { deep: true })
 */
export interface SortOptions<T = any> {
  /**
   * Key path(s) used to compare object array elements.
   * Supports dot-notation for nested access: `'address.city'`.
   * When multiple keys are given, they act as tie-breakers left-to-right.
   * Only meaningful for object arrays; ignored for primitive arrays and records.
   */
  by?: T extends AnyObject
    ? SelectorFor<T> | SelectorFor<T>[]
    : string | string[];

  /**
   * Sort direction.  When `by` is an array you may supply a parallel array
   * of directions: one per key.  A single value applies to all keys.
   * Default: `'asc'`.
   */
  order?: SortOrder | SortOrder[];

  /**
   * Recursively sort nested arrays and plain-object values.
   * Default: `false`.
   */
  deep?: boolean;

  /**
   * For record-key sorting: these keys are placed first, in the given order,
   * before the remaining keys are sorted alphabetically.
   */
  priorityKeys?: string[];

  /**
   * Put `null` / `undefined` array elements at the end regardless of direction.
   * Default: `true`.
   */
  nullsLast?: boolean;

  /** BCP 47 locale tag used for string comparison, e.g. `'en-US'`. */
  locale?: string;

  /** Additional options forwarded to `Intl.Collator` when comparing strings. */
  localeOptions?: Intl.CollatorOptions;

  /**
   * Explicit index permutation for arrays.
   * `indices[i]` is the source index in the input array that should appear at
   * position `i` in the output.
   *
   * - Input elements not referenced by any index are appended at the end in
   *   their original relative order.
   * - Out-of-range indices are silently skipped.
   * - When combined with `order: 'desc'`, the permuted result is reversed.
   *
   * @example
   * sort(['a','b','c'], { indices: [2, 0, 1] }) // ['c', 'a', 'b']
   * sort(['a','b','c'], { indices: [1, 0] })     // ['b', 'a', 'c']  ('c' appended)
   * sort(users, { indices: [3, 1, 0, 2] })       // explicit UI reorder
   */
  indices?: number[];

  /**
   * Fully custom comparator. When supplied it overrides `by`, `order`, and
   * locale settings; only `deep` and `priorityKeys` still apply.
   */
  comparator?: (a: T, b: T) => number;
}

// Internal helpers

/** Read a value via dot-notation path, e.g. `'address.city'`. */
function getAtPath(obj: any, path: string): any {
  if (obj == null) return undefined;
  let cur = obj;
  for (const segment of path.split('.')) {
    if (cur == null) return undefined;
    cur = cur[segment];
  }
  return cur;
}

/**
 * Natural, type-aware comparison.
 * Returns negative / zero / positive like `Array.prototype.sort` expects.
 * Handles: null/undefined (always pushed last), NaN, Date, boolean, number, string.
 * Falls back to locale-aware string coercion for mixed / unknown types.
 */
function compareValues(
  a: any,
  b: any,
  locale?: string,
  localeOptions?: Intl.CollatorOptions
): number {
  // null / undefined: treated as "greater than anything" so they sink to the end
  const aN = a == null;
  const bN = b == null;
  if (aN && bN) return 0;
  if (aN) return 1;
  if (bN) return -1;

  // NaN: sink below null
  const aNaN = typeof a === 'number' && Number.isNaN(a);
  const bNaN = typeof b === 'number' && Number.isNaN(b);
  if (aNaN && bNaN) return 0;
  if (aNaN) return 1;
  if (bNaN) return -1;

  // Date
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }

  // Boolean (false < true)
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return (a === b ? 0 : a ? 1 : -1);
  }

  // Number (covers BigInt with coercion below)
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }

  // String: locale-aware
  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b, locale, localeOptions);
  }

  // Fallback: coerce both to string
  return String(a).localeCompare(String(b), locale, localeOptions);
}

/** Build a single numeric direction multiplier for the i-th sort key. */
function dirFor(order: SortOrder | SortOrder[] | undefined, i: number): 1 | -1 {
  const o = Array.isArray(order) ? (order[i] ?? 'asc') : (order ?? 'asc');
  return o === 'desc' ? -1 : 1;
}

// Core sort functions

/**
 * Sort a flat array of primitives, Dates, or mixed values using natural
 * comparison.  Respects `order`, `locale`, `localeOptions`, and `nullsLast`.
 */
function sortPrimitiveArray<T>(arr: T[], options: SortOptions<T>): T[] {
  const { order, locale, localeOptions, nullsLast = true } = options;
  const dir = dirFor(order, 0);

  return arr.slice().sort((a, b) => {
    const aN = a == null;
    const bN = b == null;
    if (aN && bN) return 0;
    if (aN) return nullsLast ? 1 : -1;
    if (bN) return nullsLast ? -1 : 1;
    return compareValues(a, b, locale, localeOptions) * dir;
  });
}

/**
 * Sort an array of objects by one or more key paths.
 * Keys are compared left-to-right; the next key is only consulted when all
 * previous keys produced a tie.
 */
function sortObjectArray<T extends object>(
  arr: T[],
  keys: string[],
  options: SortOptions<T>
): T[] {
  const { order, locale, localeOptions, nullsLast = true, comparator } = options;

  if (comparator) {
    return arr.slice().sort(comparator);
  }

  return arr.slice().sort((a, b) => {
    for (let i = 0; i < keys.length; i++) {
      const aVal = getAtPath(a, keys[i]);
      const bVal = getAtPath(b, keys[i]);

      const aN = aVal == null;
      const bN = bVal == null;
      if (aN && bN) continue;
      if (aN) return nullsLast ? 1 : -1;
      if (bN) return nullsLast ? -1 : 1;

      const cmp = compareValues(aVal, bVal, locale, localeOptions);
      if (cmp !== 0) return cmp * dirFor(order, i);
    }
    return 0;
  });
}

/**
 * Return a new plain object whose own keys are sorted alphabetically, with
 * `priorityKeys` pinned to the front.  Values are left untouched unless
 * `deep` is set.
 */
function sortRecord<T extends Record<string, any>>(
  record: T,
  options: SortOptions
): T {
  const { order, priorityKeys = [], locale, localeOptions, deep } = options;
  const dir = dirFor(order, 0);

  const prioritySet = new Set(priorityKeys);
  const rest = Object.keys(record).filter((k) => !prioritySet.has(k));
  rest.sort(
    (a, b) => a.localeCompare(b, locale, localeOptions) * dir
  );

  const ordered = [...priorityKeys.filter((k) => k in record), ...rest];

  const result: any = {};
  for (const key of ordered) {
    result[key] = deep ? sortDeep(record[key], options) : record[key];
  }
  return result as T;
}

/**
 * Recursively sort a value: sorts arrays in place (returning new array) and
 * sorts record-object keys.  Primitives and non-plain objects are returned
 * unchanged.
 */
function sortDeep(value: any, options: SortOptions): any {
  if (Array.isArray(value)) {
    // Deep-sort elements first, then sort the array itself
    const deepSorted = value.map((item) => sortDeep(item, options));
    return sortArrayValue(deepSorted, options);
  }
  if (isPlainObject(value)) {
    return sortRecord(value as Record<string, any>, options);
  }
  return value;
}

/**
 * Apply an explicit index permutation to an array.
 *
 * `indices[i]` names the source index that appears at position `i` in the
 * output.  Input elements not named by any index are appended at the end in
 * their original relative order.  Out-of-range indices are ignored.
 */
function applyIndices<T>(arr: T[], indices: number[]): T[] {
  const len = arr.length;
  const used = new Set<number>();
  const result: T[] = [];

  for (const idx of indices) {
    if (idx >= 0 && idx < len && !used.has(idx)) {
      result.push(arr[idx]);
      used.add(idx);
    }
  }

  // Append any elements not covered by the permutation
  for (let i = 0; i < len; i++) {
    if (!used.has(i)) result.push(arr[i]);
  }

  return result;
}

/**
 * Dispatch array sorting to the appropriate strategy based on the options
 * present: explicit index permutation → value-based sort → direction-only.
 */
function sortArrayValue<T>(arr: T[], options: SortOptions<T>): T[] {
  const { by, comparator, indices, order } = options;

  // ── Explicit index permutation ───────────────────────────────────────────
  if (indices) {
    const permuted = applyIndices(arr, indices);
    // order: 'desc' reverses the permuted result
    return dirFor(order, 0) === -1 ? permuted.reverse() : permuted;
  }

  // ── Custom comparator ────────────────────────────────────────────────────
  if (comparator) {
    return arr.slice().sort(comparator);
  }

  // ── Key-based sort ───────────────────────────────────────────────────────
  if (by) {
    const keys = Array.isArray(by) ? (by as string[]) : [by as string];
    return sortObjectArray(arr as any[], keys, options as any) as T[];
  }

  // ── No key: object arrays are ordered by index position ──────────────────
  // asc  = natural order (unchanged)
  // desc = reverse the array
  const firstReal = arr.find((x) => x != null);
  if (firstReal != null && isPlainObject(firstReal)) {
    return dirFor(order, 0) === -1 ? arr.slice().reverse() : arr.slice();
  }

  // ── Primitive array ──────────────────────────────────────────────────────
  return sortPrimitiveArray(arr, options);
}

// Public API

/**
 * Sort an array of any element type.
 *
 * @example
 * sort([3, 1, 2])                            // [1, 2, 3]
 * sort(['banana', 'apple', 'cherry'])        // ['apple', 'banana', 'cherry']
 * sort(users, { by: 'name' })
 * sort(users, { by: ['role', 'name'], order: ['asc', 'desc'] })
 * sort(items, { order: 'desc', deep: true })
 */
export function sort<T>(input: T[], options?: SortOptions<T>): T[];

/**
 * Sort the keys of a plain-object record, returning a new object with the
 * same entries but with keys in alphabetical order.
 *
 * @example
 * sort({ z: 1, a: 2, m: 3 })                       // { a: 2, m: 3, z: 1 }
 * sort(config, { priorityKeys: ['id', 'name'] })
 * sort(tree,   { deep: true })
 */
export function sort<T extends Record<string, any>>(
  input: T,
  options?: SortOptions
): T;

export function sort<T>(
  input: T[] | Record<string, any>,
  options: SortOptions<T> = {}
): T[] | Record<string, any> {
  const { deep } = options;

  if (Array.isArray(input)) {
    const items = deep
      ? (input as any[]).map((item) => sortDeep(item, options as SortOptions))
      : (input as T[]);
    return sortArrayValue(items as T[], options);
  }

  if (isPlainObject(input)) {
    return sortRecord(input as Record<string, any>, options as SortOptions);
  }

  return input as any;
}

// Convenience helpers

/**
 * Sort an array of objects by one or more key paths, returning a new array.
 * Shorthand for `sort(arr, { by: key, order })`.
 *
 * @example
 * sortBy(users, 'name')
 * sortBy(users, ['lastName', 'firstName'], 'asc')
 * sortBy(products, 'price', 'desc')
 */
export function sortBy<T extends object>(
  arr: T[],
  by: T extends AnyObject ? SelectorFor<T> | SelectorFor<T>[] : string | string[],
  order: SortOrder | SortOrder[] = 'asc',
  options: Omit<SortOptions<T>, 'by' | 'order'> = {}
): T[] {
  return sort(arr, { ...options, by, order } as SortOptions<T>);
}

/**
 * Sort the keys of a record object, returning a new object.
 * Shorthand for `sort(record, { order, priorityKeys, deep })`.
 *
 * @example
 * sortKeys({ z: 1, a: 2 })                        // { a: 2, z: 1 }
 * sortKeys(obj, { priorityKeys: ['id', 'type'] })
 * sortKeys(tree, { deep: true })
 */
export function sortKeys<T extends Record<string, any>>(
  record: T,
  options: Pick<SortOptions, 'order' | 'priorityKeys' | 'deep' | 'locale' | 'localeOptions'> = {}
): T {
  return sort(record, options);
}

/**
 * Move an element from one index to another, shifting the elements in between.
 * Returns a new array; the original is not mutated.
 *
 * - Clamps `from` and `to` to valid array bounds.
 * - When `from === to` the original array is returned as-is (same reference).
 *
 * @example
 * move(['a','b','c','d'], 0, 2)  // ['b','c','a','d']  (first → third)
 * move(['a','b','c','d'], 3, 1)  // ['a','d','b','c']  (last  → second)
 * move(users, fromIndex, toIndex)
 */
export function move<T>(arr: T[], from: number, to: number): T[] {
  const len = arr.length;
  if (len === 0) return arr.slice();

  const f = Math.max(0, Math.min(len - 1, from));
  const t = Math.max(0, Math.min(len - 1, to));
  if (f === t) return arr.slice();

  const result = arr.slice();
  const [item] = result.splice(f, 1);
  result.splice(t, 0, item);
  return result;
}

/**
 * Swap two elements by index, returning a new array.
 * The original array is not mutated.
 * Out-of-range indices throw a `RangeError`.
 *
 * @example
 * swap(['a','b','c'], 0, 2)  // ['c','b','a']
 * swap(users, 1, 3)
 */
export function swap<T>(arr: T[], i: number, j: number): T[] {
  const len = arr.length;
  if (i < 0 || i >= len) throw new RangeError(`swap: index ${i} out of range`);
  if (j < 0 || j >= len) throw new RangeError(`swap: index ${j} out of range`);
  if (i === j) return arr.slice();

  const result = arr.slice();
  result[i] = arr[j];
  result[j] = arr[i];
  return result;
}

/**
 * Reorder an array by providing the full desired sequence of source indices.
 * Shorthand for `sort(arr, { indices })`.
 *
 * @example
 * reorder(['a','b','c'], [2, 0, 1])          // ['c','a','b']
 * reorder(tabs, newIndexOrder)               // apply UI drag-and-drop result
 * reorder(rows, [3,1,0,2], 'desc')           // permute then reverse
 */
export function reorder<T>(
  arr: T[],
  indices: number[],
  order: SortOrder = 'asc'
): T[] {
  return sort(arr, { indices, order } as SortOptions<T>);
}
