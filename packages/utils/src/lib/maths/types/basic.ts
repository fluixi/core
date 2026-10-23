/**
 * Basic mathematical type definitions.
 * @module MathTypes
 */

/**
 * Represents any numeric value that can be used in mathematical operations.
 */
export type Numeric = number | bigint;

export type RoundingMode = 'round' | 'ceil' | 'floor' | 'trunc' | 'david';

/**
 * Represents integer values (both number and bigint).
 */
export type Integer = number;

/**
 * Represents floating-point numbers.
 */
export type Float = number;

/**
 * Represents a positive number (> 0).
 */
export type Positive<T extends number> = `${T}` extends
  | `-${string}`
  | `${0}`
  | `-${0}`
  ? never
  : T extends 0
  ? never
  : T;

/**
 * Represents a negative number (< 0).
 */
export type Negative<T extends number> = `${T}` extends `-${string}`
  ? T extends 0
    ? never
    : T
  : never;

/**
 * Represents a non-negative number (>= 0).
 */
export type NonNegative<T extends number> = `${T}` extends `-${string}`
  ? never
  : T;

/**
 * Represents a non-positive number (<= 0).
 */
export type NonPositive<T extends number> = `${T}` extends `-${string}`
  ? T
  : T extends 0
  ? 0
  : never;

/**
 * Type guard: Checks if a number is positive.
 */
export type IsPositive<T extends number> = T extends Positive<T> ? true : false;

/**
 * Type guard: Checks if a number is negative.
 */
export type IsNegative<T extends number> = T extends Negative<T> ? true : false;

/**
 * Type guard: Checks if a number is zero.
 */
export type IsZero<T extends number> = T extends 0 ? true : false;

/**
 * Represents a whole number (integer >= 0).
 */
export type WholeNumber = NonNegative<Integer>;

/**
 * Represents a prime number (type-level approximation).
 * Note: TypeScript cannot fully compute primality at type level,
 * but we can define it for small known primes.
 */
export type Prime<T extends number> = T extends
  | 2
  | 3
  | 5
  | 7
  | 11
  | 13
  | 17
  | 19
  | 23
  | 29
  | 31
  | 37
  | 41
  | 43
  | 47
  | 53
  | 59
  | 61
  | 67
  | 71
  | 73
  | 79
  | 83
  | 89
  | 97
  ? T
  : never;

/**
 * Represents a rational number as numerator/denominator.
 */
export type Rational<T extends number, U extends number> = {
  numerator: T;
  denominator: U extends 0 ? never : U;
};

/**
 * Type for degrees angle measurement with brand.
 */
export type Degrees = number & { readonly __brand: 'Degrees' };

/**
 * Type for radians angle measurement with brand.
 */
export type Radians = number & { readonly __brand: 'Radians' };

/**
 * Type for gradians angle measurement with brand.
 */
export type Gradians = number & { readonly __brand: 'Gradians' };

/**
 * Represents a mathematical sign: -1, 0, or 1.
 */
/**
 * Extracts the sign of a number as a type.
 * Returns -1, 0, or 1 as a numeric literal type.
 */
export type Sign<T extends number> = T extends 0
  ? 0
  : `${T}` extends `-${string}`
  ? -1
  : 1;

/**
 * Represents a percentage value (0-100).
 */
export type Percentage = number & { readonly __brand: 'Percentage' };
