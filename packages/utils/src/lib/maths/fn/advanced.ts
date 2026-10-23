/**
 * Advanced mathematical operations.
 * @module AdvancedMathFunctions
 */

import type { Fraction } from '../types/advanced.js';
import { gcd, round } from './basic.js';

/**
 * Calculates the natural logarithm of a number.
 * @param value - The number
 * @returns The natural logarithm
 * @throws {Error} If value is not positive
 */
export function ln(value: number): number {
  if (value <= 0) {
    throw new Error('Natural logarithm is only defined for positive numbers');
  }
  return Math.log(value);
}

/**
 * Calculates the base-10 logarithm of a number.
 * @param value - The number
 * @returns The base-10 logarithm
 * @throws {Error} If value is not positive
 */
export function log10(value: number): number {
  if (value <= 0) {
    throw new Error('Logarithm is only defined for positive numbers');
  }
  return Math.log10(value);
}

/**
 * Calculates the base-2 logarithm of a number.
 * @param value - The number
 * @returns The base-2 logarithm
 * @throws {Error} If value is not positive
 */
export function log2(value: number): number {
  if (value <= 0) {
    throw new Error('Logarithm is only defined for positive numbers');
  }
  return Math.log2(value);
}

/**
 * Calculates the logarithm of a number with a custom base.
 * @param value - The number
 * @param base - The logarithm base
 * @returns The logarithm with specified base
 * @throws {Error} If value or base is not positive
 */
export function log(value: number, base: number): number {
  if (value <= 0 || base <= 0) {
    throw new Error('Logarithm is only defined for positive numbers and bases');
  }
  return Math.log(value) / Math.log(base);
}

/**
 * Calculates the exponential function e^x.
 * @param x - The exponent
 * @returns e raised to the power x
 */
export function exp(x: number): number {
  return Math.exp(x);
}

/**
 * Calculates the cube root of a number.
 * @param value - The number
 * @returns The cube root
 */
export function cbrt(value: number): number {
  return Math.cbrt(value);
}

/**
 * Calculates the nth root of a number.
 * @param value - The number
 * @param n - The root degree
 * @returns The nth root
 * @throws {Error} If n is 0 or value is negative for even n
 */
export function nthRoot(value: number, n: number): number {
  if (n === 0) {
    throw new Error('Cannot calculate 0th root');
  }
  
  if (value < 0 && n % 2 === 0) {
    throw new Error('Cannot calculate even root of negative number');
  }
  
  const exponent = 1 / n;
  return Math.sign(value) * Math.pow(Math.abs(value), exponent);
}

/**
 * Solves a quadratic equation ax^2 + bx + c = 0.
 * @param a - Coefficient of x^2
 * @param b - Coefficient of x
 * @param c - Constant term
 * @returns Array of real roots (0, 1, or 2 roots)
 */
export function solveQuadratic(a: number, b: number, c: number): number[] {
  if (a === 0) {
    // Linear equation
    if (b === 0) return [];
    return [-c / b];
  }
  
  const discriminant = b * b - 4 * a * c;
  
  if (discriminant < 0) {
    return [];
  } else if (discriminant === 0) {
    return [-b / (2 * a)];
  } else {
    const sqrtDiscriminant = Math.sqrt(discriminant);
    return [
      (-b - sqrtDiscriminant) / (2 * a),
      (-b + sqrtDiscriminant) / (2 * a)
    ];
  }
}

/**
 * Evaluates a polynomial at a given x value.
 * @param coefficients - Polynomial coefficients from highest to lowest degree
 * @param x - The value to evaluate at
 * @returns The polynomial value at x
 */
export function evaluatePolynomial(coefficients: number[], x: number): number {
  let result = 0;
  for (let i = 0; i < coefficients.length; i++) {
    result = result * x + coefficients[i];
  }
  return result;
}

/**
 * Simplifies a fraction to its lowest terms.
 * @param fraction - The fraction to simplify
 * @returns The simplified fraction
 */
export function simplifyFraction(fraction: Fraction): Fraction {
  const divisor = gcd(fraction.numerator, fraction.denominator);
  return {
    numerator: fraction.numerator / divisor,
    denominator: fraction.denominator / divisor
  };
}

/**
 * Adds two fractions.
 * @param a - First fraction
 * @param b - Second fraction
 * @returns The sum as a simplified fraction
 */
export function addFractions(a: Fraction, b: Fraction): Fraction {
  const numerator = a.numerator * b.denominator + b.numerator * a.denominator;
  const denominator = a.denominator * b.denominator;
  return simplifyFraction({ numerator, denominator });
}

/**
 * Multiplies two fractions.
 * @param a - First fraction
 * @param b - Second fraction
 * @returns The product as a simplified fraction
 */
export function multiplyFractions(a: Fraction, b: Fraction): Fraction {
  const numerator = a.numerator * b.numerator;
  const denominator = a.denominator * b.denominator;
  return simplifyFraction({ numerator, denominator });
}

/**
 * Calculates the percentage of a number.
 * @param value - The number
 * @param percentage - The percentage (e.g., 25 for 25%)
 * @param precision - The number of decimal places
 * @returns The percentage of the number
 */
export const percentage = (
  value: number,
  total: number,
  precision: number = 2
): number => {
  if (total === 0) return 0;
  const percent = (value / total) * 100;
  return round(percent, precision);
};

/**
 * Converts a number to a specified base (2-36)
 * 
 * @param number - The number
 */
export const toBase = (
  number: number,
  base: number,
  minLength: number = 1
): string => {
  if (base < 2 || base > 36) {
    throw new Error('Base must be between 2 and 36');
  }
  
  const result = number.toString(base);
  return result.padStart(minLength, '0');
};

/**
 * Converts a number to ordinal string (1st, 2nd, 3rd, etc.)
 * 
 * @param n - The number
 */
export const toOrdinal = (n: number): string => {
  const suffix = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (suffix[(v - 20) % 10] || suffix[v] || suffix[0]);
};

/**
 * Generates a sequence of numbers
 * 
 * @param start - The starting number
 * @param end - The ending number
 * @param step - The step size
 * 
 * @returns An array of numbers
 */
export const range = (
  start: number,
  end: number,
  step: number = 1
): number[] => {
  const result: number[] = [];
  
  if (step === 0) return result;
  
  if (step > 0) {
    for (let i = start; i < end; i += step) {
      result.push(i);
    }
  } else {
    for (let i = start; i > end; i += step) {
      result.push(i);
    }
  }
  
  return result;
};

/**
 * Limits the number of decimal places without rounding
 * 
 * @param value - The number
 * @param decimalPlaces - The number of decimal places
 * 
 * @returns The truncated number
 */
export const truncateDecimals = (
  value: number,
  decimalPlaces: number
): number => {
  if (!Number.isFinite(value)) return value;
  
  const factor = 10 ** decimalPlaces;
  return Math.trunc(value * factor) / factor;
};

/**
 * Normalizes a value to a 0-1 range based on min/max
 * 
 * @param value - The number
 * @param min - The minimum value
 * @param max - The maximum value
 * 
 * @returns The normalized value
 */
export const normalize = (
  value: number,
  min: number,
  max: number
): number => {
  if (min === max) return 0;
  return (value - min) / (max - min);
};

/**
 * Wraps a value within a range (like modulo for floats)
 * 
 * @param value - The number
 * @param min - The minimum value
 * @param max - The maximum value
 * 
 * @returns The wrapped value
 */
export const wrap = (value: number, min: number, max: number): number => {
  const range = max - min;
  return ((((value - min) % range) + range) % range) + min;
};