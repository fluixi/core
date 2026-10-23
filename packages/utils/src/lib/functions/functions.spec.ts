import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isFunction,
  isPromise,
  isAsyncFunction,
  memoize,
  debounce,
  throttle,
  once,
  curry,
  compose,
  pipe,
  negate,
  partial,
  partialRight,
  flip,
  ary,
  unary,
  defer,
  delay,
  before,
  after,
  tryCatch,
  retry,
  withTimeout,
  memoizeWithTTL,
} from './functions.js';

describe('Function Type Guards', () => {
  describe('isFunction', () => {
    it('should return true for functions', () => {
      expect(isFunction(() => {})).toBe(true);
      expect(isFunction(function () {})).toBe(true);
      expect(isFunction(async () => {})).toBe(true);
    });

    it('should return false for non-functions', () => {
      expect(isFunction(null)).toBe(false);
      expect(isFunction(undefined)).toBe(false);
      expect(isFunction(123)).toBe(false);
      expect(isFunction('string')).toBe(false);
      expect(isFunction({})).toBe(false);
    });

    it('should return false for classes', () => {
      class TestClass {}
      expect(isFunction(TestClass)).toBe(false);
    });
  });

  describe('isPromise', () => {
    it('should return true for promises', () => {
      expect(isPromise(Promise.resolve())).toBe(true);
      expect(isPromise(new Promise(() => {}))).toBe(true);
    });

    it('should return true for thenable objects', () => {
      const thenable = { then: () => {} };
      expect(isPromise(thenable)).toBe(true);
    });

    it('should return false for non-promises', () => {
      expect(isPromise(null)).toBe(false);
      expect(isPromise(undefined)).toBe(false);
      expect(isPromise(123)).toBe(false);
      expect(isPromise(() => {})).toBe(false);
    });
  });

  describe('isAsyncFunction', () => {
    it('should return true for async functions', () => {
      expect(isAsyncFunction(async () => {})).toBe(true);
      expect(isAsyncFunction(async function () {})).toBe(true);
    });

    it('should return false for regular functions', () => {
      expect(isAsyncFunction(() => {})).toBe(false);
      expect(isAsyncFunction(function () {})).toBe(false);
    });

    it('should return false for non-functions', () => {
      expect(isAsyncFunction(null)).toBe(false);
      expect(isAsyncFunction(Promise.resolve())).toBe(false);
    });
  });
});

describe('Memoization', () => {
  describe('memoize', () => {
    it('should cache function results', () => {
      let callCount = 0;
      const fn = memoize((x: number) => {
        callCount++;
        return x * 2;
      });

      expect(fn(5)).toBe(10);
      expect(fn(5)).toBe(10);
      expect(callCount).toBe(1);
    });

    it('should cache different arguments separately', () => {
      let callCount = 0;
      const fn = memoize((x: number) => {
        callCount++;
        return x * 2;
      });

      expect(fn(5)).toBe(10);
      expect(fn(10)).toBe(20);
      expect(callCount).toBe(2);
    });

    it('should use custom resolver', () => {
      let callCount = 0;
      const fn = memoize(
        (obj: { x: number }) => {
          callCount++;
          return obj.x * 2;
        },
        (obj) => String(obj.x)
      );

      expect(fn({ x: 5 })).toBe(10);
      expect(fn({ x: 5 })).toBe(10);
      expect(callCount).toBe(1);
    });

    it('should expose cache', () => {
      const fn = memoize((x: number) => x * 2);
      fn(5);
      expect(fn.cache.size).toBe(1);
      expect(fn.cache.has(JSON.stringify([5]))).toBe(true);
    });
  });

  describe('memoizeWithTTL', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should cache results with TTL', () => {
      let callCount = 0;
      const fn = memoizeWithTTL((x: number) => {
        callCount++;
        return x * 2;
      }, 1000);

      expect(fn(5)).toBe(10);
      expect(fn(5)).toBe(10);
      expect(callCount).toBe(1);
    });

    it('should expire cache after TTL', () => {
      let callCount = 0;
      const fn = memoizeWithTTL((x: number) => {
        callCount++;
        return x * 2;
      }, 1000);

      fn(5);
      vi.advanceTimersByTime(1001);
      fn(5);

      expect(callCount).toBe(2);
    });
  });
});

describe('Timing Functions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('debounce', () => {
    it('should debounce function calls', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced();
      debounced();

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should support leading edge', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100, { leading: true, trailing: false });

      debounced();
      expect(fn).toHaveBeenCalledTimes(1);

      debounced();
      debounced();
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should cancel pending invocations', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced.cancel();

      vi.advanceTimersByTime(100);
      expect(fn).not.toHaveBeenCalled();
    });

    it('should flush pending invocations', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced.flush();

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should check pending status', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      expect(debounced.pending()).toBe(false);
      debounced();
      expect(debounced.pending()).toBe(true);
      vi.advanceTimersByTime(100);
      expect(debounced.pending()).toBe(false);
    });
  });

  describe('throttle', () => {
    it('should throttle function calls', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      expect(fn).toHaveBeenCalledTimes(1);

      throttled();
      throttled();
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should support leading and trailing options', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100, { leading: false, trailing: true });

      throttled();
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('defer', () => {
    it('should defer function execution', () => {
      const fn = vi.fn();
      defer(fn, 'arg1', 'arg2');

      expect(fn).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });

  describe('delay', () => {
    it('should delay function execution', () => {
      const fn = vi.fn();
      delay(fn, 100, 'arg1');

      expect(fn).not.toHaveBeenCalled();
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledWith('arg1');
    });
  });
});

describe('Function Restriction', () => {
  describe('once', () => {
    it('should invoke function only once', () => {
      const fn = vi.fn((x: number) => x * 2);
      const onceFn = once(fn);

      expect(onceFn(5)).toBe(10);
      expect(onceFn(10)).toBe(10); // Returns cached result
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should expose called status', () => {
      const fn = vi.fn();
      const onceFn = once(fn);

      expect(onceFn.called).toBe(false);
      onceFn();
      expect(onceFn.called).toBe(true);
    });
  });

  describe('before', () => {
    it('should invoke function before n calls', () => {
      const fn = vi.fn((x: number) => x);
      const beforeFn = before(fn, 3);

      expect(beforeFn(1)).toBe(1);
      expect(beforeFn(2)).toBe(2);
      expect(beforeFn(3)).toBe(2); // Returns last result
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('after', () => {
    it('should invoke function after n calls', () => {
      const fn = vi.fn((x: number) => x);
      const afterFn = after(fn, 3);

      expect(afterFn(1)).toBeUndefined();
      expect(afterFn(2)).toBeUndefined();
      expect(afterFn(3)).toBe(3);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Function Composition', () => {
  describe('curry', () => {
    it('should curry a function', () => {
      const add = (a: number, b: number, c: number) => a + b + c;
      const curried = curry(add);

      expect(curried(1)(2)(3)).toBe(6);
      expect(curried(1, 2)(3)).toBe(6);
      expect(curried(1)(2, 3)).toBe(6);
      expect(curried(1, 2, 3)).toBe(6);
    });
  });

  describe('compose', () => {
    it('should compose functions right to left', () => {
      const double = (x: number) => x * 2;
      const addOne = (x: number) => x + 1;
      const composed = compose(double, addOne);

      expect(composed(5)).toBe(12); // (5 + 1) * 2
    });

    it('should handle multiple functions', () => {
      const f1 = (x: number) => x + 1;
      const f2 = (x: number) => x * 2;
      const f3 = (x: number) => x - 3;
      const composed = compose(f1, f2, f3);

      expect(composed(10)).toBe(15); // ((10 - 3) * 2) + 1
    });
  });

  describe('pipe', () => {
    it('should pipe functions left to right', () => {
      const double = (x: number) => x * 2;
      const addOne = (x: number) => x + 1;
      const piped = pipe(double, addOne);

      expect(piped(5)).toBe(11); // (5 * 2) + 1
    });

    it('should handle multiple functions', () => {
      const f1 = (x: number) => x + 1;
      const f2 = (x: number) => x * 2;
      const f3 = (x: number) => x - 3;
      const piped = pipe(f1, f2, f3);

      expect(piped(10)).toBe(19); // ((10 + 1) * 2) - 3
    });
  });
});

describe('Function Transformation', () => {
  describe('negate', () => {
    it('should negate a predicate', () => {
      const isEven = (n: number) => n % 2 === 0;
      const isOdd = negate(isEven);

      expect(isOdd(3)).toBe(true);
      expect(isOdd(4)).toBe(false);
    });
  });

  describe('partial', () => {
    it('should partially apply arguments', () => {
      const greet = (greeting: string, name: string) => `${greeting}, ${name}!`;
      const sayHello = partial(greet, 'Hello');

      expect(sayHello('World')).toBe('Hello, World!');
    });
  });

  describe('partialRight', () => {
    it('should partially apply arguments from right', () => {
      const greet = (name: string, greeting: string) => `${greeting}, ${name}!`;
      const greetWorld = partialRight(greet, 'Hello');

      expect(greetWorld('World')).toBe('Hello, World!');
    });
  });

  describe('flip', () => {
    it('should flip function arguments', () => {
      const divide = (a: number, b: number) => a / b;
      const flipped = flip(divide);

      expect(divide(10, 2)).toBe(5);
      expect(flipped(10, 2)).toBe(0.2);
    });
  });

  describe('ary', () => {
    it('should cap function arity', () => {
      const fn = vi.fn((a: any, b: any, c: any) => [a, b, c]);
      const capped = ary(fn, 2);

      capped(1, 2, 3, 4);
      expect(fn).toHaveBeenCalledWith(1, 2);
    });
  });

  describe('unary', () => {
    it('should create unary function', () => {
      const parseIntUnary = unary(parseInt);
      expect(['6', '8', '10'].map(parseIntUnary)).toEqual([6, 8, 10]);
    });
  });
});

describe('Error Handling', () => {
  describe('tryCatch', () => {
    it('should catch and handle errors', () => {
      const errorHandler = vi.fn((error: Error) => ({ error: error.message }));
      const safeParse = tryCatch(
        (str: string) => JSON.parse(str),
        errorHandler
      );

      const result = safeParse('invalid json');
      expect(errorHandler).toHaveBeenCalled();
      expect(result).toHaveProperty('error');
    });

    it('should return result on success', () => {
      const errorHandler = vi.fn();
      const safeParse = tryCatch(
        (str: string) => JSON.parse(str),
        errorHandler
      );

      const result = safeParse('{"valid": true}');
      expect(errorHandler).not.toHaveBeenCalled();
      expect(result).toEqual({ valid: true });
    });
  });

  describe('retry', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should retry on failure', async () => {
      let attempts = 0;
      const fn = retry(
        async () => {
          attempts++;
          if (attempts < 3) throw new Error('Failed');
          return 'Success';
        },
        { retries: 3, delay: 100 }
      );

      const promise = fn();

      // Advance timers enough for all retries
      await vi.advanceTimersByTimeAsync(500);
      const result = await promise;

      expect(result).toBe('Success');
      expect(attempts).toBe(3);
    }, 10000);

    it('should throw after max retries', async () => {
      const fn = retry(
        async () => {
          throw new Error('Always fails');
        },
        { retries: 2, delay: 100 }
      );

      const promise = fn().catch((e) => e);
      await vi.advanceTimersByTimeAsync(1000);

      const result = await promise;
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Always fails');
    });

    it('should call onRetry callback', async () => {
      const onRetry = vi.fn();
      let attempts = 0;

      const fn = retry(
        async () => {
          attempts++;
          if (attempts < 2) throw new Error('Failed');
          return 'Success';
        },
        { retries: 2, delay: 100, onRetry }
      );

      const promise = fn();
      await vi.advanceTimersByTimeAsync(1000);
      await promise;

      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('withTimeout', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should timeout slow functions', async () => {
      const slowFn = async () => {
        return new Promise<string>((resolve) =>
          setTimeout(() => resolve('Done'), 2000)
        );
      };

      const timedFn = withTimeout(slowFn, 1000);
      const promise = timedFn().catch((e) => e);

      await vi.advanceTimersByTimeAsync(1000);
      const result = await promise;
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toContain('timed out');
    });

    it('should return result if completes in time', async () => {
      const fastFn = async () => {
        return new Promise((resolve) => setTimeout(() => resolve('Done'), 500));
      };

      const timedFn = withTimeout(fastFn, 1000);
      const promise = timedFn();

      await vi.advanceTimersByTimeAsync(500);
      const result = await promise;
      expect(result).toBe('Done');
    });

    it('should call onTimeout callback', async () => {
      const onTimeout = vi.fn();
      const slowFn = async () => {
        return new Promise<string>((resolve) =>
          setTimeout(() => resolve('Done'), 2000)
        );
      };

      const timedFn = withTimeout(slowFn, 1000, onTimeout);
      const promise = timedFn().catch((e) => e);

      await vi.advanceTimersByTimeAsync(1000);
      const result = await promise;

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toContain('timed out');
      expect(onTimeout).toHaveBeenCalled();
    });
  });
});
