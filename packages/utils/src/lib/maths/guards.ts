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
export const isNumericString = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed === '') return false;
  
  // Allow: optional sign, digits, optional decimal with digits, optional exponent
  if (!/^[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?$/.test(trimmed)) return false;
  
  const num = Number(trimmed);
  return Number.isFinite(num);
};

/**
 * Type guard to check if a value is numeric.
 * @param value - The value to check
 * @returns True if the value is numeric
 */
export const isNumeric = (value: unknown): value is number | string => {
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') return isNumericString(value);
  return false;
};

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
export const isInt = (value: unknown): value is number => {
  // Fast path: number type
  if (typeof value === 'number') {
    return Number.isInteger(value);
  }

  // Fast path: string type
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return false;
    
    // Fast regex check: optional sign, digits only
    if (!/^[-+]?\d+$/.test(trimmed)) return false;
    
    // Parse and validate
    const num = Number(trimmed);
    return Number.isInteger(num) && Number.isFinite(num);
  }

  // Fast reject for non-numeric types
  if (typeof value === 'boolean' || value == null) {
    return false;
  }
  if(Array.isArray(value)) return false;

  // For other types, attempt conversion
  const num = Number(value);
  return !Number.isNaN(num) && Number.isInteger(num) && Number.isFinite(num);
};

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
export const isNumber = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isFinite(value);
};

/**
 * Checks if a value is a safe integer within Number.MAX_SAFE_INTEGER range
 * @param value - The value to check
 * @returns True if value is a safe integer
 * @example
* isSafeInteger(42) // true
* isSafeInteger(9007199254740992) // false (beyond safe range)
*/
export const isSafeInteger = (value: unknown): boolean => {
 return typeof value === 'number' && Number.isSafeInteger(value);
};

/** 
 * Checks if a value is a float (not an integer)
 * @param value - The value to check
 * @returns True if the value is a float
*/
export const isFloat = (value: unknown): boolean => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  return !Number.isInteger(value);
};
/**
 * Type guard to check if a number is an integer.
 * @param value - The number to check
 * @returns True if the number is an integer
 */
export function isInteger(value: unknown): value is Integer {
  return Number.isInteger(value);
}

/**
 * Type guard to check if a number is a finite number.
 * @param value - The number to check
 * @returns True if the number is finite
 */
export function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value);
}

/**
 * Type guard to check if a value is a valid Vector2D.
 * @param value - The value to check
 * @returns True if the value is a valid Vector2D
 */
export function isVector2D(value: unknown): value is Vector2D {
  return (
    typeof value === 'object' &&
    value !== null &&
    'x' in value &&
    'y' in value &&
    typeof (value as any).x === 'number' &&
    typeof (value as any).y === 'number'
  );
}

/**
 * Type guard to check if a value is a valid Vector3D.
 * @param value - The value to check
 * @returns True if the value is a valid Vector3D
 */
export function isVector3D(value: unknown): value is Vector3D {
  return (
    typeof value === 'object' &&
    value !== null &&
    'x' in value &&
    'y' in value &&
    'z' in value &&
    typeof (value as any).x === 'number' &&
    typeof (value as any).y === 'number' &&
    typeof (value as any).z === 'number'
  );
}

/**
 * Type guard to check if a value is a valid ComplexNumber.
 * @param value - The value to check
 * @returns True if the value is a valid ComplexNumber
 */
export function isComplexNumber(value: unknown): value is ComplexNumber {
  return (
    typeof value === 'object' &&
    value !== null &&
    'real' in value &&
    'imag' in value &&
    typeof (value as any).real === 'number' &&
    typeof (value as any).imag === 'number'
  );
}

/**
 * Type guard to check if a value is a valid Fraction.
 * @param value - The value to check
 * @returns True if the value is a valid Fraction
 */
export function isFraction(value: unknown): value is Fraction {
  return (
    typeof value === 'object' &&
    value !== null &&
    'numerator' in value &&
    'denominator' in value &&
    typeof (value as any).numerator === 'number' &&
    typeof (value as any).denominator === 'number' &&
    (value as any).denominator !== 0
  );
}

/**
 * Type guard to check if a value is a valid Matrix.
 * @param value - The value to check
 * @returns True if the value is a valid Matrix
 */
export function isMatrix(value: unknown): value is import('./types/index.js').Matrix<any, any> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'rows' in value &&
    'columns' in value &&
    'data' in value &&
    typeof (value as any).rows === 'number' &&
    typeof (value as any).columns === 'number' &&
    Array.isArray((value as any).data) &&
    (value as any).data.every((row: unknown) => Array.isArray(row))
  );
}

/**
 * Type guard to check if a number is positive (> 0).
 * @param value - The number to check
 * @returns True if the number is positive
 */
export const isPositive = (value: number): boolean => {
  return Number.isFinite(value) && value > 0;
};

/**
 * Type guard to check if a number is negative (< 0).
 * @param value - The number to check
 * @returns True if the number is negative
 */
export const isNegative = (value: number): boolean => {
  return Number.isFinite(value) && value < 0;
};

/**
 * Type guard to check if a number is non-negative (>= 0).
 * @param value - The number to check
 * @returns True if the number is non-negative
 */
export function isNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

/**
 * Type guard to check if a number is non-positive (<= 0).
 * @param value - The number to check
 * @returns True if the number is non-positive
 */
export function isNonPositive(value: number): boolean {
  return Number.isFinite(value) && value <= 0;
}

/**
 * Checks if a number is zero (or very close to zero)
 */
export const isZero = (value: number, epsilon: number = 1e-10): boolean => {
  return Number.isFinite(value) && Math.abs(value) < epsilon;
};

/**
 * Type guard to check if a number is within a range (inclusive).
 * @param value - The number to check
 * @param min - Minimum value
 * @param max - Maximum value
 * @param inclusive - Whether the range is inclusive
 * @returns True if the number is within the range
 */
export function isInRange(value: number, min: number, max: number, inclusive: boolean = true): boolean {
  return inclusive ? value >= min && value <= max : value > min && value < max;
}

/**
 * Type guard to check if a number is even.
 * @param value - The number to check
 * @returns True if the number is even
 */
export function isEven(value: number): boolean {
  return (value & 1) === 0;
}

/**
 * Type guard to check if a number is odd.
 * @param value - The number to check
 * @returns True if the number is odd
 */
export function isOdd(value: number): boolean {
  return (value & 1) === 1;
}

/**
 * Checks if a number is prime.
 * @param n - The number to check
 * @returns True if the number is prime, false otherwise
 */
export const isPrime = (n: number): boolean => {
  // First check if it's an integer
  if (!Number.isInteger(n)) {
    return false;
  }
  
  if (n <= 1) return false;
  if (n <= 3) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  
  return true;
};

/** 
 * Checks if two numbers are approximately equal.
 * @param a - First number
 * @param b - Second number
 * @param epsilon - The maximum allowed difference between the numbers
 * @returns True if the numbers are approximately equal, false otherwise 
*/
export const approxEqual = (
  a: number,
  b: number,
  epsilon: number = Math.E
): boolean => {
  // Handle edge cases
  if (a === b) return true;
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    // Both are NaN or both are same infinity
    return a === b;
  }
  
  // Use relative epsilon for better precision across different magnitudes
  const absA = Math.abs(a);
  const absB = Math.abs(b);
  const diff = Math.abs(a - b);
  
  // For very small numbers, use absolute epsilon
  if (a === 0 || b === 0 || diff < epsilon) {
    return diff < epsilon;
  }
  if(diff > epsilon) return false;
  // For larger numbers, use relative epsilon
  const relativeError = diff / Math.min(absA + absB, Number.MAX_SAFE_INTEGER);
  return relativeError < epsilon;
};

/**
 * Checks if a number is a power of two
 * @param n - The number to check
 * Optimized: Bitwise trick
 */
export const isPowerOfTwo = (n: number): boolean => {
  return n > 0 && (n & (n - 1)) === 0;
};