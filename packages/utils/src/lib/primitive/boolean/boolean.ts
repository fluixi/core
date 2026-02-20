/**
 * Boolean utilities collection for TypeScript
 * Provides optimized methods for common boolean operations and conversions
 */

import type {
  BooleanConvertible,
  ComparatorCondition,
  ComparatorOperator,
  StrictBoolean,
} from './types.js';

/**
 * Checks if a value is a boolean (strict type guard)
 * @param value - The value to check
 * @returns True if value is exactly true or false
 * @example
 * isBoolean(true) // true
 * isBoolean(false) // true
 * isBoolean(1) // false
 * isBoolean("true") // false
 */
export const isBoolean = (value: unknown): value is boolean => {
  return value === true || value === false;
};

/**
 * Checks if a value is a boolean or boolean-like
 * Accepts 0, 1, "true", "false", "0", "1" as boolean-like
 * @param value - The value to check
 * @returns True if value is boolean or boolean-like
 * @example
 * isBooleanLike(true) // true
 * isBooleanLike(1) // true
 * isBooleanLike("true") // true
 * isBooleanLike("yes") // false
 */
export const isBooleanLike = (
  value: BooleanConvertible
): value is StrictBoolean => {
  if (value === true || value === false) return true;
  if (value === 0 || value === 1) return true;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return (
      lower === 'true' || lower === 'false' || lower === '0' || lower === '1'
    );
  }
  return false;
};

/**
 * Converts any value to boolean with various strategies
 * @param value - The value to convert
 * @param strategy - Conversion strategy (default: 'strict')
 *   - 'strict': Only true/false, 1/0, "true"/"false", "1"/"0" are converted
 *   - 'truthy': JavaScript truthy values become true
 *   - 'falsy': JavaScript falsy values become false
 *   - 'string': Parse string representations strictly
 *   - 'number': Parse number representations strictly
 * @returns Converted boolean
 * @throws {Error} If value cannot be converted with strict strategy
 * @example
 * toBoolean("true") // true
 * toBoolean(1) // true
 * toBoolean("yes", "strict") // throws Error
 * toBoolean("yes", "truthy") // true (non-empty string is truthy)
 */
export const toBoolean = (
  value: unknown,
  strategy: 'strict' | 'truthy' | 'falsy' | 'string' | 'number' = 'strict',
  debug = false
): boolean => {
  // Handle null/undefined

  // if (debug) {
  //   console.log('null value', strategy, value);
  // }
  if (value === null) {
    if (strategy === 'strict') {
      throw new Error(
        `Cannot convert ${value} to boolean with strict strategy`
      );
    }
    // return false;
  }

  // Handle boolean directly
  if (typeof value === 'boolean') {
    return value;
  }

  switch (strategy) {
    case 'strict':
      return convertStrict(value);

    case 'truthy':
      return Boolean(value);

    case 'falsy':
      return convertFalsy(value);
    // return !convertFalsy(value);

    case 'string':
      return convertFromString(value);

    case 'number':
      return convertFromNumber(value);

    default:
      return Boolean(value);
  }
};

/**
 * Strict conversion for toBoolean
 */
const convertStrict = (_value: unknown): boolean => {
  const value =
    typeof _value === 'string' ? _value.trim().toLowerCase() : _value;
  if (value === 1 || value === '1') return true;
  if (value === 0 || value === '0') return false;

  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    throw new Error(
      `Cannot convert string "${value}" to boolean with strict strategy`
    );
  }

  if (value === true) return true;
  if (value === false) return false;

  throw new Error(
    `Cannot convert ${typeof value} to boolean with strict strategy`
  );
};

/**
 * Falsy conversion for toBoolean
 */
const convertFalsy = (value: unknown): boolean => {
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if (
      trimmed === '' ||
      trimmed === '0' ||
      trimmed === 'false' ||
      trimmed === 'null' ||
      trimmed === 'undefined' ||
      trimmed === 'nan'
    ) {
      return false;
    }
    return true;
  }

  if (typeof value === 'number') {
    if (value === 0 || isNaN(value)) return false;
    return true;
  }

  return Boolean(value);
};

/**
 * String conversion for toBoolean
 */
const convertFromString = (value: unknown): boolean => {
  if (typeof value !== 'string') {
    throw new Error(
      `String strategy requires string input, got ${typeof value}`
    );
  }

  const trimmed = value.trim().toLowerCase();

  // True values
  if (
    ['true', 'yes', 'y', 'on', '1', 'enabled', 'enable', 'active'].includes(
      trimmed
    )
  ) {
    return true;
  }

  // False values
  if (
    [
      'false',
      'no',
      'n',
      'off',
      '0',
      'disabled',
      'disable',
      'inactive',
    ].includes(trimmed)
  ) {
    return false;
  }

  // Try to parse as number
  if (!isNaN(Number(trimmed))) {
    return Number(trimmed) !== 0;
  }

  throw new Error(`Cannot convert string "${value}" to boolean`);
};

/**
 * Number conversion for toBoolean
 */
const convertFromNumber = (value: unknown): boolean => {
  if (typeof value !== 'number') {
    throw new Error(
      `Number strategy requires number input, got ${typeof value}`
    );
  }

  if (isNaN(value)) return false;
  if (value === 0) return false;
  if (value === 1) return true;

  // For other numbers, non-zero is truthy
  return value !== 0;
};

/**
 * Safely converts any value to boolean with fallback
 * @param value - The value to convert
 * @param fallback - Fallback value if conversion fails (default: false)
 * @returns Converted boolean or fallback
 * @example
 * safeToBoolean("true") // true
 * safeToBoolean("invalid", true) // true (fallback)
 * safeToBoolean(null, false) // false
 */
export const safeToBoolean = <T = boolean>(
  value: unknown,
  fallback?: T
): boolean | T => {
  try {
    return toBoolean(value, 'strict');
  } catch {
    return fallback !== undefined ? fallback : false;
  }
};

/**
 * Checks if all values are truthy (logical AND)
 * @param values - Array of values to check
 * @returns True if all values are truthy
 * @example
 * all([true, 1, "hello"]) // true
 * all([true, false]) // false
 */
export const all = (values: unknown[]): boolean => {
  if (!Array.isArray(values) || values.length === 0) {
    return false;
  }

  for (const value of values) {
    if (!Boolean(value)) {
      return false;
    }
  }

  return true;
};

/**
 * Checks if any value is truthy (logical OR)
 * @param values - Array of values to check
 * @returns True if any value is truthy
 * @example
 * any([false, 0, "hello"]) // true
 * any([false, 0, ""]) // false
 */
export const any = (values: unknown[]): boolean => {
  if (!Array.isArray(values) || values.length === 0) {
    return false;
  }

  for (const value of values) {
    if (Boolean(value)) {
      return true;
    }
  }

  return false;
};

/**
 * Checks if no values are truthy (logical NOR)
 * @param values - Array of values to check
 * @returns True if no values are truthy
 * @example
 * none([false, 0, ""]) // true
 * none([false, true]) // false
 */
export const none = (values: unknown[]): boolean => {
  return !any(values);
};

/**
 * Logical NOT operation
 * @param value - The value to negate
 * @returns Negated boolean value
 * @example
 * not(true) // false
 * not(false) // true
 * not(1) // false (truthy becomes false)
 */
export const not = (value: unknown): boolean => {
  return !Boolean(value);
};

/**
 * Logical XOR operation (exclusive OR)
 * Returns true if exactly one of the values is truthy
 * @param values - Array of values to check
 * @returns True if exactly one value is truthy
 * @example
 * xor([true, false]) // true
 * xor([true, true]) // false
 * xor([false, false]) // false
 */
export const xor = (values: unknown[]): boolean => {
  if (!Array.isArray(values)) {
    return false;
  }

  let truthyCount = 0;

  for (const value of values) {
    if (Boolean(value)) {
      truthyCount++;
      if (truthyCount > 1) {
        return false; // Early exit if more than one truthy
      }
    }
  }

  return truthyCount === 1;
};

/**
 * Logical NAND operation (NOT AND)
 * Returns true unless all values are truthy
 * @param values - Array of values to check
 * @returns True unless all values are truthy
 * @example
 * nand([true, true]) // false
 * nand([true, false]) // true
 */
export const nand = (values: unknown[]): boolean => {
  return !all(values);
};

/**
 * Logical NOR operation (NOT OR)
 * Returns true only if all values are falsy
 * @param values - Array of values to check
 * @returns True only if all values are falsy
 * @example
 * nor([false, false]) // true
 * nor([false, true]) // false
 */
export const nor = (values: unknown[]): boolean => {
  return none(values);
};

/**
 * Logical XNOR operation (equivalence)
 * Returns true if all values are the same truthiness
 * @param values - Array of values to check
 * @returns True if all values have same truthiness
 * @example
 * xnor([true, true]) // true
 * xnor([true, false]) // false
 * xnor([false, false, false]) // true
 */
export const xnor = (values: unknown[]): boolean => {
  if (!Array.isArray(values) || values.length === 0) {
    return true;
  }

  const firstTruthy = Boolean(values[0]);

  for (let i = 1; i < values.length; i++) {
    if (Boolean(values[i]) !== firstTruthy) {
      return false;
    }
  }

  return true;
};

/**
 * Counts truthy values in an array
 * @param values - Array of values to count
 * @returns Number of truthy values
 * @example
 * countTruthy([true, false, 1, 0, "hello"]) // 3
 */
export const countTruthy = (values: unknown[]): number => {
  if (!Array.isArray(values)) {
    return 0;
  }

  let count = 0;

  for (const value of values) {
    if (Boolean(value)) {
      count++;
    }
  }

  return count;
};

/**
 * Counts falsy values in an array
 * @param values - Array of values to count
 * @returns Number of falsy values
 * @example
 * countFalsy([true, false, 0, "", null]) // 3
 */
export const countFalsy = (values: unknown[]): number => {
  if (!Array.isArray(values)) {
    return 0;
  }

  return values.length - countTruthy(values);
};

/**
 * Creates a boolean toggle function
 * @param initialState - Initial state (default: false)
 * @returns Function that toggles and returns current state
 * @example
 * const toggle = createToggle();
 * toggle() // true
 * toggle() // false
 * toggle() // true
 */
export const createToggle = (
  initialState: boolean = false
): (() => boolean) => {
  let state = initialState;

  return () => {
    state = !state;
    return state;
  };
};

/**
 * Compares two values with various comparison operators
 * @param a - First value
 * @param b - Second value
 * @param operator - Comparison operator
 * @returns Result of comparison
 * @example
 * compare(5, 3, '>') // true
 * compare(5, 5, '===') // false (different types)
 * compare(5, '5', '==') // true
 */
export const compare = (
  a: unknown,
  b: unknown,
  operator: ComparatorOperator = '==='
): boolean => {
  switch (operator) {
    case '==':
      return a == b;
    case '===':
      return a === b;
    case '!=':
      return a != b;
    case '!==':
      return a !== b;
    case '>':
      return (a as any) > (b as any);
    case '<':
      return (a as any) < (b as any);
    case '>=':
      return (a as any) >= (b as any);
    case '<=':
      return (a as any) <= (b as any);
    default:
      throw new Error(`Unsupported operator: ${operator}`);
  }
};

/**
 * Creates a boolean condition checker with multiple comparisons
 * @param value - The value to check
 * @param checks - Array of comparison checks
 * @returns True if all checks pass
 * @example
 * checkConditions(5, [
 *   { operator: '>', value: 0 },
 *   { operator: '<', value: 10 }
 * ]) // true
 */
export const checkConditions = (
  value: unknown,
  checks: Array<ComparatorCondition>
): boolean => {
  for (const check of checks) {
    if (!compare(value, check.value, check.operator)) {
      return false;
    }
  }
  return true;
};

/**
 * Validates that a value is within a boolean constraint
 * @param value - The value to validate
 * @param constraint - Constraint type
 * @returns True if value meets constraint
 * @example
 * validateBooleanConstraint(true, 'required') // true
 * validateBooleanConstraint(false, 'required') // false
 * validateBooleanConstraint(undefined, 'optional') // true
 */
export const validateBooleanConstraint = (
  value: unknown,
  constraint: 'required' | 'optional' | 'true' | 'false' | 'truthy' | 'falsy'
): boolean => {
  switch (constraint) {
    case 'required':
      return value === true;
    case 'optional':
      return value === true || value === false;
    case 'true':
      return value === true;
    case 'false':
      return value === false;
    case 'truthy':
      return Boolean(value);
    case 'falsy':
      return !Boolean(value);
    default:
      return false;
  }
};

/**
 * Generates random boolean value
 * @param probability - Probability of returning true (0 to 1, default: 0.5)
 * @returns Random boolean
 * @example
 * randomBoolean() // true or false with 50% probability
 * randomBoolean(0.8) // true 80% of the time
 */
export const randomBoolean = (probability: number = 0.5): boolean => {
  if (probability < 0 || probability > 1) {
    throw new Error('Probability must be between 0 and 1');
  }

  if (probability === 0) return false;

  return Math.random() <= probability;
};

/**
 * Debounces a boolean function
 * @param fn - Function that returns boolean
 * @param delay - Debounce delay in ms
 * @returns Debounced function
 */
export const debounceBoolean = (
  fn: (...args: any[]) => boolean,
  delay: number
): ((...args: any[]) => boolean) => {
  let timeoutId: NodeJS.Timeout;
  let lastResult: boolean;

  return (...args: any[]) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      lastResult = fn(...args);
    }, delay);

    return lastResult;
  };
};

/**
 * Memoizes a boolean function
 * @param fn - Function that returns boolean
 * @returns Memoized function
 */
export const memoizeBoolean = <T extends (...args: any[]) => boolean>(
  fn: T
): T => {
  const cache = new WeakMap<object, Map<string, boolean>>();

  return ((...args: any[]) => {
    // Get a stable key for the cache
    let keyObj: object | null = null;
    let keyString = '';

    // Find the first object argument to use as WeakMap key
    for (let i = 0; i < args.length; i++) {
      if (args[i] !== null && typeof args[i] === 'object') {
        keyObj = args[i];
        break;
      }
    }

    // Create a string key for the remaining arguments
    keyString = JSON.stringify(args);

    if (keyObj) {
      // Use a two-level cache with WeakMap -> Map for object arguments
      let objCache = cache.get(keyObj);
      if (!objCache) {
        objCache = new Map<string, boolean>();
        cache.set(keyObj, objCache);
      }

      if (objCache.has(keyString)) {
        return objCache.get(keyString);
      }

      const result = fn(...args);
      objCache.set(keyString, result);
      return result;
    } else {
      // Fallback to string-only cache for primitive arguments
      const stringCache =
        cache.get(Object.prototype) || new Map<string, boolean>();
      if (!cache.has(Object.prototype)) {
        cache.set(Object.prototype, stringCache);
      }

      if (stringCache.has(keyString)) {
        return stringCache.get(keyString);
      }

      const result = fn(...args);
      stringCache.set(keyString, result);
      return result;
    }
  }) as T;
};

/**
 * Creates a boolean pipeline (function composition)
 * @param functions - Array of functions that return boolean
 * @returns Function that applies all functions with AND logic
 * @example
 * const pipeline = createPipeline([
 *   (x) => x > 0,
 *   (x) => x < 10,
 *   (x) => x % 2 === 0
 * ]);
 * pipeline(4) // true
 * pipeline(5) // false
 */
export const createPipeline = (
  functions: Array<(value: any) => boolean>
): ((value: any) => boolean) => {
  return (value: any) => {
    for (const fn of functions) {
      if (!fn(value)) {
        return false;
      }
    }
    return true;
  };
};

/**
 * Type guard for boolean array
 * @param value - Value to check
 * @returns True if value is a boolean array
 */
export const isBooleanArray = (value: unknown): value is boolean[] => {
  return (
    Array.isArray(value) &&
    value.every((item) => item === true || item === false)
  );
};

/**
 * Type guard for boolean-like array
 * @param value - Value to check
 * @returns True if value is a boolean-like array
 */
export const isBooleanLikeArray = (
  value: unknown
): value is StrictBoolean[] => {
  return Array.isArray(value) && value.every((item) => isBooleanLike(item));
};

type ValueType = string | boolean | undefined;
export const compareBoolean = <K extends ValueType>(value: K, newValue: K) => {
  const o = toBoolean(value);
  const n = toBoolean(newValue);
  return o !== n;
};

// Export all utilities
export default {
  isBoolean,
  isBooleanLike,
  toBoolean,
  safeToBoolean,
  all,
  any,
  none,
  not,
  xor,
  nand,
  nor,
  xnor,
  countTruthy,
  countFalsy,
  createToggle,
  compare,
  checkConditions,
  validateBooleanConstraint,
  randomBoolean,
  debounceBoolean,
  memoizeBoolean,
  createPipeline,
  isBooleanArray,
  isBooleanLikeArray,
};
