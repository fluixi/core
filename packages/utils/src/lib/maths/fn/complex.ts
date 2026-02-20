/**
 * Complex number operations.
 * @module ComplexFunctions
 */

import type { ComplexNumber } from '../types/advanced.js';

// Constants
const EPSILON = 1e-10;
const TWO_PI = 2 * Math.PI;

/**
 * Checks if a value is approximately zero within epsilon.
 * @param value - The value to check
 * @returns True if the value is effectively zero
 */
function isApproximatelyZero(value: number): boolean {
  return Math.abs(value) < EPSILON;
}

/**
 * Safely compares two numbers with epsilon precision.
 * @param a - First number
 * @param b - Second number
 * @returns True if numbers are approximately equal
 */
function approximatelyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < EPSILON;
}

/**
 * Normalizes a complex number by handling near-zero values.
 * @param c - The complex number to normalize
 * @returns Normalized complex number
 */
function normalizeComplex(c: ComplexNumber): ComplexNumber {
  return {
    real: isApproximatelyZero(c.real) ? 0 : c.real,
    imag: isApproximatelyZero(c.imag) ? 0 : c.imag,
  };
}

/**
 * Validates that a value is a finite number.
 * @param value - The value to validate
 * @param name - Name of the value for error messages
 * @throws {Error} If value is not a finite number
 */
function validateNumber(value: number, name: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number, got ${value}`);
  }
}

/**
 * Validates a complex number.
 * @param c - The complex number to validate
 * @param name - Name of the complex number for error messages
 * @throws {Error} If complex number is invalid
 */
function validateComplexNumber(
  c: ComplexNumber,
  name: string = 'Complex number'
): void {
  if (!c || typeof c !== 'object') {
    throw new Error(`${name} must be an object`);
  }

  validateNumber(c.real, `${name}.real`);
  validateNumber(c.imag, `${name}.imag`);
}

/**
 * Creates a complex number with validation and normalization.
 * @param real - Real part
 * @param imag - Imaginary part
 * @returns Validated and normalized complex number
 */
export function createComplex(real: number, imag: number = 0): ComplexNumber {
  validateNumber(real, 'real');
  validateNumber(imag, 'imag');
  return normalizeComplex({ real, imag });
}

/**
 * Checks if two complex numbers are approximately equal.
 * @param a - First complex number
 * @param b - Second complex number
 * @returns True if numbers are approximately equal
 */
export function complexEquals(a: ComplexNumber, b: ComplexNumber): boolean {
  validateComplexNumber(a, 'First complex number');
  validateComplexNumber(b, 'Second complex number');

  return (
    approximatelyEqual(a.real, b.real) && approximatelyEqual(a.imag, b.imag)
  );
}

/**
 * Adds two complex numbers.
 * @param a - First complex number
 * @param b - Second complex number
 * @returns The sum as a complex number
 */
export function addComplex(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
  validateComplexNumber(a, 'First complex number');
  validateComplexNumber(b, 'Second complex number');

  return normalizeComplex({
    real: a.real + b.real,
    imag: a.imag + b.imag,
  });
}

/**
 * Subtracts two complex numbers.
 * @param a - First complex number
 * @param b - Second complex number
 * @returns The difference as a complex number (a - b)
 */
export function subtractComplex(
  a: ComplexNumber,
  b: ComplexNumber
): ComplexNumber {
  validateComplexNumber(a, 'First complex number');
  validateComplexNumber(b, 'Second complex number');

  return normalizeComplex({
    real: a.real - b.real,
    imag: a.imag - b.imag,
  });
}

/**
 * Multiplies two complex numbers.
 * @param a - First complex number
 * @param b - Second complex number
 * @returns The product as a complex number
 */
export function multiplyComplex(
  a: ComplexNumber,
  b: ComplexNumber
): ComplexNumber {
  validateComplexNumber(a, 'First complex number');
  validateComplexNumber(b, 'Second complex number');

  return normalizeComplex({
    real: a.real * b.real - a.imag * b.imag,
    imag: a.real * b.imag + a.imag * b.real,
  });
}

/**
 * Divides two complex numbers.
 * @param a - Numerator complex number
 * @param b - Denominator complex number
 * @returns The quotient as a complex number
 * @throws {Error} If dividing by zero or near-zero complex number
 */
export function divideComplex(
  a: ComplexNumber,
  b: ComplexNumber
): ComplexNumber {
  validateComplexNumber(a, 'Numerator complex number');
  validateComplexNumber(b, 'Denominator complex number');

  const denominator = b.real * b.real + b.imag * b.imag;

  if (isApproximatelyZero(denominator)) {
    throw new Error('Cannot divide by zero or near-zero complex number');
  }

  return normalizeComplex({
    real: (a.real * b.real + a.imag * b.imag) / denominator,
    imag: (a.imag * b.real - a.real * b.imag) / denominator,
  });
}

/**
 * Calculates the magnitude (absolute value) of a complex number.
 * @param c - The complex number
 * @returns The magnitude (non-negative)
 */
export function magnitudeComplex(c: ComplexNumber): number {
  validateComplexNumber(c);

  const magnitude = Math.sqrt(c.real * c.real + c.imag * c.imag);
  return isApproximatelyZero(magnitude) ? 0 : magnitude;
}

/**
 * Calculates the conjugate of a complex number.
 * @param c - The complex number
 * @returns The complex conjugate
 */
export function conjugateComplex(c: ComplexNumber): ComplexNumber {
  validateComplexNumber(c);

  return normalizeComplex({
    real: c.real,
    imag: -c.imag,
  });
}

/**
 * Calculates the argument (angle) of a complex number in radians.
 * @param c - The complex number
 * @returns The principal argument in radians (-π, π]
 */
export function argumentComplex(c: ComplexNumber): number {
  validateComplexNumber(c);

  if (isApproximatelyZero(c.real) && isApproximatelyZero(c.imag)) {
    return 0; // Argument of zero is conventionally 0
  }

  return Math.atan2(c.imag, c.real);
}

/**
 * Converts a complex number to polar form.
 * @param c - The complex number
 * @returns Polar representation {magnitude, angle}
 */
export function toPolarComplex(c: ComplexNumber): {
  magnitude: number;
  angle: number;
} {
  validateComplexNumber(c);

  return {
    magnitude: magnitudeComplex(c),
    angle: argumentComplex(c),
  };
}

/**
 * Converts polar form to a complex number.
 * @param magnitude - The magnitude (must be non-negative)
 * @param angle - The angle in radians
 * @returns The complex number
 * @throws {Error} If magnitude is negative
 */
export function fromPolarComplex(
  magnitude: number,
  angle: number
): ComplexNumber {
  validateNumber(magnitude, 'magnitude');
  validateNumber(angle, 'angle');

  if (magnitude < -EPSILON) {
    throw new Error('Magnitude must be non-negative');
  }

  // Normalize angle to (-π, π]
  let normalizedAngle = angle % TWO_PI;
  if (normalizedAngle > Math.PI) normalizedAngle -= TWO_PI;
  if (normalizedAngle <= -Math.PI) normalizedAngle += TWO_PI;

  const mag = Math.max(0, magnitude); // Ensure non-negative

  return normalizeComplex({
    real: mag * Math.cos(normalizedAngle),
    imag: mag * Math.sin(normalizedAngle),
  });
}

/**
 * Calculates the square root of a complex number.
 * @param c - The complex number
 * @returns Array of two complex square roots (principal and secondary)
 */
export function sqrtComplex(c: ComplexNumber): [ComplexNumber, ComplexNumber] {
  validateComplexNumber(c);

  // Special case for zero
  if (isApproximatelyZero(c.real) && isApproximatelyZero(c.imag)) {
    const zero = createComplex(0, 0);
    return [zero, zero];
  }

  const magnitude = magnitudeComplex(c);
  const angle = argumentComplex(c);
  const rootMagnitude = Math.sqrt(magnitude);
  const rootAngle1 = angle / 2;
  const rootAngle2 = rootAngle1 + Math.PI;

  return [
    fromPolarComplex(rootMagnitude, rootAngle1),
    fromPolarComplex(rootMagnitude, rootAngle2),
  ];
}

/**
 * Calculates the power of a complex number with a real exponent.
 * @param c - The complex number
 * @param exponent - The exponent (real number)
 * @returns The complex number raised to the power
 */
export function powerComplex(
  c: ComplexNumber,
  exponent: number
): ComplexNumber {
  validateComplexNumber(c);
  validateNumber(exponent, 'exponent');

  // Special cases for optimization
  if (isApproximatelyZero(exponent)) {
    return createComplex(1, 0); // c^0 = 1
  }

  if (approximatelyEqual(exponent, 1)) {
    return createComplex(c.real, c.imag); // c^1 = c
  }

  if (approximatelyEqual(exponent, 2)) {
    // Square directly for better performance
    return multiplyComplex(c, c);
  }

  if (isApproximatelyZero(c.real) && isApproximatelyZero(c.imag)) {
    if (exponent > 0) {
      return createComplex(0, 0); // 0^n = 0 for n > 0
    } else if (exponent < 0) {
      throw new Error('Cannot raise zero to a negative power');
    }
  }

  const polar = toPolarComplex(c);
  const magnitude = Math.pow(polar.magnitude, exponent);

  // Handle negative magnitude due to floating point errors
  const safeMagnitude =
    magnitude < -EPSILON ? Math.abs(magnitude) : Math.max(0, magnitude);

  const angle = polar.angle * exponent;

  return fromPolarComplex(safeMagnitude, angle);
}

/**
 * Calculates the natural logarithm of a complex number.
 * @param c - The complex number
 * @returns The principal value of natural logarithm as a complex number
 * @throws {Error} If the complex number is zero or near-zero
 */
export function lnComplex(c: ComplexNumber): ComplexNumber {
  validateComplexNumber(c);

  const magnitude = magnitudeComplex(c);
  if (isApproximatelyZero(magnitude)) {
    throw new Error(
      'Cannot take logarithm of zero or near-zero complex number'
    );
  }

  const angle = argumentComplex(c);

  return normalizeComplex({
    real: Math.log(magnitude),
    imag: angle,
  });
}

/**
 * Calculates the exponential of a complex number.
 * @param c - The complex number
 * @returns The exponential as a complex number
 */
export function expComplex(c: ComplexNumber): ComplexNumber {
  validateComplexNumber(c);

  const expReal = Math.exp(c.real);

  return normalizeComplex({
    real: expReal * Math.cos(c.imag),
    imag: expReal * Math.sin(c.imag),
  });
}

/**
 * Calculates the sine of a complex number.
 * @param c - The complex number
 * @returns The sine as a complex number
 */
export function sinComplex(c: ComplexNumber): ComplexNumber {
  validateComplexNumber(c);

  // sin(a + bi) = sin(a)cosh(b) + i cos(a)sinh(b)
  return normalizeComplex({
    real: Math.sin(c.real) * Math.cosh(c.imag),
    imag: Math.cos(c.real) * Math.sinh(c.imag),
  });
}

/**
 * Calculates the cosine of a complex number.
 * @param c - The complex number
 * @returns The cosine as a complex number
 */
export function cosComplex(c: ComplexNumber): ComplexNumber {
  validateComplexNumber(c);

  // cos(a + bi) = cos(a)cosh(b) - i sin(a)sinh(b)
  return normalizeComplex({
    real: Math.cos(c.real) * Math.cosh(c.imag),
    imag: -Math.sin(c.real) * Math.sinh(c.imag),
  });
}

/**
 * Checks if a complex number is zero (or effectively zero).
 * @param c - The complex number to check
 * @returns True if the complex number is effectively zero
 */
export function isZeroComplex(c: ComplexNumber): boolean {
  validateComplexNumber(c);
  return isApproximatelyZero(c.real) && isApproximatelyZero(c.imag);
}

/**
 * Returns the real part of a complex number.
 * @param c - The complex number
 * @returns The real part
 */
export function getReal(c: ComplexNumber): number {
  validateComplexNumber(c);
  return c.real;
}

/**
 * Returns the imaginary part of a complex number.
 * @param c - The complex number
 * @returns The imaginary part
 */
export function getImag(c: ComplexNumber): number {
  validateComplexNumber(c);
  return c.imag;
}

/**
 * Negates a complex number.
 * @param c - The complex number
 * @returns The negated complex number
 */
export function negateComplex(c: ComplexNumber): ComplexNumber {
  validateComplexNumber(c);
  return normalizeComplex({
    real: -c.real,
    imag: -c.imag,
  });
}

/**
 * Calculates the reciprocal of a complex number.
 * @param c - The complex number
 * @returns The reciprocal (1/c)
 * @throws {Error} If the complex number is zero or near-zero
 */
export function reciprocalComplex(c: ComplexNumber): ComplexNumber {
  validateComplexNumber(c);

  const denominator = c.real * c.real + c.imag * c.imag;
  if (isApproximatelyZero(denominator)) {
    throw new Error(
      'Cannot calculate reciprocal of zero or near-zero complex number'
    );
  }

  return normalizeComplex({
    real: c.real / denominator,
    imag: -c.imag / denominator,
  });
}
