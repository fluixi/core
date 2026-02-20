import { describe, it, expect } from 'vitest';
import {
  degToRad,
  radToDeg,
  degToGrad,
  gradToDeg,
  normalizeRadians,
  normalizeDegrees,
  sin,
  cos,
  tan,
  asin,
  acos,
  atan,
  atan2,
  sinh,
  cosh,
  tanh,
  asinh,
  acosh,
  atanh,
  sec,
  csc,
  cot,
} from './trigo.js';

describe('Trigonometric Functions', () => {
  describe('degToRad', () => {
    it('should convert degrees to radians', () => {
      expect(degToRad(0)).toBe(0);
      expect(degToRad(180)).toBeCloseTo(Math.PI);
      expect(degToRad(90)).toBeCloseTo(Math.PI / 2);
      expect(degToRad(360)).toBeCloseTo(2 * Math.PI);
    });

    it('should handle negative degrees', () => {
      expect(degToRad(-180)).toBeCloseTo(-Math.PI);
      expect(degToRad(-90)).toBeCloseTo(-Math.PI / 2);
    });

    it('should handle decimal degrees', () => {
      expect(degToRad(45)).toBeCloseTo(Math.PI / 4);
      expect(degToRad(30)).toBeCloseTo(Math.PI / 6);
    });

    it('should handle large values', () => {
      expect(degToRad(720)).toBeCloseTo(4 * Math.PI);
      expect(degToRad(1080)).toBeCloseTo(6 * Math.PI);
    });
  });

  describe('radToDeg', () => {
    it('should convert radians to degrees', () => {
      expect(radToDeg(0)).toBe(0);
      expect(radToDeg(Math.PI)).toBeCloseTo(180);
      expect(radToDeg(Math.PI / 2)).toBeCloseTo(90);
      expect(radToDeg(2 * Math.PI)).toBeCloseTo(360);
    });

    it('should handle negative radians', () => {
      expect(radToDeg(-Math.PI)).toBeCloseTo(-180);
      expect(radToDeg(-Math.PI / 2)).toBeCloseTo(-90);
    });

    it('should handle decimal radians', () => {
      expect(radToDeg(Math.PI / 4)).toBeCloseTo(45);
      expect(radToDeg(Math.PI / 6)).toBeCloseTo(30);
    });
  });

  describe('degToGrad', () => {
    it('should convert degrees to gradians', () => {
      expect(degToGrad(0)).toBe(0);
      expect(degToGrad(90)).toBeCloseTo(100);
      expect(degToGrad(180)).toBeCloseTo(200);
      expect(degToGrad(360)).toBeCloseTo(400);
    });

    it('should handle negative degrees', () => {
      expect(degToGrad(-90)).toBeCloseTo(-100);
      expect(degToGrad(-180)).toBeCloseTo(-200);
    });

    it('should handle decimal degrees', () => {
      expect(degToGrad(45)).toBeCloseTo(50);
      expect(degToGrad(135)).toBeCloseTo(150);
    });
  });

  describe('gradToDeg', () => {
    it('should convert gradians to degrees', () => {
      expect(gradToDeg(0)).toBe(0);
      expect(gradToDeg(100)).toBeCloseTo(90);
      expect(gradToDeg(200)).toBeCloseTo(180);
      expect(gradToDeg(400)).toBeCloseTo(360);
    });

    it('should handle negative gradians', () => {
      expect(gradToDeg(-100)).toBeCloseTo(-90);
      expect(gradToDeg(-200)).toBeCloseTo(-180);
    });

    it('should handle decimal gradians', () => {
      expect(gradToDeg(50)).toBeCloseTo(45);
      expect(gradToDeg(150)).toBeCloseTo(135);
    });
  });

  describe('normalizeRadians', () => {
    it('should normalize radians to [0, 2π)', () => {
      expect(normalizeRadians(0)).toBe(0);
      expect(normalizeRadians(Math.PI)).toBeCloseTo(Math.PI);
      expect(normalizeRadians(2 * Math.PI)).toBeCloseTo(0);
    });

    it('should handle values greater than 2π', () => {
      expect(normalizeRadians(3 * Math.PI)).toBeCloseTo(Math.PI);
      expect(normalizeRadians(4 * Math.PI)).toBeCloseTo(0);
      expect(normalizeRadians(5 * Math.PI)).toBeCloseTo(Math.PI);
    });

    it('should handle negative values', () => {
      expect(normalizeRadians(-Math.PI / 2)).toBeCloseTo(3 * Math.PI / 2);
      expect(normalizeRadians(-Math.PI)).toBeCloseTo(Math.PI);
      expect(normalizeRadians(-2 * Math.PI)).toBeCloseTo(0);
    });

    it('should handle values just under 2π', () => {
      expect(normalizeRadians(2 * Math.PI - 0.1)).toBeCloseTo(2 * Math.PI - 0.1);
    });
  });

  describe('normalizeDegrees', () => {
    it('should normalize degrees to [0, 360)', () => {
      expect(normalizeDegrees(0)).toBe(0);
      expect(normalizeDegrees(180)).toBe(180);
      expect(normalizeDegrees(360)).toBeCloseTo(0);
    });

    it('should handle values greater than 360', () => {
      expect(normalizeDegrees(450)).toBeCloseTo(90);
      expect(normalizeDegrees(720)).toBeCloseTo(0);
      expect(normalizeDegrees(540)).toBeCloseTo(180);
    });

    it('should handle negative values', () => {
      expect(normalizeDegrees(-90)).toBeCloseTo(270);
      expect(normalizeDegrees(-180)).toBeCloseTo(180);
      expect(normalizeDegrees(-360)).toBeCloseTo(0);
    });

    it('should handle values just under 360', () => {
      expect(normalizeDegrees(359.9)).toBeCloseTo(359.9);
    });
  });

  describe('sin', () => {
    it('should calculate sine of angles', () => {
      expect(sin(0)).toBe(0);
      expect(sin(Math.PI / 2)).toBeCloseTo(1);
      expect(sin(Math.PI)).toBeCloseTo(0);
      expect(sin(3 * Math.PI / 2)).toBeCloseTo(-1);
    });

    it('should handle negative angles', () => {
      expect(sin(-Math.PI / 2)).toBeCloseTo(-1);
      expect(sin(-Math.PI)).toBeCloseTo(0);
    });

    it('should handle common angles', () => {
      expect(sin(Math.PI / 6)).toBeCloseTo(0.5);
      expect(sin(Math.PI / 4)).toBeCloseTo(Math.sqrt(2) / 2);
      expect(sin(Math.PI / 3)).toBeCloseTo(Math.sqrt(3) / 2);
    });
  });

  describe('cos', () => {
    it('should calculate cosine of angles', () => {
      expect(cos(0)).toBe(1);
      expect(cos(Math.PI / 2)).toBeCloseTo(0);
      expect(cos(Math.PI)).toBeCloseTo(-1);
      expect(cos(3 * Math.PI / 2)).toBeCloseTo(0);
    });

    it('should handle negative angles', () => {
      expect(cos(-Math.PI / 2)).toBeCloseTo(0);
      expect(cos(-Math.PI)).toBeCloseTo(-1);
    });

    it('should handle common angles', () => {
      expect(cos(Math.PI / 6)).toBeCloseTo(Math.sqrt(3) / 2);
      expect(cos(Math.PI / 4)).toBeCloseTo(Math.sqrt(2) / 2);
      expect(cos(Math.PI / 3)).toBeCloseTo(0.5);
    });
  });

  describe('tan', () => {
    it('should calculate tangent of angles', () => {
      expect(tan(0)).toBeCloseTo(0);
      expect(tan(Math.PI / 4)).toBeCloseTo(1);
      expect(tan(Math.PI)).toBeCloseTo(0);
    });

    it('should handle negative angles', () => {
      expect(tan(-Math.PI / 4)).toBeCloseTo(-1);
      expect(tan(-Math.PI / 6)).toBeCloseTo(-Math.sqrt(3) / 3, 5);
    });

    it('should throw error when cosine is zero', () => {
      expect(() => tan(Math.PI / 2)).toThrow('Tangent undefined for this angle');
      expect(() => tan(3 * Math.PI / 2)).toThrow('Tangent undefined for this angle');
    });

    it('should handle common angles', () => {
      expect(tan(Math.PI / 6)).toBeCloseTo(Math.sqrt(3) / 3, 5);
      expect(tan(Math.PI / 3)).toBeCloseTo(Math.sqrt(3));
    });
  });

  describe('asin', () => {
    it('should calculate arcsine', () => {
      expect(asin(0)).toBe(0);
      expect(asin(1)).toBeCloseTo(Math.PI / 2);
      expect(asin(-1)).toBeCloseTo(-Math.PI / 2);
      expect(asin(0.5)).toBeCloseTo(Math.PI / 6);
    });

    it('should throw error for values outside [-1, 1]', () => {
      expect(() => asin(1.1)).toThrow('Arcsine is only defined for values between -1 and 1');
      expect(() => asin(-1.1)).toThrow('Arcsine is only defined for values between -1 and 1');
      expect(() => asin(2)).toThrow();
    });

    it('should handle boundary values', () => {
      expect(asin(1)).toBeCloseTo(Math.PI / 2);
      expect(asin(-1)).toBeCloseTo(-Math.PI / 2);
    });

    it('should handle common values', () => {
      expect(asin(Math.sqrt(2) / 2)).toBeCloseTo(Math.PI / 4);
      expect(asin(Math.sqrt(3) / 2)).toBeCloseTo(Math.PI / 3);
    });
  });

  describe('acos', () => {
    it('should calculate arccosine', () => {
      expect(acos(1)).toBe(0);
      expect(acos(0)).toBeCloseTo(Math.PI / 2);
      expect(acos(-1)).toBeCloseTo(Math.PI);
      expect(acos(0.5)).toBeCloseTo(Math.PI / 3);
    });

    it('should throw error for values outside [-1, 1]', () => {
      expect(() => acos(1.1)).toThrow('Arccosine is only defined for values between -1 and 1');
      expect(() => acos(-1.1)).toThrow('Arccosine is only defined for values between -1 and 1');
      expect(() => acos(2)).toThrow();
    });

    it('should handle boundary values', () => {
      expect(acos(1)).toBe(0);
      expect(acos(-1)).toBeCloseTo(Math.PI);
    });

    it('should handle common values', () => {
      expect(acos(Math.sqrt(2) / 2)).toBeCloseTo(Math.PI / 4);
      expect(acos(Math.sqrt(3) / 2)).toBeCloseTo(Math.PI / 6);
    });
  });

  describe('atan', () => {
    it('should calculate arctangent', () => {
      expect(atan(0)).toBe(0);
      expect(atan(1)).toBeCloseTo(Math.PI / 4);
      expect(atan(-1)).toBeCloseTo(-Math.PI / 4);
    });

    it('should handle large values', () => {
      expect(atan(1000)).toBeCloseTo(Math.PI / 2, 2);
      expect(atan(-1000)).toBeCloseTo(-Math.PI / 2, 2);
    });

    it('should handle common values', () => {
      expect(atan(Math.sqrt(3))).toBeCloseTo(Math.PI / 3);
      expect(atan(Math.sqrt(3) / 3)).toBeCloseTo(Math.PI / 6, 5);
    });

    it('should return values in [-π/2, π/2]', () => {
      const result = atan(10);
      expect(result).toBeGreaterThanOrEqual(-Math.PI / 2);
      expect(result).toBeLessThanOrEqual(Math.PI / 2);
    });
  });

  describe('atan2', () => {
    it('should calculate arctangent with correct quadrant', () => {
      expect(atan2(0, 1)).toBe(0);
      expect(atan2(1, 0)).toBeCloseTo(Math.PI / 2);
      expect(atan2(0, -1)).toBeCloseTo(Math.PI);
      expect(atan2(-1, 0)).toBeCloseTo(-Math.PI / 2);
    });

    it('should handle all four quadrants', () => {
      expect(atan2(1, 1)).toBeCloseTo(Math.PI / 4);
      expect(atan2(1, -1)).toBeCloseTo(3 * Math.PI / 4);
      expect(atan2(-1, -1)).toBeCloseTo(-3 * Math.PI / 4);
      expect(atan2(-1, 1)).toBeCloseTo(-Math.PI / 4);
    });

    it('should handle zero values', () => {
      expect(atan2(0, 0)).toBe(0);
      expect(atan2(1, 0)).toBeCloseTo(Math.PI / 2);
      expect(atan2(0, 1)).toBe(0);
    });

    it('should return values in [-π, π]', () => {
      const result = atan2(5, -3);
      expect(result).toBeGreaterThanOrEqual(-Math.PI);
      expect(result).toBeLessThanOrEqual(Math.PI);
    });
  });

  describe('sinh', () => {
    it('should calculate hyperbolic sine', () => {
      expect(sinh(0)).toBe(0);
      expect(sinh(1)).toBeCloseTo((Math.E - 1 / Math.E) / 2);
      expect(sinh(-1)).toBeCloseTo(-(Math.E - 1 / Math.E) / 2);
    });

    it('should handle negative values', () => {
      expect(sinh(-2)).toBeCloseTo(-sinh(2));
    });

    it('should handle large values', () => {
      expect(sinh(5)).toBeGreaterThan(70);
    });

    it('should be an odd function', () => {
      const x = 1.5;
      expect(sinh(-x)).toBeCloseTo(-sinh(x));
    });
  });

  describe('cosh', () => {
    it('should calculate hyperbolic cosine', () => {
      expect(cosh(0)).toBe(1);
      expect(cosh(1)).toBeCloseTo((Math.E + 1 / Math.E) / 2);
    });

    it('should be an even function', () => {
      const x = 1.5;
      expect(cosh(-x)).toBeCloseTo(cosh(x));
    });

    it('should always be >= 1', () => {
      expect(cosh(0)).toBeGreaterThanOrEqual(1);
      expect(cosh(1)).toBeGreaterThanOrEqual(1);
      expect(cosh(-1)).toBeGreaterThanOrEqual(1);
      expect(cosh(5)).toBeGreaterThanOrEqual(1);
    });

    it('should handle large values', () => {
      expect(cosh(5)).toBeGreaterThan(70);
    });
  });

  describe('tanh', () => {
    it('should calculate hyperbolic tangent', () => {
      expect(tanh(0)).toBe(0);
      expect(tanh(Infinity)).toBe(1);
      expect(tanh(-Infinity)).toBe(-1);
    });

    it('should be an odd function', () => {
      const x = 1.5;
      expect(tanh(-x)).toBeCloseTo(-tanh(x));
    });

    it('should return values in (-1, 1)', () => {
      expect(tanh(1)).toBeGreaterThan(-1);
      expect(tanh(1)).toBeLessThan(1);
      expect(tanh(100)).toBeCloseTo(1);
      expect(tanh(-100)).toBeCloseTo(-1);
    });

    it('should approach 1 for large positive values', () => {
      expect(tanh(10)).toBeCloseTo(1, 5);
    });

    it('should approach -1 for large negative values', () => {
      expect(tanh(-10)).toBeCloseTo(-1, 5);
    });
  });

  describe('asinh', () => {
    it('should calculate inverse hyperbolic sine', () => {
      expect(asinh(0)).toBe(0);
      expect(asinh(sinh(1))).toBeCloseTo(1);
      expect(asinh(sinh(2))).toBeCloseTo(2);
    });

    it('should handle negative values', () => {
      expect(asinh(-1)).toBeCloseTo(-asinh(1));
    });

    it('should be inverse of sinh', () => {
      const x = 2.5;
      expect(asinh(sinh(x))).toBeCloseTo(x);
      expect(sinh(asinh(x))).toBeCloseTo(x);
    });

    it('should handle large values', () => {
      expect(asinh(1000)).toBeGreaterThan(7);
    });
  });

  describe('acosh', () => {
    it('should calculate inverse hyperbolic cosine', () => {
      expect(acosh(1)).toBe(0);
      expect(acosh(cosh(1))).toBeCloseTo(1);
      expect(acosh(cosh(2))).toBeCloseTo(2);
    });

    it('should throw error for x < 1', () => {
      expect(() => acosh(0)).toThrow('Inverse hyperbolic cosine is only defined for x >= 1');
      expect(() => acosh(0.5)).toThrow('Inverse hyperbolic cosine is only defined for x >= 1');
      expect(() => acosh(-1)).toThrow();
    });

    it('should be inverse of cosh for x >= 0', () => {
      const x = 2.5;
      expect(acosh(cosh(x))).toBeCloseTo(x);
      expect(cosh(acosh(x))).toBeCloseTo(x);
    });

    it('should handle boundary value', () => {
      expect(acosh(1)).toBe(0);
    });
  });

  describe('atanh', () => {
    it('should calculate inverse hyperbolic tangent', () => {
      expect(atanh(0)).toBe(0);
      expect(atanh(tanh(0.5))).toBeCloseTo(0.5);
      expect(atanh(tanh(0.9))).toBeCloseTo(0.9);
    });

    it('should throw error for |x| >= 1', () => {
      expect(() => atanh(1)).toThrow('Inverse hyperbolic tangent is only defined for |x| < 1');
      expect(() => atanh(-1)).toThrow('Inverse hyperbolic tangent is only defined for |x| < 1');
      expect(() => atanh(1.1)).toThrow();
      expect(() => atanh(-1.1)).toThrow();
    });

    it('should be inverse of tanh', () => {
      const x = 0.5;
      expect(atanh(tanh(x))).toBeCloseTo(x);
      expect(tanh(atanh(x))).toBeCloseTo(x);
    });

    it('should handle values close to boundaries', () => {
      expect(atanh(0.99)).toBeGreaterThan(2);
      expect(atanh(-0.99)).toBeLessThan(-2);
    });
  });

  describe('sec', () => {
    it('should calculate secant', () => {
      expect(sec(0)).toBe(1);
      expect(sec(Math.PI / 3)).toBeCloseTo(2);
      expect(sec(Math.PI)).toBeCloseTo(-1);
    });

    it('should throw error when cosine is zero', () => {
      expect(() => sec(Math.PI / 2)).toThrow('Secant undefined for this angle');
      expect(() => sec(3 * Math.PI / 2)).toThrow('Secant undefined for this angle');
    });

    it('should be reciprocal of cosine', () => {
      expect(sec(Math.PI / 4)).toBeCloseTo(1 / cos(Math.PI / 4));
      expect(sec(Math.PI / 6)).toBeCloseTo(1 / cos(Math.PI / 6));
    });

    it('should handle negative angles', () => {
      expect(sec(-Math.PI / 3)).toBeCloseTo(2);
    });
  });

  describe('csc', () => {
    it('should calculate cosecant', () => {
      expect(csc(Math.PI / 2)).toBeCloseTo(1);
      expect(csc(Math.PI / 6)).toBeCloseTo(2);
      expect(csc(3 * Math.PI / 2)).toBeCloseTo(-1);
    });

    it('should throw error when sine is zero', () => {
      expect(() => csc(0)).toThrow('Cosecant undefined for this angle');
      expect(() => csc(Math.PI)).toThrow('Cosecant undefined for this angle');
      expect(() => csc(2 * Math.PI)).toThrow();
    });

    it('should be reciprocal of sine', () => {
      expect(csc(Math.PI / 4)).toBeCloseTo(1 / sin(Math.PI / 4));
      expect(csc(Math.PI / 3)).toBeCloseTo(1 / sin(Math.PI / 3));
    });

    it('should handle negative angles', () => {
      expect(csc(-Math.PI / 6)).toBeCloseTo(-2);
    });
  });

  describe('cot', () => {
    it('should calculate cotangent', () => {
      expect(cot(Math.PI / 4)).toBeCloseTo(1);
      expect(cot(Math.PI / 6)).toBeCloseTo(Math.sqrt(3));
      expect(cot(Math.PI / 3)).toBeCloseTo(Math.sqrt(3) / 3, 5);
    });

    it('should throw error when tangent is zero', () => {
      expect(() => cot(0)).toThrow('Cotangent undefined for this angle');
      expect(() => cot(Math.PI)).toThrow('Cotangent undefined for this angle');
    });

    it('should be reciprocal of tangent', () => {
      expect(cot(Math.PI / 4)).toBeCloseTo(1 / tan(Math.PI / 4));
      expect(cot(Math.PI / 6)).toBeCloseTo(1 / tan(Math.PI / 6));
    });

    it('should handle negative angles', () => {
      expect(cot(-Math.PI / 4)).toBeCloseTo(-1);
    });
  });
});
