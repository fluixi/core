/**
 * @fileoverview Tests for merge function
 */

import { describe, it, expect } from 'vitest';
import { merge } from './merge.js';

describe('merge', () => {
  describe('basic functionality', () => {
    it('should merge two simple objects', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { c: 3, d: 4 };
      const result = merge(obj1, obj2);
      expect(result).toEqual({ a: 1, b: 2, c: 3, d: 4 });
    });

    it('should override properties from left to right', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { b: 3, c: 4 };
      const result = merge(obj1, obj2);
      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('should merge multiple objects', () => {
      const obj1 = { a: 1 };
      const obj2 = { b: 2 };
      const obj3 = { c: 3 };
      const result = merge(obj1, obj2, obj3);
      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });

    it('should return empty object when no arguments', () => {
      const result = merge();
      expect(result).toEqual({});
    });

    it('should handle single object', () => {
      const obj = { a: 1, b: 2 };
      const result = merge(obj);
      expect(result).toEqual({ a: 1, b: 2 });
    });
  });

  describe('nested objects', () => {
    it('should merge nested objects deeply', () => {
      const obj1 = { a: { b: 1, c: 2 } };
      const obj2 = { a: { c: 3, d: 4 } };
      const result = merge(obj1, obj2);
      expect(result).toEqual({ a: { b: 1, c: 3, d: 4 } });
    });

    it('should merge deeply nested objects', () => {
      const obj1 = { a: { b: { c: 1 } } };
      const obj2 = { a: { b: { d: 2 } } };
      const result = merge(obj1, obj2);
      expect(result).toEqual({ a: { b: { c: 1, d: 2 } } });
    });

    it('should merge complex nested structures', () => {
      const obj1 = {
        user: {
          name: 'John',
          profile: {
            age: 30,
            city: 'NYC',
          },
        },
      };
      const obj2 = {
        user: {
          profile: {
            city: 'LA',
            country: 'USA',
          },
          active: true,
        },
      };
      const result = merge(obj1, obj2);
      expect(result).toEqual({
        user: {
          name: 'John',
          profile: {
            age: 30,
            city: 'LA',
            country: 'USA',
          },
          active: true,
        },
      });
    });
  });

  describe('arrays', () => {
    it('should concatenate arrays', () => {
      const obj1 = { arr: [1, 2] };
      const obj2 = { arr: [3, 4] };
      const result = merge(obj1, obj2);
      expect(result).toEqual({ arr: [1, 2, 3, 4] });
    });

    it('should handle arrays in nested objects', () => {
      const obj1 = { data: { items: [1, 2] } };
      const obj2 = { data: { items: [3, 4] } };
      const result = merge(obj1, obj2);
      expect(result).toEqual({ data: { items: [1, 2, 3, 4] } });
    });

    it('should replace array with non-array', () => {
      const obj1 = { value: [1, 2, 3] };
      const obj2 = { value: 'string' };
      const result = merge(obj1, obj2);
      expect(result).toEqual({ value: 'string' });
    });

    it('should replace non-array with array', () => {
      const obj1 = { value: 'string' };
      const obj2 = { value: [1, 2, 3] };
      const result = merge(obj1, obj2);
      expect(result).toEqual({ value: [1, 2, 3] });
    });
  });

  describe('no reference issues - critical tests', () => {
    it('should not keep references to source object properties', () => {
      const obj1 = { a: 1, b: { c: 2 } };
      const obj2 = { d: 3 };
      const result = merge(obj1, obj2);

      // Modify source object
      obj1.b.c = 999;

      // Result should not be affected
      expect(result.b.c).toBe(2);
      expect(obj1.b.c).toBe(999);
    });

    it('should not keep references to second object properties', () => {
      const obj1 = { a: 1 };
      const obj2 = { b: { c: 2 } };
      const result = merge(obj1, obj2);

      // Modify source object
      obj2.b.c = 999;

      // Result should not be affected
      expect(result.b.c).toBe(2);
      expect(obj2.b.c).toBe(999);
    });

    it('should not keep references when merging nested objects', () => {
      const obj1 = { data: { items: { id: 1, name: 'test' } } };
      const obj2 = { data: { items: { age: 30 } } };
      const result = merge(obj1, obj2);

      // Modify source objects
      obj1.data.items.id = 999;
      obj2.data.items.age = 100;

      // Result should not be affected
      expect(result.data.items.id).toBe(1);
      expect(result.data.items.age).toBe(30);
    });

    it('should not keep references to arrays', () => {
      const obj1 = { arr: [1, 2, 3] };
      const obj2 = { arr: [4, 5] };
      const result = merge(obj1, obj2);

      // Modify source arrays
      obj1.arr.push(999);
      obj2.arr.push(888);

      // Result should not be affected
      expect(result.arr).toEqual([1, 2, 3, 4, 5]);
      expect(obj1.arr).toEqual([1, 2, 3, 999]);
      expect(obj2.arr).toEqual([4, 5, 888]);
    });

    it('should not keep references to arrays of objects', () => {
      const obj1 = { items: [{ id: 1 }, { id: 2 }] };
      const obj2 = { items: [{ id: 3 }] };
      const result = merge(obj1, obj2);

      // Modify source objects in arrays
      obj1.items[0].id = 999;
      obj2.items[0].id = 888;

      // Result should not be affected
      expect(result.items[0].id).toBe(1);
      expect(result.items[1].id).toBe(2);
      expect(result.items[2].id).toBe(3);
    });

    it('should create completely independent result object', () => {
      const obj1 = {
        level1: {
          level2: {
            level3: {
              value: 'original',
            },
          },
        },
      };
      const obj2 = { other: 'data' };
      const result = merge(obj1, obj2);

      // Modify deeply nested property
      obj1.level1.level2.level3.value = 'modified';

      // Result should not be affected
      expect(result.level1.level2.level3.value).toBe('original');
    });

    it('should not mutate source objects', () => {
      const obj1 = { a: 1, b: { c: 2 } };
      const obj2 = { b: { d: 3 }, e: 4 };
      const obj1Copy = JSON.parse(JSON.stringify(obj1));
      const obj2Copy = JSON.parse(JSON.stringify(obj2));

      merge(obj1, obj2);

      // Source objects should remain unchanged
      expect(obj1).toEqual(obj1Copy);
      expect(obj2).toEqual(obj2Copy);
    });
  });

  describe('edge cases', () => {
    it('should handle null values', () => {
      const obj1 = { a: null };
      const obj2 = { b: 2 };
      const result = merge(obj1, obj2);
      expect(result).toEqual({ a: null, b: 2 });
    });

    it('should handle undefined values', () => {
      const obj1 = { a: undefined };
      const obj2 = { b: 2 };
      const result = merge(obj1, obj2);
      expect(result).toEqual({ a: undefined, b: 2 });
    });

    it('should replace null with object', () => {
      const obj1 = { value: null };
      const obj2 = { value: { a: 1 } };
      const result = merge(obj1, obj2);
      expect(result).toEqual({ value: { a: 1 } });
    });

    it('should replace object with null', () => {
      const obj1 = { value: { a: 1 } };
      const obj2 = { value: null };
      const result = merge(obj1, obj2);
      expect(result).toEqual({ value: null });
    });

    it('should handle empty objects', () => {
      const obj1 = {};
      const obj2 = { a: 1 };
      const result = merge(obj1, obj2);
      expect(result).toEqual({ a: 1 });
    });

    it('should merge empty object with non-empty', () => {
      const obj1 = { a: 1 };
      const obj2 = {};
      const result = merge(obj1, obj2);
      expect(result).toEqual({ a: 1 });
    });

    it('should handle boolean values', () => {
      const obj1 = { flag: true };
      const obj2 = { flag: false };
      const result = merge(obj1, obj2);
      expect(result).toEqual({ flag: false });
    });

    it('should handle number values', () => {
      const obj1 = { value: 0 };
      const obj2 = { value: 42 };
      const result = merge(obj1, obj2);
      expect(result).toEqual({ value: 42 });
    });

    it('should handle string values', () => {
      const obj1 = { text: 'hello' };
      const obj2 = { text: 'world' };
      const result = merge(obj1, obj2);
      expect(result).toEqual({ text: 'world' });
    });

    it('should skip non-object arguments', () => {
      const obj1 = { a: 1 };
      const result = merge(obj1, null as any, undefined as any, { b: 2 });
      expect(result).toEqual({ a: 1, b: 2 });
    });
  });

  describe('symbols', () => {
    it('should merge symbol properties', () => {
      const sym1 = Symbol('test1');
      const sym2 = Symbol('test2');
      const obj1 = { [sym1]: 'value1' };
      const obj2 = { [sym2]: 'value2' };
      const result = merge(obj1, obj2);

      expect(result[sym1]).toBe('value1');
      expect(result[sym2]).toBe('value2');
    });

    it('should override symbol properties', () => {
      const sym = Symbol('test');
      const obj1 = { [sym]: 'original' };
      const obj2 = { [sym]: 'updated' };
      const result = merge(obj1, obj2);

      expect(result[sym]).toBe('updated');
    });

    it('should merge nested objects with symbols', () => {
      const sym = Symbol('test');
      const obj1 = { [sym]: { a: 1 } };
      const obj2 = { [sym]: { b: 2 } };
      const result = merge(obj1, obj2);

      expect(result[sym]).toEqual({ a: 1, b: 2 });
    });

    it('should not keep references to symbol values', () => {
      const sym = Symbol('test');
      const obj1 = { [sym]: { value: 'original' } };
      const obj2 = { other: 'data' };
      const result = merge(obj1, obj2);

      // Modify source
      (obj1[sym] as any).value = 'modified';

      // Result should not be affected
      expect((result[sym] as any).value).toBe('original');
    });
  });

  describe('complex scenarios', () => {
    it('should handle mixed types in merge', () => {
      const obj1 = {
        string: 'hello',
        number: 42,
        boolean: true,
        null: null,
        undefined: undefined,
        array: [1, 2],
        object: { nested: true },
      };
      const obj2 = {
        string: 'world',
        array: [3, 4],
        object: { other: false },
      };
      const result = merge(obj1, obj2);

      expect(result).toEqual({
        string: 'world',
        number: 42,
        boolean: true,
        null: null,
        undefined: undefined,
        array: [1, 2, 3, 4],
        object: { nested: true, other: false },
      });
    });

    it('should merge configuration objects', () => {
      const defaultConfig = {
        server: {
          host: 'localhost',
          port: 3000,
          ssl: false,
        },
        database: {
          host: 'localhost',
          port: 5432,
          name: 'mydb',
        },
      };

      const userConfig = {
        server: {
          port: 8080,
          ssl: true,
        },
        database: {
          name: 'production',
        },
      };

      const result = merge(defaultConfig, userConfig);

      expect(result).toEqual({
        server: {
          host: 'localhost',
          port: 8080,
          ssl: true,
        },
        database: {
          host: 'localhost',
          port: 5432,
          name: 'production',
        },
      });

      // Verify no references
      defaultConfig.server.port = 9999;
      expect(result.server.port).toBe(8080);
    });

    it('should merge user profiles', () => {
      const profile1 = {
        user: {
          name: 'John',
          age: 30,
          tags: ['developer', 'admin'],
        },
        settings: {
          theme: 'dark',
          notifications: true,
        },
      };

      const profile2 = {
        user: {
          age: 31,
          tags: ['senior'],
          active: true,
        },
        settings: {
          theme: 'light',
        },
      };

      const result = merge(profile1, profile2);

      expect(result).toEqual({
        user: {
          name: 'John',
          age: 31,
          tags: ['developer', 'admin', 'senior'],
          active: true,
        },
        settings: {
          theme: 'light',
          notifications: true,
        },
      });
    });
  });

  describe('performance and edge cases', () => {
    it('should handle deeply nested structures', () => {
      const obj1 = { a: { b: { c: { d: { e: { f: 1 } } } } } };
      const obj2 = { a: { b: { c: { d: { e: { g: 2 } } } } } };
      const result = merge(obj1, obj2);

      expect(result.a.b.c.d.e.f).toBe(1);
      expect(result.a.b.c.d.e.g).toBe(2);
    });

    it('should handle large number of properties', () => {
      const obj1: any = {};
      const obj2: any = {};

      for (let i = 0; i < 100; i++) {
        obj1[`key${i}`] = i;
        obj2[`key${i + 100}`] = i + 100;
      }

      const result = merge(obj1, obj2);
      expect(Object.keys(result).length).toBe(200);
    });

    it('should handle circular reference in Date objects', () => {
      const obj1 = { date: new Date('2024-01-01') };
      const obj2 = { other: 'value' };
      const result = merge(obj1, obj2);

      expect(result.date).toBeInstanceOf(Date);
      expect(result.date.toISOString()).toContain('2024-01-01');
    });
  });
});
