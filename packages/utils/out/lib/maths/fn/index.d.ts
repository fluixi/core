/**
 * Re-export all mathematical functions.
 * @module MathFunctions
 */
export { add, subtract, divide, modulo, power, sqrt, abs, round, floor, ceil, trunc, clamp, sign, factorial, gcd, lcm, lerp, min, max, average, sum, product, invLerp, mapRange, median } from './basic.js';
export { ln, log10, log2, log, exp, cbrt, nthRoot, solveQuadratic, evaluatePolynomial, simplifyFraction, addFractions, multiplyFractions, percentage, normalize, range, toBase, toOrdinal, truncateDecimals, wrap } from './advanced.js';
export { magnitude2D, magnitude3D, magnitude4D, normalize2D, normalize3D, dotProduct2D, dotProduct3D, crossProduct3D, addVectors2D, subtractVectors2D, scaleVector2D, angleBetween2D, distance2D, distance3D, lerp2D, rotate2D, } from './vector.js';
export { addComplex, subtractComplex, multiplyComplex, divideComplex, magnitudeComplex, conjugateComplex, argumentComplex, toPolarComplex, fromPolarComplex, sqrtComplex, powerComplex, lnComplex, } from './complex.js';
export { degToRad, radToDeg, degToGrad, gradToDeg, normalizeRadians, normalizeDegrees, sin, cos, tan, asin, acos, atan, atan2, sinh, cosh, tanh, asinh, acosh, atanh, sec, csc, cot, } from './trigo.js';
//# sourceMappingURL=index.d.ts.map