/**
 * Advanced mathematical operations.
 * @module AdvancedMathFunctions
 */
import type { Fraction } from '../types/advanced.js';
/**
 * Calculates the natural logarithm of a number.
 * @param value - The number
 * @returns The natural logarithm
 * @throws {Error} If value is not positive
 */
export declare function ln(value: number): number;
/**
 * Calculates the base-10 logarithm of a number.
 * @param value - The number
 * @returns The base-10 logarithm
 * @throws {Error} If value is not positive
 */
export declare function log10(value: number): number;
/**
 * Calculates the base-2 logarithm of a number.
 * @param value - The number
 * @returns The base-2 logarithm
 * @throws {Error} If value is not positive
 */
export declare function log2(value: number): number;
/**
 * Calculates the logarithm of a number with a custom base.
 * @param value - The number
 * @param base - The logarithm base
 * @returns The logarithm with specified base
 * @throws {Error} If value or base is not positive
 */
export declare function log(value: number, base: number): number;
/**
 * Calculates the exponential function e^x.
 * @param x - The exponent
 * @returns e raised to the power x
 */
export declare function exp(x: number): number;
/**
 * Calculates the cube root of a number.
 * @param value - The number
 * @returns The cube root
 */
export declare function cbrt(value: number): number;
/**
 * Calculates the nth root of a number.
 * @param value - The number
 * @param n - The root degree
 * @returns The nth root
 * @throws {Error} If n is 0 or value is negative for even n
 */
export declare function nthRoot(value: number, n: number): number;
/**
 * Solves a quadratic equation ax^2 + bx + c = 0.
 * @param a - Coefficient of x^2
 * @param b - Coefficient of x
 * @param c - Constant term
 * @returns Array of real roots (0, 1, or 2 roots)
 */
export declare function solveQuadratic(a: number, b: number, c: number): number[];
/**
 * Evaluates a polynomial at a given x value.
 * @param coefficients - Polynomial coefficients from highest to lowest degree
 * @param x - The value to evaluate at
 * @returns The polynomial value at x
 */
export declare function evaluatePolynomial(coefficients: number[], x: number): number;
/**
 * Simplifies a fraction to its lowest terms.
 * @param fraction - The fraction to simplify
 * @returns The simplified fraction
 */
export declare function simplifyFraction(fraction: Fraction): Fraction;
/**
 * Adds two fractions.
 * @param a - First fraction
 * @param b - Second fraction
 * @returns The sum as a simplified fraction
 */
export declare function addFractions(a: Fraction, b: Fraction): Fraction;
/**
 * Multiplies two fractions.
 * @param a - First fraction
 * @param b - Second fraction
 * @returns The product as a simplified fraction
 */
export declare function multiplyFractions(a: Fraction, b: Fraction): Fraction;
/**
 * Calculates the percentage of a number.
 * @param value - The number
 * @param percentage - The percentage (e.g., 25 for 25%)
 * @param precision - The number of decimal places
 * @returns The percentage of the number
 */
export declare const percentage: (value: number, total: number, precision?: number) => number;
/**
 * Converts a number to a specified base (2-36)
 *
 * @param number - The number
 */
export declare const toBase: (number: number, base: number, minLength?: number) => string;
/**
 * Converts a number to ordinal string (1st, 2nd, 3rd, etc.)
 *
 * @param n - The number
 */
export declare const toOrdinal: (n: number) => string;
/**
 * Generates a sequence of numbers
 *
 * @param start - The starting number
 * @param end - The ending number
 * @param step - The step size
 *
 * @returns An array of numbers
 */
export declare const range: (start: number, end: number, step?: number) => number[];
/**
 * Limits the number of decimal places without rounding
 *
 * @param value - The number
 * @param decimalPlaces - The number of decimal places
 *
 * @returns The truncated number
 */
export declare const truncateDecimals: (value: number, decimalPlaces: number) => number;
/**
 * Normalizes a value to a 0-1 range based on min/max
 *
 * @param value - The number
 * @param min - The minimum value
 * @param max - The maximum value
 *
 * @returns The normalized value
 */
export declare const normalize: (value: number, min: number, max: number) => number;
/**
 * Wraps a value within a range (like modulo for floats)
 *
 * @param value - The number
 * @param min - The minimum value
 * @param max - The maximum value
 *
 * @returns The wrapped value
 */
export declare const wrap: (value: number, min: number, max: number) => number;
//# sourceMappingURL=advanced.d.ts.map