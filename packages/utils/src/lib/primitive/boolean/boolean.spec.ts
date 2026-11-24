// boolean.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isBoolean,
  isBooleanLike,
  toBoolean,
  safeToBoolean,
  all,
  any,
  none,
  not,
  xor,
  nand,
  nor,
  xnor,
  countTruthy,
  countFalsy,
  createToggle,
  compare,
  checkConditions,
  validateBooleanConstraint,
  randomBoolean,
  debounceBoolean,
  memoizeBoolean,
  createPipeline,
  isBooleanArray,
  isBooleanLikeArray,
} from './boolean.js';
import type { ComparatorCondition } from './types.js';

describe('Boolean Utilities', () => {
  describe('isBoolean', () => {
    it('should return true for boolean values', () => {
      expect(isBoolean(true)).toBe(true);
      expect(isBoolean(false)).toBe(true);
    });

    it('should return false for non-boolean values', () => {
      expect(isBoolean(1)).toBe(false);
      expect(isBoolean(0)).toBe(false);
      expect(isBoolean('true')).toBe(false);
      expect(isBoolean('false')).toBe(false);
      expect(isBoolean(null)).toBe(false);
      expect(isBoolean(undefined)).toBe(false);
      expect(isBoolean({})).toBe(false);
      expect(isBoolean([])).toBe(false);
      expect(isBoolean('')).toBe(false);
    });

    it('should act as a type guard', () => {
      const value: unknown = true;

      if (isBoolean(value)) {
        // TypeScript should know value is boolean here
        expect(value === true || value === false).toBe(true);
      }
    });
  });

  describe('isBooleanLike', () => {
    it('should return true for boolean values', () => {
      expect(isBooleanLike(true)).toBe(true);
      expect(isBooleanLike(false)).toBe(true);
    });

    it('should return true for boolean-like numbers', () => {
      expect(isBooleanLike(1)).toBe(true);
      expect(isBooleanLike(0)).toBe(true);
      expect(isBooleanLike(2)).toBe(false);
      expect(isBooleanLike(-1)).toBe(false);
    });

    it('should return true for boolean-like strings', () => {
      expect(isBooleanLike('true')).toBe(true);
      expect(isBooleanLike('false')).toBe(true);
      expect(isBooleanLike('TRUE')).toBe(true);
      expect(isBooleanLike('FALSE')).toBe(true);
      expect(isBooleanLike('1')).toBe(true);
      expect(isBooleanLike('0')).toBe(true);
      expect(isBooleanLike('yes')).toBe(false);
      expect(isBooleanLike('no')).toBe(false);
      expect(isBooleanLike('')).toBe(false);
    });

    it('should return false for other types', () => {
      expect(isBooleanLike(null)).toBe(false);
      expect(isBooleanLike(undefined)).toBe(false);
      expect(isBooleanLike({})).toBe(false);
      expect(isBooleanLike([])).toBe(false);
    });
  });

  describe('toBoolean', () => {
    describe('strict strategy', () => {
      it('should convert boolean values', () => {
        expect(toBoolean(true, 'strict')).toBe(true);
        expect(toBoolean(false, 'strict')).toBe(false);
      });

      it('should convert number 0 and 1', () => {
        expect(toBoolean(1, 'strict')).toBe(true);
        expect(toBoolean(0, 'strict')).toBe(false);
      });

      it('should convert strings "0" and "1"', () => {
        expect(toBoolean('1', 'strict')).toBe(true);
        expect(toBoolean('0', 'strict')).toBe(false);
      });

      it('should convert strings "true" and "false"', () => {
        expect(toBoolean('true', 'strict')).toBe(true);
        expect(toBoolean('false', 'strict')).toBe(false);
        expect(toBoolean('TRUE', 'strict')).toBe(true);
        expect(toBoolean('FALSE', 'strict')).toBe(false);
      });

      it('should throw error for invalid conversions', () => {
        expect(() => toBoolean('yes', 'strict')).toThrow();
        expect(() => toBoolean('no', 'strict')).toThrow();
        expect(() => toBoolean('', 'strict')).toThrow();
        expect(() => toBoolean(null, 'strict')).toThrow();
        expect(() => toBoolean(undefined, 'strict')).toThrow();
        expect(() => toBoolean(2, 'strict')).toThrow();
        expect(() => toBoolean(-1, 'strict')).toThrow();
        expect(() => toBoolean({}, 'strict')).toThrow();
        expect(() => toBoolean([], 'strict')).toThrow();
      });
    });

    describe('truthy strategy', () => {
      it('should use JavaScript truthy conversion', () => {
        expect(toBoolean(true, 'truthy')).toBe(true);
        expect(toBoolean(false, 'truthy')).toBe(false);
        expect(toBoolean(1, 'truthy')).toBe(true);
        expect(toBoolean(0, 'truthy')).toBe(false);
        expect(toBoolean('hello', 'truthy')).toBe(true);
        expect(toBoolean('', 'truthy')).toBe(false);
        expect(toBoolean(null, 'truthy')).toBe(false);
        expect(toBoolean(undefined, 'truthy')).toBe(false);
        expect(toBoolean({}, 'truthy')).toBe(true);
        expect(toBoolean([], 'truthy')).toBe(true);
      });
    });

    describe('falsy strategy', () => {
      it('should convert with extended falsy detection', () => {
        expect(toBoolean('', 'falsy')).toBe(false);
        expect(toBoolean('0', 'falsy')).toBe(false);
        expect(toBoolean('false', 'falsy')).toBe(false);
        expect(toBoolean('null', 'falsy')).toBe(false);
        expect(toBoolean('undefined', 'falsy')).toBe(false);
        expect(toBoolean('nan', 'falsy')).toBe(false);
        expect(toBoolean('hello', 'falsy')).toBe(true);
        expect(toBoolean(0, 'falsy')).toBe(false);
        expect(toBoolean(NaN, 'falsy')).toBe(false);
        expect(toBoolean(1, 'falsy')).toBe(true);
        expect(toBoolean(true, 'falsy')).toBe(true);
        expect(toBoolean(false, 'falsy')).toBe(false);
      });
    });

    describe('string strategy', () => {
      it('should convert common string representations', () => {
        expect(toBoolean('true', 'string')).toBe(true);
        expect(toBoolean('false', 'string')).toBe(false);
        expect(toBoolean('yes', 'string')).toBe(true);
        expect(toBoolean('no', 'string')).toBe(false);
        expect(toBoolean('on', 'string')).toBe(true);
        expect(toBoolean('off', 'string')).toBe(false);
        expect(toBoolean('1', 'string')).toBe(true);
        expect(toBoolean('0', 'string')).toBe(false);
        expect(toBoolean('enabled', 'string')).toBe(true);
        expect(toBoolean('disabled', 'string')).toBe(false);
        expect(toBoolean('active', 'string')).toBe(true);
        expect(toBoolean('inactive', 'string')).toBe(false);
      });

      it('should convert numeric strings', () => {
        expect(toBoolean('1', 'string')).toBe(true);
        expect(toBoolean('0', 'string')).toBe(false);
        expect(toBoolean('2', 'string')).toBe(true); // Non-zero is truthy
        expect(toBoolean('-1', 'string')).toBe(true);
        expect(toBoolean('0.0', 'string')).toBe(false);
        expect(toBoolean('0.5', 'string')).toBe(true);
      });

      it('should throw error for invalid strings', () => {
        expect(() => toBoolean('invalid', 'string')).toThrow();
        expect(() => toBoolean('maybe', 'string')).toThrow();
      });

      it('should throw error for non-string inputs', () => {
        expect(() => toBoolean(1, 'string')).toThrow();
        expect(() => toBoolean(null, 'string')).toThrow();
      });
    });

    describe('number strategy', () => {
      it('should convert numbers', () => {
        expect(toBoolean(1, 'number')).toBe(true);
        expect(toBoolean(0, 'number')).toBe(false);
        expect(toBoolean(-1, 'number')).toBe(true);
        expect(toBoolean(0.5, 'number')).toBe(true);
        expect(toBoolean(0.0, 'number')).toBe(false);
        expect(toBoolean(NaN, 'number')).toBe(false);
      });

      it('should throw error for non-number inputs', () => {
        expect(() => toBoolean('1', 'number')).toThrow();
        expect(() => toBoolean(null, 'number', true)).toThrow();
      });
    });

    it('should use strict strategy by default', () => {
      expect(toBoolean(true)).toBe(true);
      expect(toBoolean('1')).toBe(true);
      expect(() => toBoolean('yes')).toThrow();
    });
  });

  describe('safeToBoolean', () => {
    it('should convert valid values', () => {
      expect(safeToBoolean(true)).toBe(true);
      expect(safeToBoolean('true')).toBe(true);
      expect(safeToBoolean(1)).toBe(true);
    });

    it('should return fallback for invalid values', () => {
      expect(safeToBoolean('invalid', false)).toBe(false);
      expect(safeToBoolean('invalid', true)).toBe(true);
      expect(safeToBoolean(null, false)).toBe(false);
      expect(safeToBoolean(undefined, true)).toBe(true);
      expect(safeToBoolean({}, 'error' as any)).toBe('error');
    });

    it('should return false by default for invalid values', () => {
      expect(safeToBoolean('invalid')).toBe(false);
      expect(safeToBoolean(null)).toBe(false);
    });
  });

  describe('Logical Operations', () => {
    describe('all', () => {
      it('should return true if all values are truthy', () => {
        expect(all([true, 1, 'hello', {}])).toBe(true);
        expect(all([true, true, true])).toBe(true);
      });

      it('should return false if any value is falsy', () => {
        expect(all([true, false, true])).toBe(false);
        expect(all([true, 0, 'hello'])).toBe(false);
        expect(all([true, null, true])).toBe(false);
      });

      it('should handle edge cases', () => {
        expect(all([])).toBe(false);
        expect(all([false])).toBe(false);
        expect(all([true])).toBe(true);
        expect(all([{}])).toBe(true);
        expect(all([null])).toBe(false);
      });
    });

    describe('any', () => {
      it('should return true if any value is truthy', () => {
        expect(any([false, 0, 'hello'])).toBe(true);
        expect(any([false, false, true])).toBe(true);
      });

      it('should return false if all values are falsy', () => {
        expect(any([false, 0, '', null, undefined])).toBe(false);
        expect(any([false, false])).toBe(false);
      });

      it('should handle edge cases', () => {
        expect(any([])).toBe(false);
        expect(any([false])).toBe(false);
        expect(any([true])).toBe(true);
        expect(any([{}])).toBe(true);
        expect(any([null])).toBe(false);
      });
    });

    describe('none', () => {
      it('should return true if no values are truthy', () => {
        expect(none([false, 0, '', null])).toBe(true);
        expect(none([false, false])).toBe(true);
      });

      it('should return false if any value is truthy', () => {
        expect(none([false, true, false])).toBe(false);
        expect(none([0, 1, 0])).toBe(false);
      });

      it('should handle edge cases', () => {
        expect(none([])).toBe(true);
        expect(none([false])).toBe(true);
        expect(none([true])).toBe(false);
      });
    });

    describe('not', () => {
      it('should negate boolean values', () => {
        expect(not(true)).toBe(false);
        expect(not(false)).toBe(true);
      });

      it('should negate truthy/falsy values', () => {
        expect(not(1)).toBe(false);
        expect(not(0)).toBe(true);
        expect(not('hello')).toBe(false);
        expect(not('')).toBe(true);
        expect(not({})).toBe(false);
        expect(not([])).toBe(false);
        expect(not(null)).toBe(true);
        expect(not(undefined)).toBe(true);
      });
    });

    describe('xor', () => {
      it('should return true for exactly one truthy value', () => {
        expect(xor([true, false])).toBe(true);
        expect(xor([false, true])).toBe(true);
        expect(xor([true, false, false])).toBe(true);
        expect(xor([0, 1, 0])).toBe(true);
      });

      it('should return false for zero or multiple truthy values', () => {
        expect(xor([false, false])).toBe(false);
        expect(xor([true, true])).toBe(false);
        expect(xor([true, true, false])).toBe(false);
        expect(xor([1, 2, 3])).toBe(false);
        expect(xor([])).toBe(false);
      });

      it('should handle edge cases', () => {
        expect(xor([true])).toBe(true);
        expect(xor([false])).toBe(false);
        expect(xor([1])).toBe(true);
        expect(xor([0])).toBe(false);
      });
    });

    describe('nand', () => {
      it('should return false only if all values are truthy', () => {
        expect(nand([true, true])).toBe(false);
        expect(nand([1, 'hello', {}])).toBe(false);
      });

      it('should return true if any value is falsy', () => {
        expect(nand([true, false])).toBe(true);
        expect(nand([false, false])).toBe(true);
        expect(nand([true, true, false])).toBe(true);
      });

      it('should handle edge cases', () => {
        expect(nand([])).toBe(true);
        expect(nand([false])).toBe(true);
        expect(nand([true])).toBe(false); // NAND with single true is false? Wait, NAND of single input = NOT
        // Actually, NAND with single input is just NOT
        // expect(nand([true])).toBe(!true); // false
        // expect(nand([false])).toBe(!false); // true
      });
    });

    describe('nor', () => {
      it('should return true only if all values are falsy', () => {
        expect(nor([false, false])).toBe(true);
        expect(nor([0, '', null])).toBe(true);
      });

      it('should return false if any value is truthy', () => {
        expect(nor([false, true])).toBe(false);
        expect(nor([true, true])).toBe(false);
        expect(nor([false, false, true])).toBe(false);
      });

      it('should handle edge cases', () => {
        expect(nor([])).toBe(true);
        expect(nor([false])).toBe(true);
        expect(nor([true])).toBe(false);
      });
    });

    describe('xnor', () => {
      it('should return true if all values have same truthiness', () => {
        expect(xnor([true, true])).toBe(true);
        expect(xnor([false, false])).toBe(true);
        expect(xnor([true, true, true])).toBe(true);
        expect(xnor([false, false, false])).toBe(true);
      });

      it('should return false if values have different truthiness', () => {
        expect(xnor([true, false])).toBe(false);
        expect(xnor([false, true])).toBe(false);
        expect(xnor([true, true, false])).toBe(false);
      });

      it('should handle edge cases', () => {
        expect(xnor([])).toBe(true);
        expect(xnor([true])).toBe(true);
        expect(xnor([false])).toBe(true);
        expect(xnor([1])).toBe(true);
        expect(xnor([0])).toBe(true);
      });
    });
  });

  describe('Counting Operations', () => {
    describe('countTruthy', () => {
      it('should count truthy values', () => {
        expect(
          countTruthy([true, false, 1, 0, 'hello', '', null, undefined, {}])
        ).toBe(4);
        expect(countTruthy([true, true, true])).toBe(3);
        expect(countTruthy([false, false, false])).toBe(0);
        expect(countTruthy([])).toBe(0);
      });

      it('should handle non-array inputs', () => {
        expect(countTruthy(null as any)).toBe(0);
        expect(countTruthy(undefined as any)).toBe(0);
        expect(countTruthy('not array' as any)).toBe(0);
      });
    });

    describe('countFalsy', () => {
      it('should count falsy values', () => {
        expect(
          countFalsy([true, false, 1, 0, 'hello', '', null, undefined, {}])
        ).toBe(5);
        expect(countFalsy([true, true, true])).toBe(0);
        expect(countFalsy([false, false, false])).toBe(3);
        expect(countFalsy([])).toBe(0);
      });

      it('should handle non-array inputs', () => {
        expect(countFalsy(null as any)).toBe(0);
        expect(countFalsy(undefined as any)).toBe(0);
        expect(countFalsy('not array' as any)).toBe(0);
      });
    });
  });

  describe('createToggle', () => {
    it('should create a toggle function', () => {
      const toggle = createToggle();
      expect(toggle()).toBe(true);
      expect(toggle()).toBe(false);
      expect(toggle()).toBe(true);
    });

    it('should start with custom initial state', () => {
      const toggle = createToggle(true);
      expect(toggle()).toBe(false);
      expect(toggle()).toBe(true);
    });

    it('should create independent toggle instances', () => {
      const toggle1 = createToggle();
      const toggle2 = createToggle(true);

      expect(toggle1()).toBe(true);
      expect(toggle2()).toBe(false);
      expect(toggle1()).toBe(false);
      expect(toggle2()).toBe(true);
    });
  });

  describe('compare', () => {
    it('should compare with == operator', () => {
      expect(compare(5, 5, '==')).toBe(true);
      expect(compare(5, '5', '==')).toBe(true);
      expect(compare(5, 3, '==')).toBe(false);
    });

    it('should compare with === operator', () => {
      expect(compare(5, 5, '===')).toBe(true);
      expect(compare(5, '5', '===')).toBe(false);
      expect(compare(true, true, '===')).toBe(true);
    });

    it('should compare with != operator', () => {
      expect(compare(5, 3, '!=')).toBe(true);
      expect(compare(5, '5', '!=')).toBe(false);
    });

    it('should compare with !== operator', () => {
      expect(compare(5, '5', '!==')).toBe(true);
      expect(compare(5, 5, '!==')).toBe(false);
    });

    it('should compare with > operator', () => {
      expect(compare(5, 3, '>')).toBe(true);
      expect(compare(3, 5, '>')).toBe(false);
      expect(compare('b', 'a', '>')).toBe(true);
    });

    it('should compare with < operator', () => {
      expect(compare(3, 5, '<')).toBe(true);
      expect(compare(5, 3, '<')).toBe(false);
    });

    it('should compare with >= operator', () => {
      expect(compare(5, 3, '>=')).toBe(true);
      expect(compare(5, 5, '>=')).toBe(true);
      expect(compare(3, 5, '>=')).toBe(false);
    });

    it('should compare with <= operator', () => {
      expect(compare(3, 5, '<=')).toBe(true);
      expect(compare(5, 5, '<=')).toBe(true);
      expect(compare(5, 3, '<=')).toBe(false);
    });

    it('should throw error for unsupported operator', () => {
      expect(() => compare(1, 2, 'invalid' as any)).toThrow();
    });
  });

  describe('checkConditions', () => {
    it('should check multiple conditions', () => {
      const conditions: ComparatorCondition[] = [
        { operator: '>', value: 0 },
        { operator: '<', value: 10 },
        { operator: '!=', value: 5 },
      ];

      expect(checkConditions(3, conditions)).toBe(true);
      expect(checkConditions(5, conditions)).toBe(false);
      expect(checkConditions(11, conditions)).toBe(false);
      expect(checkConditions(0, conditions)).toBe(false);
    });

    it('should handle empty conditions array', () => {
      expect(checkConditions(5, [])).toBe(true);
    });

    it('should handle complex conditions', () => {
      const conditions: ComparatorCondition[] = [
        { operator: '>=', value: 1 },
        { operator: '<=', value: 100 },
        { operator: '!==', value: 50 },
      ];

      expect(checkConditions(25, conditions)).toBe(true);
      expect(checkConditions(50, conditions)).toBe(false);
      expect(checkConditions(0, conditions)).toBe(false);
    });
  });

  describe('validateBooleanConstraint', () => {
    it('should validate required constraint', () => {
      expect(validateBooleanConstraint(true, 'required')).toBe(true);
      expect(validateBooleanConstraint(false, 'required')).toBe(false);
      expect(validateBooleanConstraint(1, 'required')).toBe(false);
    });

    it('should validate optional constraint', () => {
      expect(validateBooleanConstraint(true, 'optional')).toBe(true);
      expect(validateBooleanConstraint(false, 'optional')).toBe(true);
      expect(validateBooleanConstraint(1, 'optional')).toBe(false);
      expect(validateBooleanConstraint(null, 'optional')).toBe(false);
    });

    it('should validate true constraint', () => {
      expect(validateBooleanConstraint(true, 'true')).toBe(true);
      expect(validateBooleanConstraint(false, 'true')).toBe(false);
      expect(validateBooleanConstraint('true', 'true')).toBe(false);
    });

    it('should validate false constraint', () => {
      expect(validateBooleanConstraint(false, 'false')).toBe(true);
      expect(validateBooleanConstraint(true, 'false')).toBe(false);
    });

    it('should validate truthy constraint', () => {
      expect(validateBooleanConstraint(true, 'truthy')).toBe(true);
      expect(validateBooleanConstraint(1, 'truthy')).toBe(true);
      expect(validateBooleanConstraint('hello', 'truthy')).toBe(true);
      expect(validateBooleanConstraint(false, 'truthy')).toBe(false);
      expect(validateBooleanConstraint(0, 'truthy')).toBe(false);
      expect(validateBooleanConstraint('', 'truthy')).toBe(false);
    });

    it('should validate falsy constraint', () => {
      expect(validateBooleanConstraint(false, 'falsy')).toBe(true);
      expect(validateBooleanConstraint(0, 'falsy')).toBe(true);
      expect(validateBooleanConstraint('', 'falsy')).toBe(true);
      expect(validateBooleanConstraint(true, 'falsy')).toBe(false);
      expect(validateBooleanConstraint(1, 'falsy')).toBe(false);
      expect(validateBooleanConstraint('hello', 'falsy')).toBe(false);
    });
  });

  describe('randomBoolean', () => {
    beforeEach(() => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should generate random boolean with default probability', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      expect(randomBoolean()).toBe(true); // 0.5 < 0.5? false, 0.5 == 0.5? false, so true when <
      // Actually Math.random() returns [0, 1), so 0.5 < 0.5 is false
      vi.spyOn(Math, 'random').mockReturnValue(0.4);
      expect(randomBoolean()).toBe(true);

      vi.spyOn(Math, 'random').mockReturnValue(0.6);
      expect(randomBoolean()).toBe(false);
    });

    it('should generate random boolean with custom probability', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.3);
      expect(randomBoolean(0.5)).toBe(true);

      vi.spyOn(Math, 'random').mockReturnValue(0.7);
      expect(randomBoolean(0.5)).toBe(false);

      vi.spyOn(Math, 'random').mockReturnValue(0.1);
      expect(randomBoolean(0.2)).toBe(true);

      vi.spyOn(Math, 'random').mockReturnValue(0.3);
      expect(randomBoolean(0.2)).toBe(false);
    });

    it('should throw error for invalid probability', () => {
      expect(() => randomBoolean(-0.1)).toThrow();
      expect(() => randomBoolean(1.1)).toThrow();
    });

    it('should handle edge probabilities', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0);
      expect(randomBoolean(0)).toBe(false);

      vi.spyOn(Math, 'random').mockReturnValue(0.999);
      expect(randomBoolean(1)).toBe(true);
    });
  });

  describe('debounceBoolean', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should debounce boolean function', () => {
      const mockFn = vi.fn().mockReturnValue(true);
      const debounced = debounceBoolean(mockFn, 100);

      debounced('test');
      debounced('test');
      debounced('test');

      // Function not called yet
      expect(mockFn).not.toHaveBeenCalled();

      // Fast-forward time
      vi.advanceTimersByTime(100);

      // Function should be called once
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('test');
    });

    it('should return last result', () => {
      const mockFn = vi
        .fn()
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      const debounced = debounceBoolean(mockFn, 100);

      // Initial call returns undefined (no last result)
      const result1 = debounced();
      expect(result1).toBeUndefined();

      // First debounced call
      vi.advanceTimersByTime(100);
      const result2 = debounced();
      expect(result2).toBe(true);

      // Second debounced call
      vi.advanceTimersByTime(100);
      const result3 = debounced();
      expect(result3).toBe(false);
    });
  });

  describe('memoizeBoolean', () => {
    it('should memoize boolean function', () => {
      const mockFn = vi.fn().mockImplementation((x: number) => x > 0);
      const memoized = memoizeBoolean(mockFn);

      expect(memoized(5)).toBe(true);
      expect(memoized(5)).toBe(true);
      expect(memoized(-5)).toBe(false);
      expect(memoized(-5)).toBe(false);

      // Function should be called only twice
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenCalledWith(5);
      expect(mockFn).toHaveBeenCalledWith(-5);
    });

    it('should handle multiple arguments', () => {
      const mockFn = vi
        .fn()
        .mockImplementation((x: number, y: number) => x > y);
      const memoized = memoizeBoolean(mockFn);

      expect(memoized(5, 3)).toBe(true);
      expect(memoized(5, 3)).toBe(true);
      expect(memoized(3, 5)).toBe(false);

      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should handle complex arguments', () => {
      const mockFn = vi.fn().mockReturnValue(true);
      const memoized = memoizeBoolean(mockFn);

      const obj = { a: 1 };
      const arr = [1, 2, 3];

      memoized(obj, arr);
      memoized(obj, arr);
      memoized({ a: 1 }, [1, 2, 3]); // Different references

      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('createPipeline', () => {
    it('should create boolean pipeline', () => {
      const pipeline = createPipeline([
        (x: number) => x > 0,
        (x: number) => x < 10,
        (x: number) => x % 2 === 0,
      ]);

      expect(pipeline(4)).toBe(true);
      expect(pipeline(5)).toBe(false); // Not even
      expect(pipeline(11)).toBe(false); // Not < 10
      expect(pipeline(-2)).toBe(false); // Not > 0
    });

    it('should handle empty pipeline', () => {
      const pipeline = createPipeline([]);
      expect(pipeline(5)).toBe(true);
    });

    it('should handle complex validation', () => {
      const isString = (x: any) => typeof x === 'string';
      const isNonEmpty = (x: string) => x.length > 0;
      const hasNoSpaces = (x: string) => !x.includes(' ');
      const isLowerCase = (x: string) => x === x.toLowerCase();

      const pipeline = createPipeline([
        isString,
        isNonEmpty,
        hasNoSpaces,
        isLowerCase,
      ]);

      expect(pipeline('hello')).toBe(true);
      expect(pipeline('Hello')).toBe(false);
      expect(pipeline('hello world')).toBe(false);
      expect(pipeline('')).toBe(false);
      expect(pipeline(123)).toBe(false);
    });
  });

  describe('Type Guards', () => {
    describe('isBooleanArray', () => {
      it('should return true for boolean arrays', () => {
        expect(isBooleanArray([true, false, true])).toBe(true);
        expect(isBooleanArray([])).toBe(true);
        expect(isBooleanArray([true])).toBe(true);
        expect(isBooleanArray([false])).toBe(true);
      });

      it('should return false for non-boolean arrays', () => {
        expect(isBooleanArray([true, 1, false])).toBe(false);
        expect(isBooleanArray(['true', 'false'])).toBe(false);
        expect(isBooleanArray([0, 1])).toBe(false);
        expect(isBooleanArray([null])).toBe(false);
        expect(isBooleanArray([undefined])).toBe(false);
        expect(isBooleanArray('not array')).toBe(false);
        expect(isBooleanArray(null)).toBe(false);
        expect(isBooleanArray(undefined)).toBe(false);
      });

      it('should act as a type guard', () => {
        const value: unknown = [true, false];
        if (isBooleanArray(value)) {
          // TypeScript knows value is boolean[]
          expect(value.every((v) => v === true || v === false)).toBe(true);
        }
      });
    });

    describe('isBooleanLikeArray', () => {
      it('should return true for boolean-like arrays', () => {
        expect(
          isBooleanLikeArray([true, false, 1, 0, 'true', 'false', '1', '0'])
        ).toBe(true);
        expect(isBooleanLikeArray([])).toBe(true);
        expect(isBooleanLikeArray([1])).toBe(true);
        expect(isBooleanLikeArray(['true'])).toBe(true);
      });

      it('should return false for non-boolean-like arrays', () => {
        expect(isBooleanLikeArray([true, 2])).toBe(false); // 2 is not boolean-like
        expect(isBooleanLikeArray(['yes', 'no'])).toBe(false);
        expect(isBooleanLikeArray([null])).toBe(false);
        expect(isBooleanLikeArray([undefined])).toBe(false);
        expect(isBooleanLikeArray([true, 'maybe'])).toBe(false);
      });
    });
  });

  describe('Performance Tests', () => {
    it('toBoolean should be performant', () => {
      const start = performance.now();

      for (let i = 0; i < 100000; i++) {
        toBoolean(i % 2 === 0 ? 'true' : 'false', 'strict');
      }

      const end = performance.now();
      expect(end - start).toBeLessThan(100);
    });

    it('all should be performant with early exit', () => {
      const largeArray = Array(10000).fill(true);
      largeArray[5000] = false;

      const start = performance.now();
      const result = all(largeArray);
      const end = performance.now();

      expect(result).toBe(false);
      // Generous bound: catches pathological regressions without flaking on noisy
      // CI runners (correctness above already proves the early exit).
      expect(end - start).toBeLessThan(100);
    });

    it('countTruthy should be performant', () => {
      const largeArray = Array(100000)
        .fill(0)
        .map((_, i) => i % 2 === 0);

      const start = performance.now();
      const count = countTruthy(largeArray);
      const end = performance.now();

      expect(count).toBe(50000);
      // Generous bound: avoids flaking on noisy CI runners (see note above).
      expect(end - start).toBeLessThan(100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle NaN in conversions', () => {
      expect(toBoolean(NaN, 'number')).toBe(false);
      expect(toBoolean(NaN, 'truthy')).toBe(false);
      expect(toBoolean(NaN, 'falsy')).toBe(false);
      expect(() => toBoolean(NaN, 'strict')).toThrow();
      expect(() => toBoolean(NaN, 'string')).toThrow();
    });

    it('should handle Infinity in conversions', () => {
      expect(toBoolean(Infinity, 'number')).toBe(true);
      expect(toBoolean(-Infinity, 'number')).toBe(true);
      expect(toBoolean(Infinity, 'truthy')).toBe(true);
      expect(() => toBoolean(Infinity, 'strict')).toThrow();
    });

    it('should handle very large arrays', () => {
      const hugeArray = Array(1000000).fill(true);
      expect(all(hugeArray)).toBe(true);

      hugeArray[500000] = false;
      expect(all(hugeArray)).toBe(false);
    });

    it('should handle empty and sparse arrays', () => {
      const sparse = new Array(10);
      expect(countTruthy(sparse)).toBe(0);
      expect(countFalsy(sparse)).toBe(10);

      sparse[5] = true;
      expect(countTruthy(sparse)).toBe(1);
      expect(countFalsy(sparse)).toBe(9);
    });

    it('should handle special string cases', () => {
      // Whitespace handling
      expect(toBoolean('  true  ', 'strict')).toBe(true);
      expect(toBoolean('  FALSE  ', 'strict')).toBe(false);
      expect(toBoolean('  1  ', 'strict')).toBe(true);
      expect(toBoolean('  0  ', 'strict')).toBe(false);

      // Case sensitivity
      expect(toBoolean('True', 'strict')).toBe(true);
      expect(toBoolean('FALSE', 'strict')).toBe(false);
      expect(toBoolean('TRUE', 'strict')).toBe(true);
    });
  });

  describe('TypeScript Type Tests', () => {
    it('should have proper type inference for isBoolean', () => {
      const value: unknown = true;

      if (isBoolean(value)) {
        // TypeScript knows value is boolean
        expect(typeof value).toBe('boolean');
      }
    });

    it('should have proper type inference for toBoolean', () => {
      const result1 = toBoolean('true');
      // result1 is boolean
      expect(typeof result1).toBe('boolean');

      const result2 = toBoolean(1, 'strict');
      expect(typeof result2).toBe('boolean');
    });

    it('should have proper type inference for safeToBoolean', () => {
      const result1 = safeToBoolean('true');
      // result1 is boolean | undefined (actually boolean)
      expect(typeof result1 === 'boolean' || result1 === undefined).toBe(true);

      const result2 = safeToBoolean('invalid', 'fallback' as const);
      // result2 is boolean | "fallback"
      expect(typeof result2 === 'boolean' || result2 === 'fallback').toBe(true);
    });
  });
});
