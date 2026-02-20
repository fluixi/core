/**
 * Basic mathematical operations.
 * @module BasicMathFunctions
 */
import type { RoundingMode, Sign } from '../types/basic.js';
/**
 * Adds two numbers.
 * @param a - First operand
 * @param b - Second operand
 * @returns The sum of a and b
 */
export declare function add(a: number, b: number): number;
/**
 * Subtracts two numbers.
 * @param a - First operand
 * @param b - Second operand
 * @returns The difference of a and b (a - b)
 */
export declare function subtract(a: number, b: number): number;
/**
 * Divides two numbers.
 * @param a - Dividend
 * @param b - Divisor
 * @returns The quotient of a divided by b
 * @throws {Error} If b is 0
 */
export declare const divide: <T = number>(dividend: number, divisor: number, fallback?: T) => number | T;
/**
 * Calculates the modulo/remainder.
 * @param a - Dividend
 * @param b - Divisor
 * @returns The remainder of a divided by b
 */
export declare function modulo(a: number, b: number): number;
/**
 * Calculates the power of a number.
 * @param base - The base number
 * @param exponent - The exponent
 * @returns base raised to the power of exponent
 */
export declare function power(base: number, exponent: number): number;
/**
 * Calculates the square root of a number.
 * @param value - The number
 * @returns The square root of the number
 * @throws {Error} If value is negative
 */
export declare function sqrt(value: number): number;
/**
 * Calculates the absolute value of a number.
 * @param value - The number
 * @returns The absolute value
 */
export declare function abs(value: number): number;
/**
 * Robust rounding using David Gay's dtoa algorithm approach
 * @param value - The value to round
 * @param precision - Decimal precision (default: 0)
 * @returns Rounded number
 * @example
 * round(1.005, 2) // 1.01
 * round(123.456, -1) // 120
 */
export declare const round: (value: number, precision?: number, mode?: RoundingMode) => number;
/**
 * Rounds a number up to the nearest integer.
 * @param value - The number to round up
 * @returns The ceiling integer
 */
export declare const ceil: (value: number, precision?: number) => number;
/**
 * Rounds a number down to the nearest integer.
 * @param value - The number to round down
 * @returns The floored integer
 */
export declare const floor: (value: number, precision?: number) => number;
/**
 * Truncates the decimal part of a number.
 * @param value - The number to truncate
 * @returns The truncated integer
 */
export declare const trunc: (value: number, precision?: number) => number;
/**
 * Clamps a value between a minimum and maximum.
 * @param value - The value to clamp
 * @param min - The minimum allowed value
 * @param max - The maximum allowed value
 * @returns The clamped value
 */
export declare const clamp: (value: number, min: number, max: number) => number;
/**
 * Returns the sign of a number: -1, 0, or 1.
 * @param value - The number
 * @returns The sign of the number
 */
export declare function sign<T extends number>(value: T): Sign<T>;
/**
 * Calculates the factorial of a non-negative integer.
 * @param n - The integer
 * @returns The factorial of n
 * @throws {Error} If n is negative or not an integer
 */
export declare function factorial(n: number): number;
/**
 * Calculates the greatest common divisor (GCD) of two numbers.
 * @param a - First number
 * @param b - Second number
 * @returns The GCD of a and b
 */
export declare function gcd(a: number, b: number): number;
/**
 * Calculates the least common multiple (LCM) of two numbers.
 * @param a - First number
 * @param b - Second number
 * @returns The LCM of a and b
 */
export declare function lcm(a: number, b: number): number;
/**
 * Linearly interpolates between two values.
 * @param start - The starting value
 * @param end - The ending value
 * @param t - The interpolation factor (0 to 1)
 * @returns The interpolated value
 */
export declare function lerp(start: number, end: number, t: number): number;
/**
 * Inverse linear interpolation.
 * @param start - The starting value
 * @param end - The ending value
 * @param value - The value to interpolate
 * @returns The interpolation factor (0 to 1)
 */
export declare const invLerp: (start: number, end: number, value: number) => number;
/**
 * Maps a value from one range to another
 * @param value - The value to map
 * @param inMin - The minimum value of the input range
 * @param inMax - The maximum value of the input range
 * @param outMin - The minimum value of the output range
 * @param outMax - The maximum value of the output range
 * @returns The mapped value
 * Optimized: Uses lerp and invLerp
 */
export declare const mapRange: (value: number, inMin: number, inMax: number, outMin: number, outMax: number) => number;
/**
 * Returns the minimum of two or more numbers.
 * @param values - Numbers to compare
 * @returns The smallest number
 */
export declare function min(...values: number[]): number;
/**
 * Returns the maximum of two or more numbers.
 * @param values - Numbers to compare
 * @returns The largest number
 */
export declare function max(...values: number[]): number;
/**
 * Calculates the average of numbers.
 * @param values - Numbers to average
 * @returns The average
 */
export declare const average: (...numbers: number[]) => number;
/**
 * Calculates the sum of numbers.
 * @param values - Numbers to sum
 * @returns The sum
 */
export declare const sum: (...numbers: number[]) => number;
/**
 * Calculates the median of an array of numbers
 * @param numbers - Array of numbers
 * @returns The median
 * Optimized: Sorts only when necessary
 */
export declare const median: (...numbers: number[]) => number;
/**
 * Calculates the product of numbers.
 * @param values - Numbers to multiply
 * @returns The product
 */
export declare function product(...values: number[]): number;
//# sourceMappingURL=basic.d.ts.map