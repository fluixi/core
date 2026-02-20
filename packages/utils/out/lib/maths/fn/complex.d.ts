/**
 * Complex number operations.
 * @module ComplexFunctions
 */
import type { ComplexNumber } from '../types/advanced.js';
/**
 * Creates a complex number with validation and normalization.
 * @param real - Real part
 * @param imag - Imaginary part
 * @returns Validated and normalized complex number
 */
export declare function createComplex(real: number, imag?: number): ComplexNumber;
/**
 * Checks if two complex numbers are approximately equal.
 * @param a - First complex number
 * @param b - Second complex number
 * @returns True if numbers are approximately equal
 */
export declare function complexEquals(a: ComplexNumber, b: ComplexNumber): boolean;
/**
 * Adds two complex numbers.
 * @param a - First complex number
 * @param b - Second complex number
 * @returns The sum as a complex number
 */
export declare function addComplex(a: ComplexNumber, b: ComplexNumber): ComplexNumber;
/**
 * Subtracts two complex numbers.
 * @param a - First complex number
 * @param b - Second complex number
 * @returns The difference as a complex number (a - b)
 */
export declare function subtractComplex(a: ComplexNumber, b: ComplexNumber): ComplexNumber;
/**
 * Multiplies two complex numbers.
 * @param a - First complex number
 * @param b - Second complex number
 * @returns The product as a complex number
 */
export declare function multiplyComplex(a: ComplexNumber, b: ComplexNumber): ComplexNumber;
/**
 * Divides two complex numbers.
 * @param a - Numerator complex number
 * @param b - Denominator complex number
 * @returns The quotient as a complex number
 * @throws {Error} If dividing by zero or near-zero complex number
 */
export declare function divideComplex(a: ComplexNumber, b: ComplexNumber): ComplexNumber;
/**
 * Calculates the magnitude (absolute value) of a complex number.
 * @param c - The complex number
 * @returns The magnitude (non-negative)
 */
export declare function magnitudeComplex(c: ComplexNumber): number;
/**
 * Calculates the conjugate of a complex number.
 * @param c - The complex number
 * @returns The complex conjugate
 */
export declare function conjugateComplex(c: ComplexNumber): ComplexNumber;
/**
 * Calculates the argument (angle) of a complex number in radians.
 * @param c - The complex number
 * @returns The principal argument in radians (-π, π]
 */
export declare function argumentComplex(c: ComplexNumber): number;
/**
 * Converts a complex number to polar form.
 * @param c - The complex number
 * @returns Polar representation {magnitude, angle}
 */
export declare function toPolarComplex(c: ComplexNumber): {
    magnitude: number;
    angle: number;
};
/**
 * Converts polar form to a complex number.
 * @param magnitude - The magnitude (must be non-negative)
 * @param angle - The angle in radians
 * @returns The complex number
 * @throws {Error} If magnitude is negative
 */
export declare function fromPolarComplex(magnitude: number, angle: number): ComplexNumber;
/**
 * Calculates the square root of a complex number.
 * @param c - The complex number
 * @returns Array of two complex square roots (principal and secondary)
 */
export declare function sqrtComplex(c: ComplexNumber): [ComplexNumber, ComplexNumber];
/**
 * Calculates the power of a complex number with a real exponent.
 * @param c - The complex number
 * @param exponent - The exponent (real number)
 * @returns The complex number raised to the power
 */
export declare function powerComplex(c: ComplexNumber, exponent: number): ComplexNumber;
/**
 * Calculates the natural logarithm of a complex number.
 * @param c - The complex number
 * @returns The principal value of natural logarithm as a complex number
 * @throws {Error} If the complex number is zero or near-zero
 */
export declare function lnComplex(c: ComplexNumber): ComplexNumber;
/**
 * Calculates the exponential of a complex number.
 * @param c - The complex number
 * @returns The exponential as a complex number
 */
export declare function expComplex(c: ComplexNumber): ComplexNumber;
/**
 * Calculates the sine of a complex number.
 * @param c - The complex number
 * @returns The sine as a complex number
 */
export declare function sinComplex(c: ComplexNumber): ComplexNumber;
/**
 * Calculates the cosine of a complex number.
 * @param c - The complex number
 * @returns The cosine as a complex number
 */
export declare function cosComplex(c: ComplexNumber): ComplexNumber;
/**
 * Checks if a complex number is zero (or effectively zero).
 * @param c - The complex number to check
 * @returns True if the complex number is effectively zero
 */
export declare function isZeroComplex(c: ComplexNumber): boolean;
/**
 * Returns the real part of a complex number.
 * @param c - The complex number
 * @returns The real part
 */
export declare function getReal(c: ComplexNumber): number;
/**
 * Returns the imaginary part of a complex number.
 * @param c - The complex number
 * @returns The imaginary part
 */
export declare function getImag(c: ComplexNumber): number;
/**
 * Negates a complex number.
 * @param c - The complex number
 * @returns The negated complex number
 */
export declare function negateComplex(c: ComplexNumber): ComplexNumber;
/**
 * Calculates the reciprocal of a complex number.
 * @param c - The complex number
 * @returns The reciprocal (1/c)
 * @throws {Error} If the complex number is zero or near-zero
 */
export declare function reciprocalComplex(c: ComplexNumber): ComplexNumber;
//# sourceMappingURL=complex.d.ts.map