import { describe, it, expect } from 'vitest';
import {
  ln,
  log10,
  log2,
  log,
  exp,
  cbrt,
  nthRoot,
  solveQuadratic,
  evaluatePolynomial,
  simplifyFraction,
  addFractions,
  multiplyFractions,
  percentage,
  toBase,
  toOrdinal,
  range,
  truncateDecimals,
  normalize,
  wrap,
} from './advanced.js';

describe('Advanced Math Functions', () => {
  describe('ln', () => {
    it('should calculate natural logarithm', () => {
      expect(ln(Math.E)).toBeCloseTo(1);
      expect(ln(1)).toBe(0);
      expect(ln(Math.E ** 2)).toBeCloseTo(2);
    });

    it('should throw error for non-positive numbers', () => {
      expect(() => ln(0)).toThrow('Natural logarithm is only defined for positive numbers');
      expect(() => ln(-1)).toThrow('Natural logarithm is only defined for positive numbers');
      expect(() => ln(-10)).toThrow();
    });

    it('should handle decimal numbers', () => {
      expect(ln(2)).toBeCloseTo(0.693147);
      expect(ln(10)).toBeCloseTo(2.302585);
    });
  });

  describe('log10', () => {
    it('should calculate base-10 logarithm', () => {
      expect(log10(10)).toBe(1);
      expect(log10(100)).toBe(2);
      expect(log10(1000)).toBe(3);
      expect(log10(1)).toBe(0);
    });

    it('should throw error for non-positive numbers', () => {
      expect(() => log10(0)).toThrow('Logarithm is only defined for positive numbers');
      expect(() => log10(-1)).toThrow();
    });

    it('should handle decimal numbers', () => {
      expect(log10(2)).toBeCloseTo(0.30103);
      expect(log10(0.1)).toBe(-1);
    });
  });

  describe('log2', () => {
    it('should calculate base-2 logarithm', () => {
      expect(log2(2)).toBe(1);
      expect(log2(4)).toBe(2);
      expect(log2(8)).toBe(3);
      expect(log2(1)).toBe(0);
    });

    it('should throw error for non-positive numbers', () => {
      expect(() => log2(0)).toThrow('Logarithm is only defined for positive numbers');
      expect(() => log2(-1)).toThrow();
    });

    it('should handle decimal numbers', () => {
      expect(log2(0.5)).toBe(-1);
      expect(log2(3)).toBeCloseTo(1.58496);
    });
  });

  describe('log', () => {
    it('should calculate logarithm with custom base', () => {
      expect(log(8, 2)).toBe(3);
      expect(log(100, 10)).toBe(2);
      expect(log(27, 3)).toBeCloseTo(3);
      expect(log(1, 5)).toBe(0);
    });

    it('should throw error for non-positive value', () => {
      expect(() => log(0, 10)).toThrow('Logarithm is only defined for positive numbers and bases');
      expect(() => log(-1, 10)).toThrow();
    });

    it('should throw error for non-positive base', () => {
      expect(() => log(10, 0)).toThrow('Logarithm is only defined for positive numbers and bases');
      expect(() => log(10, -1)).toThrow();
    });

    it('should handle decimal bases', () => {
      expect(log(4, 2)).toBe(2);
      expect(log(125, 5)).toBeCloseTo(3);
    });
  });

  describe('exp', () => {
    it('should calculate exponential function', () => {
      expect(exp(0)).toBe(1);
      expect(exp(1)).toBeCloseTo(Math.E);
      expect(exp(2)).toBeCloseTo(Math.E ** 2);
    });

    it('should handle negative exponents', () => {
      expect(exp(-1)).toBeCloseTo(1 / Math.E);
      expect(exp(-2)).toBeCloseTo(1 / (Math.E ** 2));
    });

    it('should handle decimal exponents', () => {
      expect(exp(0.5)).toBeCloseTo(Math.sqrt(Math.E));
      expect(exp(1.5)).toBeCloseTo(Math.E ** 1.5);
    });
  });

  describe('cbrt', () => {
    it('should calculate cube root', () => {
      expect(cbrt(8)).toBeCloseTo(2);
      expect(cbrt(27)).toBeCloseTo(3);
      expect(cbrt(1)).toBe(1);
      expect(cbrt(0)).toBe(0);
    });

    it('should handle negative numbers', () => {
      expect(cbrt(-8)).toBeCloseTo(-2);
      expect(cbrt(-27)).toBeCloseTo(-3);
    });

    it('should handle decimal numbers', () => {
      expect(cbrt(2)).toBeCloseTo(1.25992);
      expect(cbrt(0.125)).toBeCloseTo(0.5);
    });
  });

  describe('nthRoot', () => {
    it('should calculate nth root', () => {
      expect(nthRoot(8, 3)).toBeCloseTo(2);
      expect(nthRoot(16, 4)).toBeCloseTo(2);
      expect(nthRoot(32, 5)).toBeCloseTo(2);
    });

    it('should handle square root (n=2)', () => {
      expect(nthRoot(4, 2)).toBeCloseTo(2);
      expect(nthRoot(9, 2)).toBeCloseTo(3);
    });

    it('should throw error for 0th root', () => {
      expect(() => nthRoot(8, 0)).toThrow('Cannot calculate 0th root');
    });

    it('should throw error for even root of negative number', () => {
      expect(() => nthRoot(-8, 2)).toThrow('Cannot calculate even root of negative number');
      expect(() => nthRoot(-16, 4)).toThrow();
    });

    it('should handle odd root of negative number', () => {
      expect(nthRoot(-8, 3)).toBeCloseTo(-2);
      expect(nthRoot(-32, 5)).toBeCloseTo(-2);
    });

    it('should handle negative n', () => {
      expect(nthRoot(8, -3)).toBeCloseTo(0.5);
      expect(nthRoot(4, -2)).toBeCloseTo(0.5);
    });
  });

  describe('solveQuadratic', () => {
    it('should solve quadratic with two real roots', () => {
      const roots = solveQuadratic(1, -3, 2);
      expect(roots).toHaveLength(2);
      expect(roots[0]).toBeCloseTo(1);
      expect(roots[1]).toBeCloseTo(2);
    });

    it('should solve quadratic with one root (discriminant = 0)', () => {
      const roots = solveQuadratic(1, -2, 1);
      expect(roots).toHaveLength(1);
      expect(roots[0]).toBeCloseTo(1);
    });

    it('should return empty array for no real roots', () => {
      const roots = solveQuadratic(1, 0, 1);
      expect(roots).toHaveLength(0);
    });

    it('should handle linear equation (a = 0)', () => {
      const roots = solveQuadratic(0, 2, -4);
      expect(roots).toHaveLength(1);
      expect(roots[0]).toBeCloseTo(2);
    });

    it('should return empty array for invalid equation (a = 0, b = 0)', () => {
      const roots = solveQuadratic(0, 0, 5);
      expect(roots).toHaveLength(0);
    });

    it('should handle negative coefficients', () => {
      const roots = solveQuadratic(-1, 5, -6);
      expect(roots).toHaveLength(2);
      expect(roots).toContain(2);
      expect(roots).toContain(3);
    });
  });

  describe('evaluatePolynomial', () => {
    it('should evaluate polynomial at given x', () => {
      expect(evaluatePolynomial([2, 3, 1], 0)).toBe(1);
      expect(evaluatePolynomial([2, 3, 1], 1)).toBe(6);
      expect(evaluatePolynomial([2, 3, 1], 2)).toBe(15);
    });

    it('should handle constant polynomial', () => {
      expect(evaluatePolynomial([5], 10)).toBe(5);
      expect(evaluatePolynomial([0], 100)).toBe(0);
    });

    it('should handle linear polynomial', () => {
      expect(evaluatePolynomial([2, 3], 1)).toBe(5);
      expect(evaluatePolynomial([2, 3], 2)).toBe(7);
    });

    it('should handle negative x', () => {
      expect(evaluatePolynomial([1, 0, 1], -2)).toBe(5);
      expect(evaluatePolynomial([2, 3, 1], -1)).toBe(0);
    });

    it('should use Horner\'s method efficiently', () => {
      expect(evaluatePolynomial([1, 2, 3, 4], 2)).toBe(26);
    });
  });

  describe('simplifyFraction', () => {
    it('should simplify fractions', () => {
      expect(simplifyFraction({ numerator: 4, denominator: 8 })).toEqual({
        numerator: 1,
        denominator: 2,
      });
      expect(simplifyFraction({ numerator: 6, denominator: 9 })).toEqual({
        numerator: 2,
        denominator: 3,
      });
    });

    it('should handle already simplified fractions', () => {
      expect(simplifyFraction({ numerator: 3, denominator: 5 })).toEqual({
        numerator: 3,
        denominator: 5,
      });
    });

    it('should handle whole numbers', () => {
      expect(simplifyFraction({ numerator: 10, denominator: 5 })).toEqual({
        numerator: 2,
        denominator: 1,
      });
    });

    it('should handle negative fractions', () => {
      expect(simplifyFraction({ numerator: -4, denominator: 8 })).toEqual({
        numerator: -1,
        denominator: 2,
      });
      expect(simplifyFraction({ numerator: 4, denominator: -8 })).toEqual({
        numerator: 1,
        denominator: -2,
      });
    });
  });

  describe('addFractions', () => {
    it('should add two fractions', () => {
      const result = addFractions(
        { numerator: 1, denominator: 2 },
        { numerator: 1, denominator: 3 }
      );
      expect(result).toEqual({ numerator: 5, denominator: 6 });
    });

    it('should simplify result', () => {
      const result = addFractions(
        { numerator: 1, denominator: 4 },
        { numerator: 1, denominator: 4 }
      );
      expect(result).toEqual({ numerator: 1, denominator: 2 });
    });

    it('should handle negative fractions', () => {
      const result = addFractions(
        { numerator: 1, denominator: 2 },
        { numerator: -1, denominator: 3 }
      );
      expect(result).toEqual({ numerator: 1, denominator: 6 });
    });

    it('should handle zero', () => {
      const result = addFractions(
        { numerator: 1, denominator: 2 },
        { numerator: 0, denominator: 1 }
      );
      expect(result).toEqual({ numerator: 1, denominator: 2 });
    });
  });

  describe('multiplyFractions', () => {
    it('should multiply two fractions', () => {
      const result = multiplyFractions(
        { numerator: 2, denominator: 3 },
        { numerator: 3, denominator: 4 }
      );
      expect(result).toEqual({ numerator: 1, denominator: 2 });
    });

    it('should simplify result', () => {
      const result = multiplyFractions(
        { numerator: 2, denominator: 5 },
        { numerator: 5, denominator: 8 }
      );
      expect(result).toEqual({ numerator: 1, denominator: 4 });
    });

    it('should handle negative fractions', () => {
      const result = multiplyFractions(
        { numerator: -2, denominator: 3 },
        { numerator: 3, denominator: 4 }
      );
      expect(result).toEqual({ numerator: -1, denominator: 2 });
    });

    it('should handle zero', () => {
      const result = multiplyFractions(
        { numerator: 0, denominator: 1 },
        { numerator: 5, denominator: 6 }
      );
      expect(result).toEqual({ numerator: 0, denominator: 1 });
    });
  });

  describe('percentage', () => {
    it('should calculate percentage', () => {
      expect(percentage(25, 100)).toBe(25);
      expect(percentage(50, 200)).toBe(25);
      expect(percentage(75, 100)).toBe(75);
    });

    it('should round to specified precision', () => {
      expect(percentage(1, 3, 2)).toBe(33.33);
      expect(percentage(2, 3, 2)).toBe(66.67);
      expect(percentage(1, 3, 4)).toBe(33.3333);
    });

    it('should handle zero total', () => {
      expect(percentage(5, 0)).toBe(0);
    });

    it('should handle zero value', () => {
      expect(percentage(0, 100)).toBe(0);
    });

    it('should handle negative numbers', () => {
      expect(percentage(-25, 100)).toBe(-25);
      expect(percentage(25, -100)).toBe(-25);
    });

    it('should handle percentage > 100', () => {
      expect(percentage(150, 100)).toBe(150);
      expect(percentage(200, 100)).toBe(200);
    });
  });

  describe('toBase', () => {
    it('should convert to binary (base 2)', () => {
      expect(toBase(10, 2)).toBe('1010');
      expect(toBase(15, 2)).toBe('1111');
      expect(toBase(255, 2)).toBe('11111111');
    });

    it('should convert to hexadecimal (base 16)', () => {
      expect(toBase(255, 16)).toBe('ff');
      expect(toBase(16, 16)).toBe('10');
      expect(toBase(31, 16)).toBe('1f');
    });

    it('should convert to octal (base 8)', () => {
      expect(toBase(8, 8)).toBe('10');
      expect(toBase(64, 8)).toBe('100');
    });

    it('should pad with zeros to minimum length', () => {
      expect(toBase(5, 2, 8)).toBe('00000101');
      expect(toBase(10, 16, 4)).toBe('000a');
    });

    it('should throw error for invalid base', () => {
      expect(() => toBase(10, 1)).toThrow('Base must be between 2 and 36');
      expect(() => toBase(10, 37)).toThrow('Base must be between 2 and 36');
    });

    it('should handle zero', () => {
      expect(toBase(0, 2)).toBe('0');
      expect(toBase(0, 10)).toBe('0');
    });
  });

  describe('toOrdinal', () => {
    it('should convert numbers to ordinal strings', () => {
      expect(toOrdinal(1)).toBe('1st');
      expect(toOrdinal(2)).toBe('2nd');
      expect(toOrdinal(3)).toBe('3rd');
      expect(toOrdinal(4)).toBe('4th');
    });

    it('should handle teens correctly', () => {
      expect(toOrdinal(11)).toBe('11th');
      expect(toOrdinal(12)).toBe('12th');
      expect(toOrdinal(13)).toBe('13th');
    });

    it('should handle larger numbers', () => {
      expect(toOrdinal(21)).toBe('21st');
      expect(toOrdinal(22)).toBe('22nd');
      expect(toOrdinal(23)).toBe('23rd');
      expect(toOrdinal(24)).toBe('24th');
      expect(toOrdinal(100)).toBe('100th');
      expect(toOrdinal(101)).toBe('101st');
    });

    it('should handle multiples of 10', () => {
      expect(toOrdinal(10)).toBe('10th');
      expect(toOrdinal(20)).toBe('20th');
      expect(toOrdinal(30)).toBe('30th');
    });
  });

  describe('range', () => {
    it('should generate range with positive step', () => {
      expect(range(0, 5, 1)).toEqual([0, 1, 2, 3, 4]);
      expect(range(1, 4, 1)).toEqual([1, 2, 3]);
    });

    it('should use default step of 1', () => {
      expect(range(0, 5)).toEqual([0, 1, 2, 3, 4]);
      expect(range(5, 10)).toEqual([5, 6, 7, 8, 9]);
    });

    it('should handle negative step', () => {
      expect(range(5, 0, -1)).toEqual([5, 4, 3, 2, 1]);
      expect(range(10, 5, -1)).toEqual([10, 9, 8, 7, 6]);
    });

    it('should handle larger steps', () => {
      expect(range(0, 10, 2)).toEqual([0, 2, 4, 6, 8]);
      expect(range(0, 10, 3)).toEqual([0, 3, 6, 9]);
    });

    it('should return empty array for zero step', () => {
      expect(range(0, 5, 0)).toEqual([]);
    });

    it('should return empty array when step direction is wrong', () => {
      expect(range(0, 5, -1)).toEqual([]);
      expect(range(5, 0, 1)).toEqual([]);
    });

    it('should handle decimal steps', () => {
      expect(range(0, 1, 0.2)).toHaveLength(5);
      expect(range(0, 1, 0.5)).toEqual([0, 0.5]);
    });
  });

  describe('truncateDecimals', () => {
    it('should truncate decimals to specified places', () => {
      expect(truncateDecimals(1.239, 2)).toBe(1.23);
      expect(truncateDecimals(1.235, 2)).toBe(1.23);
      expect(truncateDecimals(3.14159, 3)).toBe(3.141);
    });

    it('should handle zero decimal places', () => {
      expect(truncateDecimals(1.9, 0)).toBe(1);
      expect(truncateDecimals(5.5, 0)).toBe(5);
    });

    it('should handle negative numbers', () => {
      expect(truncateDecimals(-1.239, 2)).toBe(-1.23);
      expect(truncateDecimals(-5.678, 1)).toBe(-5.6);
    });

    it('should handle non-finite numbers', () => {
      expect(truncateDecimals(Infinity, 2)).toBe(Infinity);
      expect(truncateDecimals(-Infinity, 2)).toBe(-Infinity);
      expect(truncateDecimals(NaN, 2)).toBeNaN();
    });

    it('should not round up', () => {
      expect(truncateDecimals(1.999, 2)).toBe(1.99);
      expect(truncateDecimals(9.999, 2)).toBe(9.99);
    });
  });

  describe('normalize', () => {
    it('should normalize value to 0-1 range', () => {
      expect(normalize(5, 0, 10)).toBe(0.5);
      expect(normalize(0, 0, 10)).toBe(0);
      expect(normalize(10, 0, 10)).toBe(1);
    });

    it('should handle negative ranges', () => {
      expect(normalize(0, -10, 10)).toBe(0.5);
      expect(normalize(-5, -10, 10)).toBe(0.25);
      expect(normalize(5, -10, 10)).toBe(0.75);
    });

    it('should handle values outside range', () => {
      expect(normalize(15, 0, 10)).toBe(1.5);
      expect(normalize(-5, 0, 10)).toBe(-0.5);
    });

    it('should return 0 when min equals max', () => {
      expect(normalize(5, 5, 5)).toBe(0);
      expect(normalize(10, 5, 5)).toBe(0);
    });

    it('should handle decimal values', () => {
      expect(normalize(2.5, 0, 10)).toBe(0.25);
      expect(normalize(7.5, 0, 10)).toBe(0.75);
    });
  });

  describe('wrap', () => {
    it('should wrap value within range', () => {
      expect(wrap(5, 0, 10)).toBe(5);
      expect(wrap(15, 0, 10)).toBe(5);
      expect(wrap(25, 0, 10)).toBe(5);
    });

    it('should handle negative values', () => {
      expect(wrap(-5, 0, 10)).toBe(5);
      expect(wrap(-15, 0, 10)).toBe(5);
    });

    it('should handle values at boundaries', () => {
      expect(wrap(0, 0, 10)).toBe(0);
      expect(wrap(10, 0, 10)).toBe(0);
    });

    it('should work with negative ranges', () => {
      expect(wrap(5, -10, 10)).toBe(5);
      expect(wrap(25, -10, 10)).toBe(5);
      expect(wrap(-15, -10, 10)).toBe(5);
    });

    it('should handle decimal values', () => {
      expect(wrap(12.5, 0, 10)).toBeCloseTo(2.5);
      expect(wrap(-2.5, 0, 10)).toBeCloseTo(7.5);
    });

    it('should handle different range sizes', () => {
      expect(wrap(8, 0, 5)).toBe(3);
      expect(wrap(13, 0, 5)).toBe(3);
      expect(wrap(365, 0, 360)).toBe(5);
    });
  });
});
