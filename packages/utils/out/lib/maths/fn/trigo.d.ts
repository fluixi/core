/**
 * Trigonometric functions and angle conversions.
 * @module TrigonometryFunctions
 */
import type { Degrees, Radians } from '../types/basic.js';
/**
 * Converts degrees to radians.
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
export declare function degToRad(degrees: number): Radians;
/**
 * Converts radians to degrees.
 * @param radians - Angle in radians
 * @returns Angle in degrees
 */
export declare function radToDeg(radians: number): Degrees;
/**
 * Converts degrees to gradians.
 * @param degrees - Angle in degrees
 * @returns Angle in gradians
 */
export declare function degToGrad(degrees: number): number;
/**
 * Converts gradians to degrees.
 * @param gradians - Angle in gradians
 * @returns Angle in degrees
 */
export declare function gradToDeg(gradians: number): Degrees;
/**
 * Normalizes an angle to the range [0, 2π) radians.
 * @param radians - Angle in radians
 * @returns Normalized angle in radians
 */
export declare function normalizeRadians(radians: number): Radians;
/**
 * Normalizes an angle to the range [0, 360) degrees.
 * @param degrees - Angle in degrees
 * @returns Normalized angle in degrees
 */
export declare function normalizeDegrees(degrees: number): Degrees;
/**
 * Calculates the sine of an angle in radians.
 * @param radians - Angle in radians
 * @returns The sine value
 */
export declare function sin(radians: number): number;
/**
 * Calculates the cosine of an angle in radians.
 * @param radians - Angle in radians
 * @returns The cosine value
 */
export declare function cos(radians: number): number;
/**
 * Calculates the tangent of an angle in radians.
 * @param radians - Angle in radians
 * @returns The tangent value
 * @throws {Error} If cosine is zero (angle is π/2 + nπ)
 */
export declare function tan(radians: number): number;
/**
 * Calculates the arcsine (inverse sine) in radians.
 * @param value - Sine value between -1 and 1
 * @returns Angle in radians
 * @throws {Error} If value is outside [-1, 1]
 */
export declare function asin(value: number): Radians;
/**
 * Calculates the arccosine (inverse cosine) in radians.
 * @param value - Cosine value between -1 and 1
 * @returns Angle in radians
 * @throws {Error} If value is outside [-1, 1]
 */
export declare function acos(value: number): Radians;
/**
 * Calculates the arctangent (inverse tangent) in radians.
 * @param value - Tangent value
 * @returns Angle in radians between -π/2 and π/2
 */
export declare function atan(value: number): Radians;
/**
 * Calculates the arctangent of y/x in radians, handling all quadrants.
 * @param y - Numerator
 * @param x - Denominator
 * @returns Angle in radians between -π and π
 */
export declare function atan2(y: number, x: number): Radians;
/**
 * Calculates the hyperbolic sine.
 * @param x - Input value
 * @returns Hyperbolic sine
 */
export declare function sinh(x: number): number;
/**
 * Calculates the hyperbolic cosine.
 * @param x - Input value
 * @returns Hyperbolic cosine
 */
export declare function cosh(x: number): number;
/**
 * Calculates the hyperbolic tangent.
 * @param x - Input value
 * @returns Hyperbolic tangent
 */
export declare function tanh(x: number): number;
/**
 * Calculates the inverse hyperbolic sine.
 * @param x - Input value
 * @returns Inverse hyperbolic sine
 */
export declare function asinh(x: number): number;
/**
 * Calculates the inverse hyperbolic cosine.
 * @param x - Input value >= 1
 * @returns Inverse hyperbolic cosine
 * @throws {Error} If x < 1
 */
export declare function acosh(x: number): number;
/**
 * Calculates the inverse hyperbolic tangent.
 * @param x - Input value between -1 and 1 (exclusive)
 * @returns Inverse hyperbolic tangent
 * @throws {Error} If |x| >= 1
 */
export declare function atanh(x: number): number;
/**
 * Calculates the secant of an angle.
 * @param radians - Angle in radians
 * @returns The secant value
 * @throws {Error} If cosine is zero
 */
export declare function sec(radians: number): number;
/**
 * Calculates the cosecant of an angle.
 * @param radians - Angle in radians
 * @returns The cosecant value
 * @throws {Error} If sine is zero
 */
export declare function csc(radians: number): number;
/**
 * Calculates the cotangent of an angle.
 * @param radians - Angle in radians
 * @returns The cotangent value
 * @throws {Error} If tangent is zero
 */
export declare function cot(radians: number): number;
//# sourceMappingURL=trigo.d.ts.map