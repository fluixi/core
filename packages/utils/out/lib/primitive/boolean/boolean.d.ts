/**
 * Boolean utilities collection for TypeScript
 * Provides optimized methods for common boolean operations and conversions
 */
import type { BooleanConvertible, ComparatorCondition, ComparatorOperator, StrictBoolean } from './types.js';
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
export declare const isBoolean: (value: unknown) => value is boolean;
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
export declare const isBooleanLike: (value: BooleanConvertible) => value is StrictBoolean;
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
export declare const toBoolean: (value: unknown, strategy?: "strict" | "truthy" | "falsy" | "string" | "number", debug?: boolean) => boolean;
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
export declare const safeToBoolean: <T = boolean>(value: unknown, fallback?: T) => boolean | T;
/**
 * Checks if all values are truthy (logical AND)
 * @param values - Array of values to check
 * @returns True if all values are truthy
 * @example
 * all([true, 1, "hello"]) // true
 * all([true, false]) // false
 */
export declare const all: (values: unknown[]) => boolean;
/**
 * Checks if any value is truthy (logical OR)
 * @param values - Array of values to check
 * @returns True if any value is truthy
 * @example
 * any([false, 0, "hello"]) // true
 * any([false, 0, ""]) // false
 */
export declare const any: (values: unknown[]) => boolean;
/**
 * Checks if no values are truthy (logical NOR)
 * @param values - Array of values to check
 * @returns True if no values are truthy
 * @example
 * none([false, 0, ""]) // true
 * none([false, true]) // false
 */
export declare const none: (values: unknown[]) => boolean;
/**
 * Logical NOT operation
 * @param value - The value to negate
 * @returns Negated boolean value
 * @example
 * not(true) // false
 * not(false) // true
 * not(1) // false (truthy becomes false)
 */
export declare const not: (value: unknown) => boolean;
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
export declare const xor: (values: unknown[]) => boolean;
/**
 * Logical NAND operation (NOT AND)
 * Returns true unless all values are truthy
 * @param values - Array of values to check
 * @returns True unless all values are truthy
 * @example
 * nand([true, true]) // false
 * nand([true, false]) // true
 */
export declare const nand: (values: unknown[]) => boolean;
/**
 * Logical NOR operation (NOT OR)
 * Returns true only if all values are falsy
 * @param values - Array of values to check
 * @returns True only if all values are falsy
 * @example
 * nor([false, false]) // true
 * nor([false, true]) // false
 */
export declare const nor: (values: unknown[]) => boolean;
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
export declare const xnor: (values: unknown[]) => boolean;
/**
 * Counts truthy values in an array
 * @param values - Array of values to count
 * @returns Number of truthy values
 * @example
 * countTruthy([true, false, 1, 0, "hello"]) // 3
 */
export declare const countTruthy: (values: unknown[]) => number;
/**
 * Counts falsy values in an array
 * @param values - Array of values to count
 * @returns Number of falsy values
 * @example
 * countFalsy([true, false, 0, "", null]) // 3
 */
export declare const countFalsy: (values: unknown[]) => number;
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
export declare const createToggle: (initialState?: boolean) => (() => boolean);
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
export declare const compare: (a: unknown, b: unknown, operator?: ComparatorOperator) => boolean;
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
export declare const checkConditions: (value: unknown, checks: Array<ComparatorCondition>) => boolean;
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
export declare const validateBooleanConstraint: (value: unknown, constraint: "required" | "optional" | "true" | "false" | "truthy" | "falsy") => boolean;
/**
 * Generates random boolean value
 * @param probability - Probability of returning true (0 to 1, default: 0.5)
 * @returns Random boolean
 * @example
 * randomBoolean() // true or false with 50% probability
 * randomBoolean(0.8) // true 80% of the time
 */
export declare const randomBoolean: (probability?: number) => boolean;
/**
 * Debounces a boolean function
 * @param fn - Function that returns boolean
 * @param delay - Debounce delay in ms
 * @returns Debounced function
 */
export declare const debounceBoolean: (fn: (...args: any[]) => boolean, delay: number) => ((...args: any[]) => boolean);
/**
 * Memoizes a boolean function
 * @param fn - Function that returns boolean
 * @returns Memoized function
 */
export declare const memoizeBoolean: <T extends (...args: any[]) => boolean>(fn: T) => T;
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
export declare const createPipeline: (functions: Array<(value: any) => boolean>) => ((value: any) => boolean);
/**
 * Type guard for boolean array
 * @param value - Value to check
 * @returns True if value is a boolean array
 */
export declare const isBooleanArray: (value: unknown) => value is boolean[];
/**
 * Type guard for boolean-like array
 * @param value - Value to check
 * @returns True if value is a boolean-like array
 */
export declare const isBooleanLikeArray: (value: unknown) => value is StrictBoolean[];
type ValueType = string | boolean | undefined;
export declare const compareBoolean: <K extends ValueType>(value: K, newValue: K) => boolean;
declare const _default: {
    isBoolean: (value: unknown) => value is boolean;
    isBooleanLike: (value: BooleanConvertible) => value is StrictBoolean;
    toBoolean: (value: unknown, strategy?: "strict" | "truthy" | "falsy" | "string" | "number", debug?: boolean) => boolean;
    safeToBoolean: <T = boolean>(value: unknown, fallback?: T) => boolean | T;
    all: (values: unknown[]) => boolean;
    any: (values: unknown[]) => boolean;
    none: (values: unknown[]) => boolean;
    not: (value: unknown) => boolean;
    xor: (values: unknown[]) => boolean;
    nand: (values: unknown[]) => boolean;
    nor: (values: unknown[]) => boolean;
    xnor: (values: unknown[]) => boolean;
    countTruthy: (values: unknown[]) => number;
    countFalsy: (values: unknown[]) => number;
    createToggle: (initialState?: boolean) => (() => boolean);
    compare: (a: unknown, b: unknown, operator?: ComparatorOperator) => boolean;
    checkConditions: (value: unknown, checks: Array<ComparatorCondition>) => boolean;
    validateBooleanConstraint: (value: unknown, constraint: "required" | "optional" | "true" | "false" | "truthy" | "falsy") => boolean;
    randomBoolean: (probability?: number) => boolean;
    debounceBoolean: (fn: (...args: any[]) => boolean, delay: number) => ((...args: any[]) => boolean);
    memoizeBoolean: <T extends (...args: any[]) => boolean>(fn: T) => T;
    createPipeline: (functions: Array<(value: any) => boolean>) => ((value: any) => boolean);
    isBooleanArray: (value: unknown) => value is boolean[];
    isBooleanLikeArray: (value: unknown) => value is StrictBoolean[];
};
export default _default;
//# sourceMappingURL=boolean.d.ts.map