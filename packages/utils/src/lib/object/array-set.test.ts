import { describe, it, expect } from 'vitest';
import { set, get } from './getter-setter.js';

interface User {
  id: number;
  name: string;
  age?: number;
  active?: boolean;
  profile?: {
    name: string;
    email: string;
    phone: string;
  };
  tags?: string[];
}

describe('set function with array support', () => {
  describe('root array operations', () => {
    it('should set value on array element using numeric property', () => {
      const arr = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
      ];
      const result = set(arr, '[0].name', 'Johnny');
      expect(result[0].name).toBe('Johnny');
      expect(result[1].name).toBe('Jane');
    });

    it('should set value on array element using index selector', () => {
      const arr = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
      ];
      const result = set(arr, '[0].name', 'Johnny');
      expect(result[0].name).toBe('Johnny');
      expect(result[1].name).toBe('Jane');
    });

    it('should set value on all array elements using wildcard', () => {
      const arr = [
        { id: 1, active: false },
        { id: 2, active: false },
      ];
      const result = set(arr, '[*].active', true);
      expect(result[0].active).toBe(true);
      expect(result[1].active).toBe(true);
    });

    it('should create missing nested objects in array', () => {
      const arr = [{ id: 1 }, { id: 2 }] as User[];
      const result = set(arr, '[0].profile.name', 'John');
      expect(result[0].profile.name).toBe('John');
      expect(result[1].id).toBe(2);
    });

    it('should set value on nested array element', () => {
      const arr = [
        { id: 1, tags: ['a', 'b'] },
        { id: 2, tags: ['c', 'd'] },
      ] as User[];
      const result = set(arr, '[0].tags[1]', 'updated');
      expect(result[0].tags[1]).toBe('updated');
      expect(result[1].tags[1]).toBe('d');
    });

    it('should handle numeric property on root array', () => {
      const arr = [10, 20, 30];
      const result = set(arr, '[1]', 99);
      expect(result[1]).toBe(99);
      expect(result[0]).toBe(10);
      expect(result[2]).toBe(30);
    });

    it('should expand array when setting index beyond length', () => {
      const arr = [1, 2];
      const result = set(arr, '[4]', 5);
      expect(result.length).toBe(5);
      expect(result[4]).toBe(5);
      expect(result[2]).toBeUndefined();
    });

    it('should set nested property on multiple array elements', () => {
      const arr = [
        { id: 1, meta: { count: 0 } },
        { id: 2, meta: { count: 0 } },
      ];
      const result = set(arr, '[*].meta.count', 10);
      expect(result[0].meta.count).toBe(10);
      expect(result[1].meta.count).toBe(10);
    });
  });

  describe('array within object operations', () => {
    it('should set value on array element within object', () => {
      const obj = {
        users: [
          { id: 1, name: 'John' },
          { id: 2, name: 'Jane' },
        ],
      } as {
        users: User[];
      };
      const result = set(obj, 'users[0].name', 'Johnny');
      expect(result.users[0].name).toBe('Johnny');
    });

    it('should set value using filter function on array', () => {
      const obj = {
        users: [
          { id: 1, name: 'John', active: false },
          { id: 2, name: 'Jane', active: false },
        ],
      } as {
        users: User[];
      };
      const result = set(obj, 'users', (item) => item.id === 1, {
        active: true,
      } as User);
      expect(result.users[0].active).toBe(true);
      expect(result.users[1].active).toBe(false);
    });

    it('should set value on array range', () => {
      const obj = {
        items: [1, 2, 3, 4, 5],
      };
      const result = set(obj, 'items', { from: 1, to: 3 }, 99);
      expect(result.items[0]).toBe(1);
      expect(result.items[1]).toBe(99);
      expect(result.items[2]).toBe(99);
      expect(result.items[3]).toBe(99);
      expect(result.items[4]).toBe(5);
    });
  });

  describe('array with update functions', () => {
    it('should update array element using function', () => {
      const arr = [{ count: 5 }, { count: 10 }];
      const result = set(arr, '[0].count', (prev) => prev + 1);
      expect(result[0].count).toBe(6);
      expect(result[1].count).toBe(10);
    });

    it('should update all array elements using function', () => {
      const arr = [{ value: 1 }, { value: 2 }, { value: 3 }];
      const result = set(arr, '[*].value', (prev) => prev * 2);
      expect(result[0].value).toBe(2);
      expect(result[1].value).toBe(4);
      expect(result[2].value).toBe(6);
    });
  });

  describe('get function with array support', () => {
    it('should get value from array element', () => {
      const arr = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
      ];
      const result = get(arr, '[0].name');
      expect(result).toBe('John');
    });

    it('should get values from all array elements', () => {
      const arr = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
      ];
      const result = get(arr, '[*].name');
      expect(result).toEqual(['John', 'Jane']);
    });

    it('should get nested array value', () => {
      const arr = [
        { id: 1, tags: ['a', 'b'] },
        { id: 2, tags: ['c', 'd'] },
      ];
      const result = get(arr, '[0].tags[1]');
      expect(result).toBe('b');
    });
  });

  describe('edge cases', () => {
    it('should handle empty array', () => {
      const arr: any[] = [];
      const result = set(arr, '[0].name', 'test');
      expect(result[0].name).toBe('test');
    });

    it('should handle array of primitives', () => {
      const arr = [1, 2, 3];
      const result = set(arr, '[1]', 99);
      expect(result).toEqual([1, 99, 3]);
    });

    it('should handle deeply nested arrays', () => {
      const arr = [
        {
          id: 1,
          nested: [{ value: 'a' }, { value: 'b' }],
        },
      ];
      const result = set(arr, '[0].nested[1].value', 'updated');
      expect(result[0].nested[1].value).toBe('updated');
    });

    it('should merge objects when setting on array with wildcard', () => {
      const arr = [
        { id: 1, name: 'John', age: 30 },
        { id: 2, name: 'Jane', age: 25 },
      ] as User[];
      const result = set(arr, '[*]', { active: true } as User);
      expect(result[0]).toEqual({ id: 1, name: 'John', age: 30, active: true });
      expect(result[1]).toEqual({ id: 2, name: 'Jane', age: 25, active: true });
    });
  });
});
