import { describe, it, expect } from 'vitest';
import {
  addComplex,
  subtractComplex,
  multiplyComplex,
  divideComplex,
  magnitudeComplex,
  conjugateComplex,
  argumentComplex,
  toPolarComplex,
  fromPolarComplex,
  sqrtComplex,
  powerComplex,
  lnComplex,
} from './complex.js';
import type { ComplexNumber } from '../types/advanced.js';

describe('Complex Number Functions', () => {
  describe('addComplex', () => {
    it('should add two complex numbers', () => {
      const result = addComplex({ real: 2, imag: 3 }, { real: 4, imag: 5 });
      expect(result).toEqual({ real: 6, imag: 8 });
    });

    it('should handle zero imaginary parts', () => {
      const result = addComplex({ real: 5, imag: 0 }, { real: 3, imag: 0 });
      expect(result).toEqual({ real: 8, imag: 0 });
    });

    it('should handle zero real parts', () => {
      const result = addComplex({ real: 0, imag: 4 }, { real: 0, imag: 6 });
      expect(result).toEqual({ real: 0, imag: 10 });
    });

    it('should handle negative numbers', () => {
      const result = addComplex({ real: -2, imag: -3 }, { real: 5, imag: 1 });
      expect(result).toEqual({ real: 3, imag: -2 });
    });

    it('should be commutative', () => {
      const a: ComplexNumber = { real: 1, imag: 2 };
      const b: ComplexNumber = { real: 3, imag: 4 };
      const ab = addComplex(a, b);
      const ba = addComplex(b, a);
      expect(ab).toEqual(ba);
    });

    it('should handle adding zero', () => {
      const result = addComplex({ real: 5, imag: 7 }, { real: 0, imag: 0 });
      expect(result).toEqual({ real: 5, imag: 7 });
    });
  });

  describe('subtractComplex', () => {
    it('should subtract two complex numbers', () => {
      const result = subtractComplex(
        { real: 5, imag: 7 },
        { real: 2, imag: 3 }
      );
      expect(result).toEqual({ real: 3, imag: 4 });
    });

    it('should handle zero imaginary parts', () => {
      const result = subtractComplex(
        { real: 8, imag: 0 },
        { real: 3, imag: 0 }
      );
      expect(result).toEqual({ real: 5, imag: 0 });
    });

    it('should handle zero real parts', () => {
      const result = subtractComplex(
        { real: 0, imag: 10 },
        { real: 0, imag: 4 }
      );
      expect(result).toEqual({ real: 0, imag: 6 });
    });

    it('should handle negative numbers', () => {
      const result = subtractComplex(
        { real: -2, imag: -3 },
        { real: -5, imag: -1 }
      );
      expect(result).toEqual({ real: 3, imag: -2 });
    });

    it('should return zero when subtracting from itself', () => {
      const c: ComplexNumber = { real: 5, imag: 7 };
      const result = subtractComplex(c, c);
      expect(result).toEqual({ real: 0, imag: 0 });
    });

    it('should handle subtracting zero', () => {
      const result = subtractComplex(
        { real: 5, imag: 7 },
        { real: 0, imag: 0 }
      );
      expect(result).toEqual({ real: 5, imag: 7 });
    });
  });

  describe('multiplyComplex', () => {
    it('should multiply two complex numbers', () => {
      const result = multiplyComplex(
        { real: 2, imag: 3 },
        { real: 4, imag: 5 }
      );
      expect(result.real).toBe(-7); // 2*4 - 3*5 = 8 - 15 = -7
      expect(result.imag).toBe(22); // 2*5 + 3*4 = 10 + 12 = 22
    });

    it('should handle multiplication by real number', () => {
      const result = multiplyComplex(
        { real: 3, imag: 4 },
        { real: 2, imag: 0 }
      );
      expect(result).toEqual({ real: 6, imag: 8 });
    });

    it('should handle multiplication by imaginary number', () => {
      const result = multiplyComplex(
        { real: 3, imag: 4 },
        { real: 0, imag: 1 }
      );
      expect(result.real).toBe(-4); // 3*0 - 4*1 = -4
      expect(result.imag).toBe(3); // 3*1 + 4*0 = 3
    });

    it('should handle multiplication by zero', () => {
      const result = multiplyComplex(
        { real: 5, imag: 7 },
        { real: 0, imag: 0 }
      );
      expect(result).toEqual({ real: 0, imag: 0 });
    });

    it('should be commutative', () => {
      const a: ComplexNumber = { real: 1, imag: 2 };
      const b: ComplexNumber = { real: 3, imag: 4 };
      const ab = multiplyComplex(a, b);
      const ba = multiplyComplex(b, a);
      expect(ab).toEqual(ba);
    });

    it('should handle negative numbers', () => {
      const result = multiplyComplex(
        { real: -2, imag: 3 },
        { real: 4, imag: -5 }
      );
      expect(result.real).toBe(7); // -2*4 - 3*(-5) = -8 + 15 = 7
      expect(result.imag).toBe(22); // -2*(-5) + 3*4 = 10 + 12 = 22
    });

    it('should handle i*i = -1', () => {
      const result = multiplyComplex(
        { real: 0, imag: 1 },
        { real: 0, imag: 1 }
      );
      expect(result).toEqual({ real: -1, imag: 0 });
    });
  });

  describe('divideComplex', () => {
    it('should divide two complex numbers', () => {
      const result = divideComplex({ real: 2, imag: 3 }, { real: 4, imag: 5 });
      expect(result.real).toBeCloseTo(0.5609756); // (2*4 + 3*5) / (4^2 + 5^2)
      expect(result.imag).toBeCloseTo(0.0487804); // (3*4 - 2*5) / (4^2 + 5^2)
    });

    it('should divide by real number', () => {
      const result = divideComplex({ real: 6, imag: 8 }, { real: 2, imag: 0 });
      expect(result).toEqual({ real: 3, imag: 4 });
    });

    it('should divide by imaginary number', () => {
      const result = divideComplex({ real: 3, imag: 4 }, { real: 0, imag: 1 });
      expect(result.real).toBe(4); // (3*0 + 4*1) / (0^2 + 1^2) = 4
      expect(result.imag).toBe(-3); // (4*0 - 3*1) / (0^2 + 1^2) = -3
    });

    it('should throw error when dividing by zero', () => {
      expect(() =>
        divideComplex({ real: 5, imag: 7 }, { real: 0, imag: 0 })
      ).toThrow('Cannot divide by zero or near-zero complex number');
    });

    it('should handle negative numbers', () => {
      const result = divideComplex({ real: -6, imag: 8 }, { real: 2, imag: 0 });
      expect(result).toEqual({ real: -3, imag: 4 });
    });

    it('should return 1 when dividing by itself', () => {
      const c: ComplexNumber = { real: 3, imag: 4 };
      const result = divideComplex(c, c);
      expect(result.real).toBeCloseTo(1);
      expect(result.imag).toBeCloseTo(0);
    });

    it('should handle division of 1 by i', () => {
      const result = divideComplex({ real: 1, imag: 0 }, { real: 0, imag: 1 });
      expect(result.real).toBe(0);
      expect(result.imag).toBe(-1);
    });
  });

  describe('magnitudeComplex', () => {
    it('should calculate magnitude of complex number', () => {
      expect(magnitudeComplex({ real: 3, imag: 4 })).toBe(5);
      expect(magnitudeComplex({ real: 5, imag: 12 })).toBe(13);
    });

    it('should handle real numbers', () => {
      expect(magnitudeComplex({ real: 5, imag: 0 })).toBe(5);
      expect(magnitudeComplex({ real: -5, imag: 0 })).toBe(5);
    });

    it('should handle imaginary numbers', () => {
      expect(magnitudeComplex({ real: 0, imag: 4 })).toBe(4);
      expect(magnitudeComplex({ real: 0, imag: -4 })).toBe(4);
    });

    it('should handle zero', () => {
      expect(magnitudeComplex({ real: 0, imag: 0 })).toBe(0);
    });

    it('should handle negative components', () => {
      expect(magnitudeComplex({ real: -3, imag: -4 })).toBe(5);
    });

    it('should handle decimal values', () => {
      expect(magnitudeComplex({ real: 1, imag: 1 })).toBeCloseTo(Math.sqrt(2));
      expect(magnitudeComplex({ real: 0.6, imag: 0.8 })).toBeCloseTo(1);
    });

    it('should satisfy |z1 * z2| = |z1| * |z2|', () => {
      const z1: ComplexNumber = { real: 3, imag: 4 };
      const z2: ComplexNumber = { real: 5, imag: 12 };
      const product = multiplyComplex(z1, z2);

      const mag1 = magnitudeComplex(z1);
      const mag2 = magnitudeComplex(z2);
      const magProduct = magnitudeComplex(product);

      expect(magProduct).toBeCloseTo(mag1 * mag2);
    });
  });

  describe('conjugateComplex', () => {
    it('should calculate conjugate of complex number', () => {
      const result = conjugateComplex({ real: 3, imag: 4 });
      expect(result).toEqual({ real: 3, imag: -4 });
    });

    it('should handle real numbers', () => {
      const result = conjugateComplex({ real: 5, imag: 0 });
      expect(result).toEqual({ real: 5, imag: 0 });
    });

    it('should handle imaginary numbers', () => {
      const result = conjugateComplex({ real: 0, imag: 7 });
      expect(result).toEqual({ real: 0, imag: -7 });
    });

    it('should handle negative imaginary part', () => {
      const result = conjugateComplex({ real: 2, imag: -3 });
      expect(result).toEqual({ real: 2, imag: 3 });
    });

    it('should be its own inverse', () => {
      const c: ComplexNumber = { real: 5, imag: 7 };
      const conj = conjugateComplex(c);
      const conjConj = conjugateComplex(conj);
      expect(conjConj).toEqual(c);
    });

    it('should handle zero', () => {
      const result = conjugateComplex({ real: 0, imag: 0 });
      expect(result).toEqual({ real: 0, imag: 0 });
    });

    it('should satisfy z * conj(z) = |z|^2', () => {
      const z: ComplexNumber = { real: 3, imag: 4 };
      const conjZ = conjugateComplex(z);
      const product = multiplyComplex(z, conjZ);
      const magSquared = magnitudeComplex(z) ** 2;

      expect(product.real).toBeCloseTo(magSquared);
      expect(product.imag).toBeCloseTo(0);
    });
  });

  describe('argumentComplex', () => {
    it('should calculate argument for positive real axis', () => {
      expect(argumentComplex({ real: 5, imag: 0 })).toBe(0);
    });

    it('should calculate argument for positive imaginary axis', () => {
      expect(argumentComplex({ real: 0, imag: 5 })).toBeCloseTo(Math.PI / 2);
    });

    it('should calculate argument for negative real axis', () => {
      expect(argumentComplex({ real: -5, imag: 0 })).toBeCloseTo(Math.PI);
    });

    it('should calculate argument for negative imaginary axis', () => {
      expect(argumentComplex({ real: 0, imag: -5 })).toBeCloseTo(-Math.PI / 2);
    });

    it('should calculate argument for first quadrant', () => {
      expect(argumentComplex({ real: 1, imag: 1 })).toBeCloseTo(Math.PI / 4);
    });

    it('should calculate argument for second quadrant', () => {
      expect(argumentComplex({ real: -1, imag: 1 })).toBeCloseTo(
        (3 * Math.PI) / 4
      );
    });

    it('should calculate argument for third quadrant', () => {
      expect(argumentComplex({ real: -1, imag: -1 })).toBeCloseTo(
        (-3 * Math.PI) / 4
      );
    });

    it('should calculate argument for fourth quadrant', () => {
      expect(argumentComplex({ real: 1, imag: -1 })).toBeCloseTo(-Math.PI / 4);
    });

    it('should return values in [-π, π]', () => {
      const testValues: ComplexNumber[] = [
        { real: 1, imag: 1 },
        { real: -1, imag: 1 },
        { real: -1, imag: -1 },
        { real: 1, imag: -1 },
      ];

      testValues.forEach((c) => {
        const arg = argumentComplex(c);
        expect(arg).toBeGreaterThanOrEqual(-Math.PI);
        expect(arg).toBeLessThanOrEqual(Math.PI);
      });
    });
  });

  describe('toPolarComplex', () => {
    it('should convert complex number to polar form', () => {
      const result = toPolarComplex({ real: 3, imag: 4 });
      expect(result.magnitude).toBe(5);
      expect(result.angle).toBeCloseTo(0.927295);
    });

    it('should handle real numbers', () => {
      const result = toPolarComplex({ real: 5, imag: 0 });
      expect(result.magnitude).toBe(5);
      expect(result.angle).toBe(0);
    });

    it('should handle imaginary numbers', () => {
      const result = toPolarComplex({ real: 0, imag: 5 });
      expect(result.magnitude).toBe(5);
      expect(result.angle).toBeCloseTo(Math.PI / 2);
    });

    it('should handle negative real numbers', () => {
      const result = toPolarComplex({ real: -5, imag: 0 });
      expect(result.magnitude).toBe(5);
      expect(result.angle).toBeCloseTo(Math.PI);
    });

    it('should handle all quadrants', () => {
      const c1 = toPolarComplex({ real: 1, imag: 1 });
      expect(c1.angle).toBeCloseTo(Math.PI / 4);

      const c2 = toPolarComplex({ real: -1, imag: 1 });
      expect(c2.angle).toBeCloseTo((3 * Math.PI) / 4);

      const c3 = toPolarComplex({ real: -1, imag: -1 });
      expect(c3.angle).toBeCloseTo((-3 * Math.PI) / 4);

      const c4 = toPolarComplex({ real: 1, imag: -1 });
      expect(c4.angle).toBeCloseTo(-Math.PI / 4);
    });

    it('should handle zero', () => {
      const result = toPolarComplex({ real: 0, imag: 0 });
      expect(result.magnitude).toBe(0);
    });
  });

  describe('fromPolarComplex', () => {
    it('should convert polar form to complex number', () => {
      const result = fromPolarComplex(5, 0);
      expect(result.real).toBeCloseTo(5);
      expect(result.imag).toBeCloseTo(0);
    });

    it('should handle angle π/2', () => {
      const result = fromPolarComplex(5, Math.PI / 2);
      expect(result.real).toBeCloseTo(0);
      expect(result.imag).toBeCloseTo(5);
    });

    it('should handle angle π', () => {
      const result = fromPolarComplex(5, Math.PI);
      expect(result.real).toBeCloseTo(-5);
      expect(result.imag).toBeCloseTo(0);
    });

    it('should handle angle -π/2', () => {
      const result = fromPolarComplex(5, -Math.PI / 2);
      expect(result.real).toBeCloseTo(0);
      expect(result.imag).toBeCloseTo(-5);
    });

    it('should be inverse of toPolarComplex', () => {
      const c: ComplexNumber = { real: 3, imag: 4 };
      const polar = toPolarComplex(c);
      const back = fromPolarComplex(polar.magnitude, polar.angle);

      expect(back.real).toBeCloseTo(c.real);
      expect(back.imag).toBeCloseTo(c.imag);
    });

    it('should handle zero magnitude', () => {
      const result = fromPolarComplex(0, Math.PI / 4);
      expect(result.real).toBeCloseTo(0);
      expect(result.imag).toBeCloseTo(0);
    });

    it('should handle angle 2π', () => {
      const result = fromPolarComplex(5, 2 * Math.PI);
      expect(result.real).toBeCloseTo(5);
      expect(result.imag).toBeCloseTo(0);
    });
  });

  describe('sqrtComplex', () => {
    it('should calculate square root of positive real number', () => {
      const [root1, root2] = sqrtComplex({ real: 4, imag: 0 });
      expect(root1.real).toBeCloseTo(2);
      expect(root1.imag).toBe(0);
      expect(root2.real).toBeCloseTo(-2);
      expect(root2.imag).toBe(0);
    });

    it('should calculate square root of negative real number', () => {
      const [root1, root2] = sqrtComplex({ real: -4, imag: 0 });
      expect(root1.real).toBeCloseTo(0);
      expect(root1.imag).toBeCloseTo(2);
      expect(root2.real).toBeCloseTo(0);
      expect(root2.imag).toBeCloseTo(-2);
    });

    it('should calculate square root of imaginary number', () => {
      const [root1, root2] = sqrtComplex({ real: 0, imag: 4 });
      expect(magnitudeComplex(root1)).toBeCloseTo(2);
      expect(magnitudeComplex(root2)).toBeCloseTo(2);
    });

    it('should calculate square root of complex number', () => {
      const [root1, root2] = sqrtComplex({ real: 3, imag: 4 });

      // Verify that squaring each root gives back the original
      const squared1 = multiplyComplex(root1, root1);
      expect(squared1.real).toBeCloseTo(3);
      expect(squared1.imag).toBeCloseTo(4);

      const squared2 = multiplyComplex(root2, root2);
      expect(squared2.real).toBeCloseTo(3);
      expect(squared2.imag).toBeCloseTo(4);
    });

    it('should return two roots', () => {
      const roots = sqrtComplex({ real: 9, imag: 0 });
      expect(roots).toHaveLength(2);
    });

    it('should have roots that are negatives of each other', () => {
      const [root1, root2] = sqrtComplex({ real: 5, imag: 12 });
      expect(root1.real).toBeCloseTo(-root2.real);
      expect(root1.imag).toBeCloseTo(-root2.imag);
    });

    it('should handle zero', () => {
      const [root1, root2] = sqrtComplex({ real: 0, imag: 0 });
      expect(root1.real).toBe(0);
      expect(root1.imag).toBe(0);
      expect(root2.real).toBe(0);
      expect(root2.imag).toBe(0);
    });
  });

  describe('powerComplex', () => {
    it('should raise complex number to integer power', () => {
      const result = powerComplex({ real: 2, imag: 0 }, 3);
      expect(result.real).toBeCloseTo(8);
      expect(result.imag).toBeCloseTo(0);
    });

    it('should handle power of 0', () => {
      const result = powerComplex({ real: 3, imag: 4 }, 0);
      expect(result.real).toBeCloseTo(1);
      expect(result.imag).toBeCloseTo(0);
    });

    it('should handle power of 1', () => {
      const result = powerComplex({ real: 3, imag: 4 }, 1);
      expect(result.real).toBeCloseTo(3);
      expect(result.imag).toBeCloseTo(4);
    });

    it('should handle negative powers', () => {
      const result = powerComplex({ real: 2, imag: 0 }, -1);
      expect(result.real).toBeCloseTo(0.5);
      expect(result.imag).toBeCloseTo(0);
    });

    it('should handle fractional powers', () => {
      const result = powerComplex({ real: 4, imag: 0 }, 0.5);
      expect(result.real).toBeCloseTo(2);
      expect(result.imag).toBeCloseTo(0);
    });

    it('should handle i^2 = -1', () => {
      const result = powerComplex({ real: 0, imag: 1 }, 2);
      expect(result.real).toBeCloseTo(-1);
      expect(result.imag).toBeCloseTo(0);
    });

    it('should handle i^4 = 1', () => {
      const result = powerComplex({ real: 0, imag: 1 }, 4);
      expect(result.real).toBeCloseTo(1);
      expect(result.imag).toBeCloseTo(0);
    });

    it('should handle complex number to power 2', () => {
      const c: ComplexNumber = { real: 3, imag: 4 };
      const result = powerComplex(c, 2);
      const manual = multiplyComplex(c, c);

      expect(result.real).toBeCloseTo(manual.real);
      expect(result.imag).toBeCloseTo(manual.imag);
    });

    it("should handle De Moivre's theorem", () => {
      // (cos θ + i sin θ)^n = cos(nθ) + i sin(nθ)
      const theta = Math.PI / 6;
      const c = fromPolarComplex(1, theta);
      const result = powerComplex(c, 3);
      const expected = fromPolarComplex(1, 3 * theta);

      expect(result.real).toBeCloseTo(expected.real);
      expect(result.imag).toBeCloseTo(expected.imag);
    });
  });

  describe('lnComplex', () => {
    it('should calculate natural logarithm of positive real number', () => {
      const result = lnComplex({ real: Math.E, imag: 0 });
      expect(result.real).toBeCloseTo(1);
      expect(result.imag).toBeCloseTo(0);
    });

    it('should calculate natural logarithm of negative real number', () => {
      const result = lnComplex({ real: -1, imag: 0 });
      expect(result.real).toBeCloseTo(0);
      expect(result.imag).toBeCloseTo(Math.PI);
    });

    it('should calculate natural logarithm of imaginary number', () => {
      const result = lnComplex({ real: 0, imag: Math.E });
      expect(result.real).toBeCloseTo(1);
      expect(result.imag).toBeCloseTo(Math.PI / 2);
    });

    it('should throw error for zero', () => {
      expect(() => lnComplex({ real: 0, imag: 0 })).toThrow(
        'Cannot take logarithm of zero'
      );
    });

    it('should calculate natural logarithm of complex number', () => {
      const c: ComplexNumber = { real: 3, imag: 4 };
      const result = lnComplex(c);
      const polar = toPolarComplex(c);

      expect(result.real).toBeCloseTo(Math.log(polar.magnitude));
      expect(result.imag).toBeCloseTo(polar.angle);
    });

    it('should satisfy ln(z1 * z2) = ln(z1) + ln(z2) for magnitude', () => {
      const z1: ComplexNumber = { real: 2, imag: 3 };
      const z2: ComplexNumber = { real: 4, imag: 5 };
      const product = multiplyComplex(z1, z2);

      const lnProduct = lnComplex(product);
      const ln1 = lnComplex(z1);
      const ln2 = lnComplex(z2);

      // For the real part (magnitude logarithm)
      expect(lnProduct.real).toBeCloseTo(ln1.real + ln2.real);
    });

    it('should handle ln(1) = 0', () => {
      const result = lnComplex({ real: 1, imag: 0 });
      expect(result.real).toBeCloseTo(0);
      expect(result.imag).toBeCloseTo(0);
    });

    it('should handle ln(i)', () => {
      const result = lnComplex({ real: 0, imag: 1 });
      expect(result.real).toBeCloseTo(0);
      expect(result.imag).toBeCloseTo(Math.PI / 2);
    });

    it('should handle ln(-i)', () => {
      const result = lnComplex({ real: 0, imag: -1 });
      expect(result.real).toBeCloseTo(0);
      expect(result.imag).toBeCloseTo(-Math.PI / 2);
    });
  });
});
