/**
 * Type guard functions for mathematical types.
 * @module TypeGuards
 */
import type { Integer, Vector2D, Vector3D, ComplexNumber, Fraction } from './types/index.js';
/**
 * Checks if a string is a valid numeric string.
 * @param value - The string to check
 * @returns True if the string is a valid numeric string
 */
export declare const isNumericString: (value: string) => boolean;
/**
 * Type guard to check if a value is numeric.
 * @param value - The value to check
 * @returns True if the value is numeric
 */
export declare const isNumeric: (value: unknown) => value is number | string;
/**
 * Checks if a value is an integer with high performance
 * @param value - The value to check
 * @returns True if the value is a valid integer
 * @example
* isInt(42) // true
* isInt("42") // true
* isInt("42.5") // false
* isInt(null) // false
*/
export declare const isInt: (value: unknown) => value is number;
/**
 * Checks if a value is a finite number (not NaN, Infinity, or string)
 * @param value - The value to check
 * @returns True if the value is a finite number
 * @example
* isNumber(42) // true
* isNumber(NaN) // false
* isNumber(Infinity) // false
* isNumber("42") // false
*/
export declare const isNumber: (value: unknown) => value is number;
/**
 * Checks if a value is a safe integer within Number.MAX_SAFE_INTEGER range
 * @param value - The value to check
 * @returns True if value is a safe integer
 * @example
* isSafeInteger(42) // true
* isSafeInteger(9007199254740992) // false (beyond safe range)
*/
export declare const isSafeInteger: (value: unknown) => boolean;
/**
 * Checks if a value is a float (not an integer)
 * @param value - The value to check
 * @returns True if the value is a float
*/
export declare const isFloat: (value: unknown) => boolean;
/**
 * Type guard to check if a number is an integer.
 * @param value - The number to check
 * @returns True if the number is an integer
 */
export declare function isInteger(value: unknown): value is Integer;
/**
 * Type guard to check if a number is a finite number.
 * @param value - The number to check
 * @returns True if the number is finite
 */
export declare function isFiniteNumber(value: number): boolean;
/**
 * Type guard to check if a value is a valid Vector2D.
 * @param value - The value to check
 * @returns True if the value is a valid Vector2D
 */
export declare function isVector2D(value: unknown): value is Vector2D;
/**
 * Type guard to check if a value is a valid Vector3D.
 * @param value - The value to check
 * @returns True if the value is a valid Vector3D
 */
export declare function isVector3D(value: unknown): value is Vector3D;
/**
 * Type guard to check if a value is a valid ComplexNumber.
 * @param value - The value to check
 * @returns True if the value is a valid ComplexNumber
 */
export declare function isComplexNumber(value: unknown): value is ComplexNumber;
/**
 * Type guard to check if a value is a valid Fraction.
 * @param value - The value to check
 * @returns True if the value is a valid Fraction
 */
export declare function isFraction(value: unknown): value is Fraction;
/**
 * Type guard to check if a value is a valid Matrix.
 * @param value - The value to check
 * @returns True if the value is a valid Matrix
 */
export declare function isMatrix(value: unknown): value is import('./types/index.js').Matrix<any, any>;
/**
 * Type guard to check if a number is positive (> 0).
 * @param value - The number to check
 * @returns True if the number is positive
 */
export declare const isPositive: (value: number) => boolean;
/**
 * Type guard to check if a number is negative (< 0).
 * @param value - The number to check
 * @returns True if the number is negative
 */
export declare const isNegative: (value: number) => boolean;
/**
 * Type guard to check if a number is non-negative (>= 0).
 * @param value - The number to check
 * @returns True if the number is non-negative
 */
export declare function isNonNegative(value: number): boolean;
/**
 * Type guard to check if a number is non-positive (<= 0).
 * @param value - The number to check
 * @returns True if the number is non-positive
 */
export declare function isNonPositive(value: number): boolean;
/**
 * Checks if a number is zero (or very close to zero)
 */
export declare const isZero: (value: number, epsilon?: number) => boolean;
/**
 * Type guard to check if a number is within a range (inclusive).
 * @param value - The number to check
 * @param min - Minimum value
 * @param max - Maximum value
 * @param inclusive - Whether the range is inclusive
 * @returns True if the number is within the range
 */
export declare function isInRange(value: number, min: number, max: number, inclusive?: boolean): boolean;
/**
 * Type guard to check if a number is even.
 * @param value - The number to check
 * @returns True if the number is even
 */
export declare function isEven(value: number): boolean;
/**
 * Type guard to check if a number is odd.
 * @param value - The number to check
 * @returns True if the number is odd
 */
export declare function isOdd(value: number): boolean;
/**
 * Checks if a number is prime.
 * @param n - The number to check
 * @returns True if the number is prime, false otherwise
 */
export declare const isPrime: (n: number) => boolean;
/**
 * Checks if two numbers are approximately equal.
 * @param a - First number
 * @param b - Second number
 * @param epsilon - The maximum allowed difference between the numbers
 * @returns True if the numbers are approximately equal, false otherwise
*/
export declare const approxEqual: (a: number, b: number, epsilon?: number) => boolean;
/**
 * Checks if a number is a power of two
 * @param n - The number to check
 * Optimized: Bitwise trick
 */
export declare const isPowerOfTwo: (n: number) => boolean;
//# sourceMappingURL=guards.d.ts.map