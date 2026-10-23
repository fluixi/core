/**
 * Mathematical constants with precise typing.
 * @module MathConstants
 */

/**
 * The ratio of a circle's circumference to its diameter.
 */
export const PI = 3.141592653589793 as const;

/**
 * Euler's number, the base of natural logarithms.
 */
export const E = 2.718281828459045 as const;

/**
 * The golden ratio, approximately 1.61803.
 */
export const PHI = 1.618033988749894 as const;

/**
 * Square root of 2.
 */
export const SQRT2 = 1.4142135623730951 as const;

/**
 * Square root of 1/2.
 */
export const SQRT1_2 = 0.7071067811865476 as const;

/**
 * Natural logarithm of 2.
 */
export const LN2 = 0.6931471805599453 as const;

/**
 * Natural logarithm of 10.
 */
export const LN10 = 2.302585092994046 as const;

/**
 * Base-2 logarithm of E.
 */
export const LOG2E = 1.4426950408889634 as const;

/**
 * Base-10 logarithm of E.
 */
export const LOG10E = 0.4342944819032518 as const;

export const DEGREES_IN_CIRCLE = 360 as const;

export const RADIANS_IN_CIRCLE = 2 * PI as number;

export const GRADIANS_IN_CIRCLE = 400 as const;

export const DEGREES_PER_RADIAN = 180 / PI as number;

export const RADIANS_PER_DEGREE = PI / 180 as number;

/**
 * Mathematical constants object for grouped access.
 */
export const Constants = {
  PI,
  E,
  PHI,
  SQRT2,
  SQRT1_2,
  LN2,
  LN10,
  LOG2E,
  LOG10E,
  DEGREES_IN_CIRCLE,
  RADIANS_IN_CIRCLE,
  GRADIANS_IN_CIRCLE,
  DEGREES_PER_RADIAN,
  RADIANS_PER_DEGREE,
} as const;

/**
 * Type inference for mathematical constants.
 */
export type MathConstants = typeof Constants;