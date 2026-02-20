/**
 * Trigonometric functions and angle conversions.
 * @module TrigonometryFunctions
 */

import { Constants } from '../constants.js';
import type { Degrees, Radians } from '../types/basic.js';

/**
 * Converts degrees to radians.
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
export function degToRad(degrees: number): Radians {
  // return degrees * (Math.PI / 180);
  return (degrees * Constants.RADIANS_PER_DEGREE) as Radians;
}

/**
 * Converts radians to degrees.
 * @param radians - Angle in radians
 * @returns Angle in degrees
 */
export function radToDeg(radians: number): Degrees {
  // return radians * (180 / Math.PI);
  return (radians * Constants.DEGREES_PER_RADIAN) as Degrees;
}

/**
 * Converts degrees to gradians.
 * @param degrees - Angle in degrees
 * @returns Angle in gradians
 */
export function degToGrad(degrees: number): number {
  return degrees * (Constants.GRADIANS_IN_CIRCLE / Constants.DEGREES_IN_CIRCLE);
}

/**
 * Converts gradians to degrees.
 * @param gradians - Angle in gradians
 * @returns Angle in degrees
 */
export function gradToDeg(gradians: number): Degrees {
  return (gradians * (Constants.DEGREES_IN_CIRCLE / Constants.GRADIANS_IN_CIRCLE)) as Degrees;
}

/**
 * Normalizes an angle to the range [0, 2π) radians.
 * @param radians - Angle in radians
 * @returns Normalized angle in radians
 */
export function normalizeRadians(radians: number): Radians {
  const twoPi = Constants.RADIANS_IN_CIRCLE;
  let normalized = radians % twoPi;
  if (normalized < 0) normalized += twoPi;
  return normalized as Radians;
}

/**
 * Normalizes an angle to the range [0, 360) degrees.
 * @param degrees - Angle in degrees
 * @returns Normalized angle in degrees
 */
export function normalizeDegrees(degrees: number): Degrees {
  let normalized = degrees % Constants.DEGREES_IN_CIRCLE;
  if (normalized < 0) normalized += Constants.DEGREES_IN_CIRCLE;
  return normalized as Degrees;
}

/**
 * Calculates the sine of an angle in radians.
 * @param radians - Angle in radians
 * @returns The sine value
 */
export function sin(radians: number): number {
  return Math.sin(radians);
}

/**
 * Calculates the cosine of an angle in radians.
 * @param radians - Angle in radians
 * @returns The cosine value
 */
export function cos(radians: number): number {
  return Math.cos(radians);
}

/**
 * Calculates the tangent of an angle in radians.
 * @param radians - Angle in radians
 * @returns The tangent value
 * @throws {Error} If cosine is zero (angle is π/2 + nπ)
 */
export function tan(radians: number): number {
  const cosine = Math.cos(radians);
  if (Math.abs(cosine) < 1e-10) {
    throw new Error('Tangent undefined for this angle (cosine is zero)');
  }
  return Math.tan(radians);
}

/**
 * Calculates the arcsine (inverse sine) in radians.
 * @param value - Sine value between -1 and 1
 * @returns Angle in radians
 * @throws {Error} If value is outside [-1, 1]
 */
export function asin(value: number): Radians {
  if (value < -1 || value > 1) {
    throw new Error('Arcsine is only defined for values between -1 and 1');
  }
  return Math.asin(value) as Radians;
}

/**
 * Calculates the arccosine (inverse cosine) in radians.
 * @param value - Cosine value between -1 and 1
 * @returns Angle in radians
 * @throws {Error} If value is outside [-1, 1]
 */
export function acos(value: number): Radians {
  if (value < -1 || value > 1) {
    throw new Error('Arccosine is only defined for values between -1 and 1');
  }
  return Math.acos(value) as Radians;
}

/**
 * Calculates the arctangent (inverse tangent) in radians.
 * @param value - Tangent value
 * @returns Angle in radians between -π/2 and π/2
 */
export function atan(value: number): Radians {
  return Math.atan(value) as Radians;
}

/**
 * Calculates the arctangent of y/x in radians, handling all quadrants.
 * @param y - Numerator
 * @param x - Denominator
 * @returns Angle in radians between -π and π
 */
export function atan2(y: number, x: number): Radians {
  return Math.atan2(y, x) as Radians;
}

/**
 * Calculates the hyperbolic sine.
 * @param x - Input value
 * @returns Hyperbolic sine
 */
export function sinh(x: number): number {
  return Math.sinh(x);
}

/**
 * Calculates the hyperbolic cosine.
 * @param x - Input value
 * @returns Hyperbolic cosine
 */
export function cosh(x: number): number {
  return Math.cosh(x);
}

/**
 * Calculates the hyperbolic tangent.
 * @param x - Input value
 * @returns Hyperbolic tangent
 */
export function tanh(x: number): number {
  return Math.tanh(x);
}

/**
 * Calculates the inverse hyperbolic sine.
 * @param x - Input value
 * @returns Inverse hyperbolic sine
 */
export function asinh(x: number): number {
  return Math.asinh(x);
}

/**
 * Calculates the inverse hyperbolic cosine.
 * @param x - Input value >= 1
 * @returns Inverse hyperbolic cosine
 * @throws {Error} If x < 1
 */
export function acosh(x: number): number {
  if (x < 1) {
    throw new Error('Inverse hyperbolic cosine is only defined for x >= 1');
  }
  return Math.acosh(x);
}

/**
 * Calculates the inverse hyperbolic tangent.
 * @param x - Input value between -1 and 1 (exclusive)
 * @returns Inverse hyperbolic tangent
 * @throws {Error} If |x| >= 1
 */
export function atanh(x: number): number {
  if (Math.abs(x) >= 1) {
    throw new Error('Inverse hyperbolic tangent is only defined for |x| < 1');
  }
  return Math.atanh(x);
}

/**
 * Calculates the secant of an angle.
 * @param radians - Angle in radians
 * @returns The secant value
 * @throws {Error} If cosine is zero
 */
export function sec(radians: number): number {
  const cosine = Math.cos(radians);
  if (Math.abs(cosine) < 1e-10) {
    throw new Error('Secant undefined for this angle (cosine is zero)');
  }
  return 1 / cosine;
}

/**
 * Calculates the cosecant of an angle.
 * @param radians - Angle in radians
 * @returns The cosecant value
 * @throws {Error} If sine is zero
 */
export function csc(radians: number): number {
  const sine = Math.sin(radians);
  if (Math.abs(sine) < 1e-10) {
    throw new Error('Cosecant undefined for this angle (sine is zero)');
  }
  return 1 / sine;
}

/**
 * Calculates the cotangent of an angle.
 * @param radians - Angle in radians
 * @returns The cotangent value
 * @throws {Error} If tangent is zero
 */
export function cot(radians: number): number {
  const tangent = Math.tan(radians);
  if (Math.abs(tangent) < 1e-10) {
    throw new Error('Cotangent undefined for this angle (tangent is zero)');
  }
  return 1 / tangent;
}