import { describe, it, expect } from 'vitest';
import {
  add,
  subtract,
  divide,
  modulo,
  power,
  sqrt,
  abs,
  round,
  floor,
  ceil,
  trunc,
  clamp,
  sign,
  factorial,
  gcd,
  lcm,
  lerp,
  invLerp,
  mapRange,
  min,
  max,
  average,
  sum,
  median,
  product,
} from './basic.js';

describe('Basic Math Functions', () => {
  describe('add', () => {
    it('should add two positive numbers', () => {
      expect(add(2, 3)).toBe(5);
      expect(add(10, 20)).toBe(30);
    });

    it('should add negative numbers', () => {
      expect(add(-5, -3)).toBe(-8);
      expect(add(-10, 5)).toBe(-5);
    });

    it('should handle zero', () => {
      expect(add(0, 5)).toBe(5);
      expect(add(5, 0)).toBe(5);
      expect(add(0, 0)).toBe(0);
    });

    it('should handle decimal numbers', () => {
      expect(add(1.5, 2.5)).toBe(4);
      expect(add(0.1, 0.2)).toBeCloseTo(0.3);
    });
  });

  describe('subtract', () => {
    it('should subtract two positive numbers', () => {
      expect(subtract(5, 3)).toBe(2);
      expect(subtract(10, 7)).toBe(3);
    });

    it('should subtract negative numbers', () => {
      expect(subtract(-5, -3)).toBe(-2);
      expect(subtract(5, -3)).toBe(8);
    });

    it('should handle zero', () => {
      expect(subtract(5, 0)).toBe(5);
      expect(subtract(0, 5)).toBe(-5);
      expect(subtract(0, 0)).toBe(0);
    });

    it('should handle decimal numbers', () => {
      expect(subtract(5.5, 2.5)).toBe(3);
      expect(subtract(0.3, 0.1)).toBeCloseTo(0.2);
    });
  });

  describe('divide', () => {
    it('should divide two positive numbers', () => {
      expect(divide(10, 2)).toBe(5);
      expect(divide(15, 3)).toBe(5);
    });

    it('should handle division with decimals', () => {
      expect(divide(7, 2)).toBe(3.5);
      expect(divide(1, 3)).toBeCloseTo(0.333333);
    });

    it('should return NaN when dividing by zero without fallback', () => {
      expect(divide(5, 0)).toBeNaN();
    });

    it('should return fallback value when dividing by zero', () => {
      expect(divide(5, 0, 0)).toBe(0);
      expect(divide(10, 0, -1)).toBe(-1);
    });

    it('should handle negative numbers', () => {
      expect(divide(-10, 2)).toBe(-5);
      expect(divide(10, -2)).toBe(-5);
      expect(divide(-10, -2)).toBe(5);
    });
  });

  describe('modulo', () => {
    it('should calculate modulo of positive numbers', () => {
      expect(modulo(10, 3)).toBe(1);
      expect(modulo(15, 4)).toBe(3);
      expect(modulo(8, 2)).toBe(0);
    });

    it('should handle negative numbers', () => {
      expect(modulo(-10, 3)).toBe(-1);
      expect(modulo(10, -3)).toBe(1);
    });

    it('should handle zero dividend', () => {
      expect(modulo(0, 5)).toBe(0);
    });
  });

  describe('power', () => {
    it('should calculate power of positive numbers', () => {
      expect(power(2, 3)).toBe(8);
      expect(power(5, 2)).toBe(25);
      expect(power(10, 0)).toBe(1);
    });

    it('should handle negative exponents', () => {
      expect(power(2, -1)).toBe(0.5);
      expect(power(10, -2)).toBe(0.01);
    });

    it('should handle fractional exponents', () => {
      expect(power(4, 0.5)).toBe(2);
      expect(power(27, 1 / 3)).toBeCloseTo(3);
    });

    it('should handle negative base with integer exponent', () => {
      expect(power(-2, 3)).toBe(-8);
      expect(power(-2, 2)).toBe(4);
    });
  });

  describe('sqrt', () => {
    it('should calculate square root of positive numbers', () => {
      expect(sqrt(4)).toBe(2);
      expect(sqrt(9)).toBe(3);
      expect(sqrt(16)).toBe(4);
    });

    it('should handle zero', () => {
      expect(sqrt(0)).toBe(0);
    });

    it('should handle decimal numbers', () => {
      expect(sqrt(2)).toBeCloseTo(1.414213);
      expect(sqrt(0.25)).toBe(0.5);
    });

    it('should throw error for negative numbers', () => {
      expect(() => sqrt(-1)).toThrow(
        'Cannot calculate square root of negative number'
      );
      expect(() => sqrt(-100)).toThrow();
    });
  });

  describe('abs', () => {
    it('should return absolute value of positive numbers', () => {
      expect(abs(5)).toBe(5);
      expect(abs(100)).toBe(100);
    });

    it('should return absolute value of negative numbers', () => {
      expect(abs(-5)).toBe(5);
      expect(abs(-100)).toBe(100);
    });

    it('should handle zero', () => {
      expect(abs(0)).toBe(0);
      expect(abs(-0)).toBe(0);
    });

    it('should handle decimal numbers', () => {
      expect(abs(-3.14)).toBe(3.14);
      expect(abs(2.718)).toBe(2.718);
    });
  });

  describe('round', () => {
    it('should round to nearest integer by default', () => {
      expect(round(1.4)).toBe(1);
      expect(round(1.5)).toBe(2);
      expect(round(1.6)).toBe(2);
      expect(round(2.5)).toBe(3);
    });

    it('should round to specified precision', () => {
      expect(round(1.234, 2)).toBe(1.23);
      expect(round(1.235, 2)).toBe(1.24);
      expect(round(1.005, 2)).toBe(1.01);
    });

    it('should handle negative precision', () => {
      expect(round(123, -1)).toBe(120);
      expect(round(156, -1)).toBe(160);
      expect(round(123, -2)).toBe(100);
    });

    it('should handle negative numbers', () => {
      expect(round(-1.4)).toBe(-1);
      expect(round(-1.5)).toBe(-1);
      expect(round(-1.6)).toBe(-2);
    });

    it('should handle zero precision', () => {
      expect(round(3.7, 0)).toBe(4);
      expect(round(3.2, 0)).toBe(3);
    });
  });

  describe('ceil', () => {
    it('should round up to nearest integer', () => {
      expect(ceil(1.1)).toBe(2);
      expect(ceil(1.9)).toBe(2);
      expect(ceil(2.0)).toBe(2);
    });

    it('should round up with precision', () => {
      expect(ceil(1.234, 2)).toBe(1.24);
      expect(ceil(1.231, 2)).toBe(1.24);
    });

    it('should handle negative numbers', () => {
      expect(ceil(-1.1)).toBe(-1);
      expect(ceil(-1.9)).toBe(-1);
    });

    it('should handle zero', () => {
      expect(ceil(0)).toBe(0);
    });
  });

  describe('floor', () => {
    it('should round down to nearest integer', () => {
      expect(floor(1.1)).toBe(1);
      expect(floor(1.9)).toBe(1);
      expect(floor(2.0)).toBe(2);
    });

    it('should round down with precision', () => {
      expect(floor(1.234, 2)).toBe(1.23);
      expect(floor(1.239, 2)).toBe(1.23);
    });

    it('should handle negative numbers', () => {
      expect(floor(-1.1)).toBe(-2);
      expect(floor(-1.9)).toBe(-2);
    });

    it('should handle zero', () => {
      expect(floor(0)).toBe(0);
    });
  });

  describe('trunc', () => {
    it('should truncate decimal part', () => {
      expect(trunc(1.9)).toBe(1);
      expect(trunc(1.1)).toBe(1);
      expect(trunc(2.0)).toBe(2);
    });

    it('should truncate with precision', () => {
      expect(trunc(1.239, 2)).toBe(1.23);
      expect(trunc(1.234, 2)).toBe(1.23);
    });

    it('should handle negative numbers', () => {
      expect(trunc(-1.1)).toBe(-1);
      expect(trunc(-1.9)).toBe(-1);
    });

    it('should handle zero', () => {
      expect(trunc(0)).toBe(0);
    });
  });

  describe('clamp', () => {
    it('should clamp value within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('should handle value at boundaries', () => {
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });

    it('should swap min and max if reversed', () => {
      expect(clamp(5, 10, 0)).toBe(5);
      expect(clamp(-5, 10, 0)).toBe(0);
      expect(clamp(15, 10, 0)).toBe(10);
    });

    it('should handle negative ranges', () => {
      expect(clamp(-5, -10, 0)).toBe(-5);
      expect(clamp(-15, -10, 0)).toBe(-10);
      expect(clamp(5, -10, 0)).toBe(0);
    });
  });

  describe('sign', () => {
    it('should return 1 for positive numbers', () => {
      expect(sign(5)).toBe(1);
      expect(sign(0.1)).toBe(1);
      expect(sign(1000)).toBe(1);
    });

    it('should return -1 for negative numbers', () => {
      expect(sign(-5)).toBe(-1);
      expect(sign(-0.1)).toBe(-1);
      expect(sign(-1000)).toBe(-1);
    });

    it('should return 0 for zero', () => {
      expect(sign(0)).toBe(0);
      expect(sign(-0)).toBe(0);
    });
  });

  describe('factorial', () => {
    it('should calculate factorial of positive integers', () => {
      expect(factorial(0)).toBe(1);
      expect(factorial(1)).toBe(1);
      expect(factorial(5)).toBe(120);
      expect(factorial(6)).toBe(720);
      expect(factorial(10)).toBe(3628800);
    });

    it('should throw error for negative numbers', () => {
      expect(() => factorial(-1)).toThrow(
        'Factorial is only defined for non-negative integers'
      );
      expect(() => factorial(-5)).toThrow();
    });

    it('should throw error for non-integers', () => {
      expect(() => factorial(1.5)).toThrow(
        'Factorial is only defined for non-negative integers'
      );
      expect(() => factorial(3.7)).toThrow();
    });
  });

  describe('gcd', () => {
    it('should calculate greatest common divisor', () => {
      expect(gcd(12, 8)).toBe(4);
      expect(gcd(15, 25)).toBe(5);
      expect(gcd(100, 50)).toBe(50);
    });

    it('should handle when one number is zero', () => {
      expect(gcd(5, 0)).toBe(5);
      expect(gcd(0, 5)).toBe(5);
    });

    it('should handle negative numbers', () => {
      expect(gcd(-12, 8)).toBe(4);
      expect(gcd(12, -8)).toBe(4);
      expect(gcd(-12, -8)).toBe(4);
    });

    it('should return 1 for coprime numbers', () => {
      expect(gcd(7, 11)).toBe(1);
      expect(gcd(13, 17)).toBe(1);
    });
  });

  describe('lcm', () => {
    it('should calculate least common multiple', () => {
      expect(lcm(4, 6)).toBe(12);
      expect(lcm(15, 25)).toBe(75);
      expect(lcm(12, 8)).toBe(24);
    });

    it('should handle when numbers are multiples', () => {
      expect(lcm(5, 10)).toBe(10);
      expect(lcm(3, 9)).toBe(9);
    });

    it('should handle negative numbers', () => {
      expect(lcm(-4, 6)).toBe(12);
      expect(lcm(4, -6)).toBe(12);
      expect(lcm(-4, -6)).toBe(12);
    });

    it('should handle coprime numbers', () => {
      expect(lcm(7, 11)).toBe(77);
      expect(lcm(13, 17)).toBe(221);
    });
  });

  describe('lerp', () => {
    it('should interpolate between two values', () => {
      expect(lerp(0, 10, 0)).toBe(0);
      expect(lerp(0, 10, 1)).toBe(10);
      expect(lerp(0, 10, 0.5)).toBe(5);
      expect(lerp(0, 100, 0.25)).toBe(25);
    });

    it('should clamp t to [0, 1]', () => {
      expect(lerp(0, 10, -0.5)).toBe(0);
      expect(lerp(0, 10, 1.5)).toBe(10);
    });

    it('should handle negative values', () => {
      expect(lerp(-10, 10, 0.5)).toBe(0);
      expect(lerp(-5, 5, 0.25)).toBe(-2.5);
    });

    it('should work with same start and end', () => {
      expect(lerp(5, 5, 0.5)).toBe(5);
    });
  });

  describe('invLerp', () => {
    it('should calculate interpolation factor', () => {
      expect(invLerp(0, 10, 5)).toBe(0.5);
      expect(invLerp(0, 100, 25)).toBe(0.25);
      expect(invLerp(0, 10, 0)).toBe(0);
      expect(invLerp(0, 10, 10)).toBe(1);
    });

    it('should clamp result to [0, 1]', () => {
      expect(invLerp(0, 10, -5)).toBe(0);
      expect(invLerp(0, 10, 15)).toBe(1);
    });

    it('should handle negative ranges', () => {
      expect(invLerp(-10, 10, 0)).toBe(0.5);
      expect(invLerp(-5, 5, -2.5)).toBe(0.25);
    });
  });

  describe('mapRange', () => {
    it('should map value from one range to another', () => {
      expect(mapRange(5, 0, 10, 0, 100)).toBe(50);
      expect(mapRange(2, 0, 10, 0, 1)).toBe(0.2);
      expect(mapRange(0, 0, 10, 100, 200)).toBe(100);
      expect(mapRange(10, 0, 10, 100, 200)).toBe(200);
    });

    it('should handle negative ranges', () => {
      expect(mapRange(0, -10, 10, 0, 100)).toBe(50);
      expect(mapRange(-5, -10, 10, 0, 100)).toBe(25);
    });

    it('should handle reversed output range', () => {
      expect(mapRange(5, 0, 10, 100, 0)).toBe(50);
      expect(mapRange(0, 0, 10, 100, 0)).toBe(100);
      expect(mapRange(10, 0, 10, 100, 0)).toBe(0);
    });
  });

  describe('min', () => {
    it('should return minimum of multiple numbers', () => {
      expect(min(1, 2, 3)).toBe(1);
      expect(min(5, 2, 8, 1, 9)).toBe(1);
      expect(min(-5, -2, -8)).toBe(-8);
    });

    it('should handle single number', () => {
      expect(min(42)).toBe(42);
    });

    it('should handle negative numbers', () => {
      expect(min(-1, -2, -3)).toBe(-3);
      expect(min(-10, 5, -20)).toBe(-20);
    });
  });

  describe('max', () => {
    it('should return maximum of multiple numbers', () => {
      expect(max(1, 2, 3)).toBe(3);
      expect(max(5, 2, 8, 1, 9)).toBe(9);
      expect(max(-5, -2, -8)).toBe(-2);
    });

    it('should handle single number', () => {
      expect(max(42)).toBe(42);
    });

    it('should handle negative numbers', () => {
      expect(max(-1, -2, -3)).toBe(-1);
      expect(max(-10, 5, -20)).toBe(5);
    });
  });

  describe('average', () => {
    it('should calculate average of numbers', () => {
      expect(average(1, 2, 3)).toBe(2);
      expect(average(10, 20, 30)).toBe(20);
      expect(average(5, 5, 5)).toBe(5);
    });

    it('should handle single number', () => {
      expect(average(42)).toBe(42);
    });

    it('should handle negative numbers', () => {
      expect(average(-10, 0, 10)).toBe(0);
      expect(average(-5, -10, -15)).toBe(-10);
    });

    it('should filter out non-finite numbers', () => {
      expect(average(1, 2, NaN, 3)).toBe(2);
      expect(average(1, Infinity, 3)).toBe(2);
    });

    it('should return 0 for empty array', () => {
      expect(average()).toBe(0);
    });
  });

  describe('sum', () => {
    it('should calculate sum of numbers', () => {
      expect(sum(1, 2, 3)).toBe(6);
      expect(sum(10, 20, 30)).toBe(60);
      expect(sum(5, 5, 5)).toBe(15);
    });

    it('should handle single number', () => {
      expect(sum(42)).toBe(42);
    });

    it('should handle negative numbers', () => {
      expect(sum(-10, 0, 10)).toBe(0);
      expect(sum(-5, -10, -15)).toBe(-30);
    });

    it('should filter out non-finite numbers', () => {
      expect(sum(1, 2, NaN, 3)).toBe(6);
      expect(sum(1, Infinity, 3)).toBe(4);
    });

    it('should return 0 for empty array', () => {
      expect(sum()).toBe(0);
    });
  });

  describe('median', () => {
    it('should calculate median of odd-length array', () => {
      expect(median(1, 3, 5)).toBe(3);
      expect(median(5, 1, 3)).toBe(3);
      expect(median(10, 20, 30, 40, 50)).toBe(30);
    });

    it('should calculate median of even-length array', () => {
      expect(median(1, 2, 3, 4)).toBe(2.5);
      expect(median(10, 20, 30, 40)).toBe(25);
    });

    it('should handle single number', () => {
      expect(median(42)).toBe(42);
    });

    it('should handle negative numbers', () => {
      expect(median(-10, 0, 10)).toBe(0);
      expect(median(-5, -10, -15)).toBe(-10);
    });

    it('should filter out non-finite numbers', () => {
      expect(median(1, 2, NaN, 3, 4)).toBe(2.5);
    });

    it('should return 0 for empty array', () => {
      expect(median()).toBe(0);
    });

    it('should handle unsorted input', () => {
      expect(median(5, 1, 9, 3, 7)).toBe(5);
      expect(median(100, 10, 50, 25)).toBe(37.5);
    });
  });

  describe('product', () => {
    it('should calculate product of numbers', () => {
      expect(product(2, 3, 4)).toBe(24);
      expect(product(5, 5, 5)).toBe(125);
      expect(product(1, 2, 3, 4, 5)).toBe(120);
    });

    it('should handle single number', () => {
      expect(product(42)).toBe(42);
    });

    it('should handle negative numbers', () => {
      expect(product(-2, 3)).toBe(-6);
      expect(product(-2, -3)).toBe(6);
      expect(product(-1, -1, -1)).toBe(-1);
    });

    it('should return 1 for empty array', () => {
      expect(product()).toBe(1);
    });

    it('should handle zero', () => {
      expect(product(1, 2, 0, 4)).toBe(0);
      expect(product(0)).toBe(0);
    });
  });
});
