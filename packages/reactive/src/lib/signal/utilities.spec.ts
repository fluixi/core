/**
 * @fileoverview Tests for Signal Utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSignal } from '@fluixi/reactive/signal';
import {
  mapSignal as map,
  filterSignal as filter,
  reduceSignal as reduce,
  findSignal as find,
  someSignal as some,
  everySignal as every,
  sortSignal as sort,
  distinctSignal as distinct,
  combineSignal as combine,
  mergeSignal as merge,
  zipSignal as zip,
  selectSignal as select,
  pickSignal as pick,
  omitSignal as omit,
  whenSignal as when,
  guardSignal as guard,
  debounceSignal as debounce,
  throttleSignal as throttle,
} from './utilities.js';

describe('Signal Utilities', () => {
  describe('Transformation Utilities', () => {
    describe('map', () => {
      it('should transform signal value', () => {
        const [count, setCount] = createSignal(5);
        const doubled = map(count, (x) => x * 2);

        expect(doubled()).toBe(10);
        setCount(10);
        expect(doubled()).toBe(20);
      });

      it('should work with complex transformations', () => {
        const [user, setUser] = createSignal({ name: 'Alice', age: 30 });
        const userName = map(user, (u) => u.name.toUpperCase());

        expect(userName()).toBe('ALICE');
        setUser({ name: 'Bob', age: 25 });
        expect(userName()).toBe('BOB');
      });
    });

    describe('filter', () => {
      it('should filter array signal', () => {
        const [items, setItems] = createSignal([1, 2, 3, 4, 5]);
        const even = filter(items, (x) => x % 2 === 0);

        expect(even()).toEqual([2, 4]);
        setItems([1, 2, 3, 4, 5, 6]);
        expect(even()).toEqual([2, 4, 6]);
      });

      it('should work with object arrays', () => {
        const [users, setUsers] = createSignal([
          { name: 'Alice', active: true },
          { name: 'Bob', active: false },
          { name: 'Charlie', active: true },
        ]);
        const active = filter(users, (u) => u.active);

        expect(active()).toHaveLength(2);
        expect(active()[0].name).toBe('Alice');
      });
    });

    describe('reduce', () => {
      it('should reduce array signal', () => {
        const [numbers, setNumbers] = createSignal([1, 2, 3, 4, 5]);
        const sum = reduce(numbers, (acc, x) => acc + x, 0);

        expect(sum()).toBe(15);
        setNumbers([10, 20, 30]);
        expect(sum()).toBe(60);
      });

      it('should work with complex reducers', () => {
        const [items, setItems] = createSignal([
          { price: 10 },
          { price: 20 },
          { price: 30 },
        ]);
        const total = reduce(items, (acc, item) => acc + item.price, 0);

        expect(total()).toBe(60);
      });
    });

    describe('find', () => {
      it('should find first matching element', () => {
        const [items, setItems] = createSignal([1, 2, 3, 4, 5]);
        const found = find(items, (x) => x > 3);

        expect(found()).toBe(4);
        setItems([1, 2, 3]);
        expect(found()).toBeUndefined();
      });

      it('should work with object arrays', () => {
        const [users, setUsers] = createSignal([
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ]);
        const user = find(users, (u) => u.id === 2);

        expect(user()?.name).toBe('Bob');
      });
    });

    describe('some', () => {
      it('should check if any element matches', () => {
        const [numbers, setNumbers] = createSignal([1, 3, 5, 7]);
        const hasEven = some(numbers, (x) => x % 2 === 0);

        expect(hasEven()).toBe(false);
        setNumbers([1, 2, 3]);
        expect(hasEven()).toBe(true);
      });
    });

    describe('every', () => {
      it('should check if all elements match', () => {
        const [numbers, setNumbers] = createSignal([2, 4, 6, 8]);
        const allEven = every(numbers, (x) => x % 2 === 0);

        expect(allEven()).toBe(true);
        setNumbers([2, 3, 4]);
        expect(allEven()).toBe(false);
      });
    });

    describe('sort', () => {
      it('should sort array signal', () => {
        const [numbers, setNumbers] = createSignal([3, 1, 4, 1, 5]);
        const sorted = sort(numbers);

        expect(sorted()).toEqual([1, 1, 3, 4, 5]);
      });

      it('should work with custom compare function', () => {
        const [numbers, setNumbers] = createSignal([3, 1, 4, 1, 5]);
        const descending = sort(numbers, (a, b) => b - a);

        expect(descending()).toEqual([5, 4, 3, 1, 1]);
      });

      it('should not mutate original array', () => {
        const [numbers, setNumbers] = createSignal([3, 1, 4]);
        const sorted = sort(numbers);

        sorted();
        expect(numbers()).toEqual([3, 1, 4]);
      });
    });

    describe('distinct', () => {
      it('should return unique values', () => {
        const [numbers, setNumbers] = createSignal([1, 2, 2, 3, 3, 3, 4]);
        const unique = distinct(numbers);

        expect(unique()).toEqual([1, 2, 3, 4]);
        setNumbers([5, 5, 5]);
        expect(unique()).toEqual([5]);
      });
    });
  });

  describe('Combination Utilities', () => {
    describe('combine', () => {
      it('should combine multiple signals', () => {
        const [a, setA] = createSignal(1);
        const [b, setB] = createSignal(2);
        const [c, setC] = createSignal(3);
        const sum = combine([a, b, c], ([x, y, z]) => x + y + z);

        expect(sum()).toBe(6);
        setA(10);
        expect(sum()).toBe(15);
        setB(20);
        expect(sum()).toBe(33);
      });

      it('should work with different types', () => {
        const [name, setName] = createSignal('Alice');
        const [age, setAge] = createSignal(30);
        const info = combine([name, age], ([n, a]) => `${n} is ${a} years old`);

        expect(info()).toBe('Alice is 30 years old');
      });
    });

    describe('merge', () => {
      it('should return first truthy value', () => {
        const [primary, setPrimary] = createSignal<string | null>(null);
        const [fallback, setFallback] = createSignal('fallback');
        const result = merge(primary, fallback);

        expect(result()).toBe('fallback');
        setPrimary('primary');
        expect(result()).toBe('primary');
      });
    });

    describe('zip', () => {
      it('should combine two signals with operator', () => {
        const [x, setX] = createSignal(5);
        const [y, setY] = createSignal(3);
        const product = zip(x, y, (a, b) => a * b);

        expect(product()).toBe(15);
        setX(10);
        expect(product()).toBe(30);
      });
    });
  });

  describe('Selection Utilities', () => {
    describe('select', () => {
      it('should select derived value with custom equality', () => {
        const [user, setUser] = createSignal({
          id: 1,
          name: 'Alice',
          age: 30,
        });
        const userName = select(user, (u) => u.name);

        expect(userName()).toBe('Alice');
        setUser({ id: 1, name: 'Alice', age: 31 }); // Only age changed
        expect(userName()).toBe('Alice');
      });

      it('should only update when selected value changes', () => {
        let computeCount = 0;
        const [obj, setObj] = createSignal({ a: 1, b: 2 });
        const a = select(obj, (o) => {
          computeCount++;
          console.log('select triggered');
          return o.a;
        });

        expect(a()).toBe(1);
        const initialCount = computeCount;

        setObj({ a: 1, b: 3 }); // Only b changed
        a(); // Read to trigger computation
        expect(computeCount).toBe(initialCount + 1); // Should recompute but return same value
      });
    });

    describe('pick', () => {
      it('should pick specific properties', () => {
        const [user, setUser] = createSignal({
          id: 1,
          name: 'Alice',
          age: 30,
          email: 'alice@example.com',
        });
        const userData = pick(user, ['name', 'email']);

        expect(userData()).toEqual({
          name: 'Alice',
          email: 'alice@example.com',
        });
      });
    });

    describe('omit', () => {
      it('should omit specific properties', () => {
        const [user, setUser] = createSignal({
          id: 1,
          name: 'Alice',
          age: 30,
          password: 'secret',
        });
        const safeUser = omit(user, ['password']);

        expect(safeUser()).toEqual({
          id: 1,
          name: 'Alice',
          age: 30,
        });
        expect(safeUser()).not.toHaveProperty('password');
      });
    });
  });

  describe('Conditional Utilities', () => {
    describe('when', () => {
      it('should conditionally compute value', () => {
        const [isLoggedIn, setIsLoggedIn] = createSignal(false);
        const [user, setUser] = createSignal({ name: 'Alice' });
        const [guest, setGuest] = createSignal({ name: 'Guest' });
        const currentUser = when(isLoggedIn, user, guest);

        expect(currentUser().name).toBe('Guest');
        setIsLoggedIn(true);
        expect(currentUser().name).toBe('Alice');
      });
    });

    describe('guard', () => {
      it('should return value when condition is true', () => {
        const [showDetails, setShowDetails] = createSignal(false);
        const [details, setDetails] = createSignal({ info: 'Details here' });
        const visibleDetails = guard(showDetails, details);

        expect(visibleDetails()).toBeUndefined();
        setShowDetails(true);
        expect(visibleDetails()?.info).toBe('Details here');
      });
    });
  });

  // describe('Timing Utilities', () => {
  //   describe('debounce', () => {
  // beforeEach(() => {
  //   vi.useFakeTimers();
  // });

  // afterEach(() => {
  //   vi.restoreAllMocks();
  // });

  //     it('should debounce signal updates', () => {
  //       const [search, setSearch] = createSignal('');
  //       const debouncedSearch = debounce(search, 300);

  //       expect(debouncedSearch()).toBe('');

  //       setSearch('a');
  //       expect(debouncedSearch()).toBe('');

  //       vi.advanceTimersByTime(150);
  //       setSearch('ab');
  //       expect(debouncedSearch()).toBe('');

  //       vi.advanceTimersByTime(150);
  //       setSearch('abc');
  //       expect(debouncedSearch()).toBe('');

  //       vi.advanceTimersByTime(400);
  //       expect(debouncedSearch()).toBe('abc');
  //     });
  //   });

  //   describe('throttle', () => {
  //     beforeEach(() => {
  //       vi.useFakeTimers();
  //     });

  //     afterEach(() => {
  //       vi.restoreAllMocks();
  //     });

  //     it('should throttle signal updates', () => {
  //       const [scroll, setScroll] = createSignal(0);
  //       const throttledScroll = throttle(scroll, 100);

  //       expect(throttledScroll()).toBe(0);

  //       setScroll(10);
  //       expect(throttledScroll()).toBe(10);

  //       setScroll(20);
  //       expect(throttledScroll()).toBe(10); // Still throttled

  //       vi.advanceTimersByTime(100);
  //       setScroll(30);
  //       expect(throttledScroll()).toBe(30);
  //     });
  //   });
  // });

  describe('Integration Tests', () => {
    it('should chain multiple utilities', () => {
      const [numbers, setNumbers] = createSignal([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
      ]);

      const result = map(
        reduce(
          filter(numbers, (x) => x % 2 === 0),
          (acc, x) => acc + x,
          0
        ),
        (sum) => sum * 2
      );

      expect(result()).toBe(60); // (2+4+6+8+10) * 2 = 60
    });

    it('should combine transformation with selection', () => {
      const [users, setUsers] = createSignal([
        { id: 1, name: 'Alice', age: 30, active: true },
        { id: 2, name: 'Bob', age: 25, active: false },
        { id: 3, name: 'Charlie', age: 35, active: true },
      ]);

      const activeUserNames = map(
        filter(users, (u) => u.active),
        (users) => users.map((u) => u.name)
      );

      expect(activeUserNames()).toEqual(['Alice', 'Charlie']);
    });

    it('should work with conditional and transformation utilities', () => {
      const [hasData, setHasData] = createSignal(true);
      const [data, setData] = createSignal([1, 2, 3, 4, 5]);

      const processedData = guard(
        hasData,
        map(data, (arr) => arr.reduce((acc, x) => acc + x, 0))
      );

      expect(processedData()).toBe(15);
      setHasData(false);
      expect(processedData()).toBeUndefined();
    });
  });
});
