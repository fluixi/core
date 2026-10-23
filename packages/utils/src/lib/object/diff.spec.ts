import { describe, it, expect } from 'vitest';
import {
  diffObject,
  diffObjectDetailed,
  hasObjectChanges,
  applyDiff,
  getChangedPaths,
} from './diff.js';

describe('diffObjectDetailed - Array Support', () => {
  describe('top-level arrays', () => {
    it('should detect changes in top-level arrays', () => {
      const old = [1, 2, 3, 4];
      const newArr = [1, 5, 3, 4];
      const result = diffObjectDetailed(old as any, newArr as any);

      expect(result.hasChanges).toBe(true);
      expect(result.modified).toContain('[1]');
      expect(result.changes).toEqual([1, 5, 3, 4]);
    });

    it('should detect added elements in arrays', () => {
      const old = [1, 2, 3];
      const newArr = [1, 2, 3, 4, 5];
      const result = diffObjectDetailed(old as any, newArr as any);

      expect(result.hasChanges).toBe(true);
      expect(result.added).toContain('[3]');
      expect(result.added).toContain('[4]');
      expect(result.changes).toEqual([1, 2, 3, 4, 5]);
    });

    it('should detect deleted elements in arrays', () => {
      const old = [1, 2, 3, 4];
      const newArr = [1, 2];
      const result = diffObjectDetailed(old as any, newArr as any, {
        includeDeleted: true,
      });

      expect(result.hasChanges).toBe(true);
      expect(result.deleted).toContain('[2]');
      expect(result.deleted).toContain('[3]');
      // Changes array should match newArr length (not include deleted elements as undefined)
      expect(result.changes).toEqual([1, 2]);
      expect((result.changes as any[]).length).toBe(2);
    });

    it('should handle removing last item from array (Task example)', () => {
      const old = ['Task 1', 'Task 2'];
      const newArr = ['Task 1'];
      const result = diffObjectDetailed(old as any, newArr as any, {
        includeDeleted: true,
      });

      expect(result.hasChanges).toBe(true);
      expect(result.deleted).toContain('[1]');
      expect(result.added).toEqual([]);
      expect(result.modified).toEqual([]);
      // IMPORTANT: changes should be ['Task 1'], NOT ['Task 1', undefined]
      expect(result.changes).toEqual(['Task 1']);
      expect((result.changes as any[]).length).toBe(1);

      // Verify applyDiff works correctly
      const applied = applyDiff(old as any, result);
      expect(applied).toEqual(['Task 1']);
      expect(applied.length).toBe(1);
    });

    it('should return no changes for identical arrays', () => {
      const old = [1, 2, 3];
      const newArr = [1, 2, 3];
      const result = diffObjectDetailed(old as any, newArr as any);

      expect(result.hasChanges).toBe(false);
      expect(result.added).toEqual([]);
      expect(result.deleted).toEqual([]);
      expect(result.modified).toEqual([]);
    });
  });

  describe('arrays of objects', () => {
    it('should detect changes in array elements that are objects', () => {
      const old = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];
      const newArr = [
        { id: 1, name: 'Alicia' },
        { id: 2, name: 'Bob' },
      ];
      const result = diffObjectDetailed(old as any, newArr as any);

      expect(result.hasChanges).toBe(true);
      expect(result.modified).toContain('[0]');
      expect(result.changes[0]).toEqual({ id: 1, name: 'Alicia' });
      expect(result.changes[1]).toEqual({ id: 2, name: 'Bob' });
    });

    it('should detect nested changes in array of objects', () => {
      const old = [
        { id: 1, profile: { name: 'Alice', age: 30 } },
        { id: 2, profile: { name: 'Bob', age: 25 } },
      ];
      const newArr = [
        { id: 1, profile: { name: 'Alice', age: 31 } },
        { id: 2, profile: { name: 'Bob', age: 25 } },
      ];
      const result = diffObjectDetailed(old as any, newArr as any);

      expect(result.hasChanges).toBe(true);
      expect(result.modified).toContain('[0]');
    });
  });

  describe('nested arrays', () => {
    it('should handle arrays within arrays', () => {
      const old = [
        [1, 2],
        [3, 4],
      ];
      const newArr = [
        [1, 5],
        [3, 4],
      ];
      const result = diffObjectDetailed(old as any, newArr as any);

      expect(result.hasChanges).toBe(true);
      expect(result.modified).toContain('[0]');
    });
  });
});

describe('applyDiff - Array Support', () => {
  describe('top-level arrays', () => {
    it('should apply changes to top-level arrays', () => {
      const base = [1, 2, 3, 4];
      const diff = [10, undefined, 30, undefined];
      const result = applyDiff(base as any, diff as any);

      expect(result).toEqual([10, 2, 30, 4]);
    });

    it('should handle array with all undefined (no changes)', () => {
      const base = [1, 2, 3];
      const diff = [undefined, undefined, undefined];
      const result = applyDiff(base as any, diff as any);

      expect(result).toEqual([1, 2, 3]);
    });

    it('should apply changes without modifying original when keepRef is false', () => {
      const base = [1, 2, 3];
      const diff = [10, undefined, undefined];
      const result = applyDiff(base as any, diff as any, false);

      expect(result).toEqual([10, 2, 3]);
      expect(base).toEqual([1, 2, 3]); // Original unchanged
    });

    it('should modify original array when keepRef is true', () => {
      const base = [1, 2, 3];
      const diff = [10, undefined, undefined];
      const result = applyDiff(base as any, diff as any, true);

      expect(result).toEqual([10, 2, 3]);
      expect(base).toEqual([10, 2, 3]); // Original modified
      expect(result).toBe(base); // Same reference
    });
  });

  describe('arrays of objects', () => {
    it('should apply changes to objects within arrays', () => {
      const base = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];
      const diff = [{ name: 'Alicia' }, undefined];
      const result = applyDiff(base as any, diff as any);

      expect(result).toEqual([
        { id: 1, name: 'Alicia' },
        { id: 2, name: 'Bob' },
      ]);
    });

    it('should handle nested object changes in arrays', () => {
      const base = [
        { id: 1, profile: { name: 'Alice', age: 30 } },
        { id: 2, profile: { name: 'Bob', age: 25 } },
      ];
      const diff = [{ profile: { age: 31 } }, undefined];
      const result = applyDiff(base as any, diff as any);

      expect(result[0].profile.age).toBe(31);
      expect(result[0].profile.name).toBe('Alice');
      expect(result[1]).toEqual({ id: 2, profile: { name: 'Bob', age: 25 } });
    });
  });

  describe('nested arrays', () => {
    it('should apply changes to nested arrays', () => {
      const base = [
        [1, 2],
        [3, 4],
      ];
      const diff = [[10, undefined], undefined];
      const result = applyDiff(base as any, diff as any);

      expect(result).toEqual([
        [10, 2],
        [3, 4],
      ]);
    });

    it('should handle arrays within objects', () => {
      const base = {
        items: [1, 2, 3],
        name: 'test',
      };
      const diff = {
        items: [10, undefined, 30],
      };
      const result = applyDiff(base, diff as any);

      expect(result).toEqual({
        items: [10, 2, 30],
        name: 'test',
      });
    });
  });
});

describe('diffObject', () => {
  describe('basic functionality', () => {
    it('should return empty object when objects are identical', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = diffObject(obj, obj);
      expect(result).toEqual({});
    });

    it('should detect changed primitive values', () => {
      const old = { a: 1, b: 2, c: 3 };
      const newObj = { a: 1, b: 4, c: 3 };
      const result = diffObject(old, newObj);
      expect(result).toEqual({ b: 4 });
    });

    it('should detect added properties', () => {
      const old = { a: 1, b: 2 };
      const newObj = { a: 1, b: 2, c: 3 };
      const result = diffObject(old, newObj);
      expect(result).toEqual({ c: 3 });
    });

    it('should not include deleted properties by default', () => {
      const old = { a: 1, b: 2, c: 3 };
      const newObj = { a: 1, b: 2 };
      const result = diffObject(old, newObj);
      expect(result).toEqual({});
    });

    it('should include deleted properties when option is enabled', () => {
      const old = { a: 1, b: 2, c: 3 };
      const newObj = { a: 1, b: 2 };
      const result = diffObject(old, newObj, { includeDeleted: true });
      expect(result).toEqual({ c: undefined });
    });

    it('should not include added properties when option is disabled', () => {
      const old = { a: 1, b: 2 };
      const newObj = { a: 1, b: 2, c: 3 };
      const result = diffObject(old, newObj, { includeAdded: false });
      expect(result).toEqual({});
    });
  });

  describe('nested objects', () => {
    it('should detect changes in nested objects', () => {
      const old = { a: 1, b: { c: 2, d: 3 } };
      const newObj = { a: 1, b: { c: 4, d: 3 } };
      const result = diffObject(old, newObj);
      expect(result).toEqual({ b: { c: 4 } });
    });

    it('should handle deeply nested changes', () => {
      const old = { a: { b: { c: { d: 1 } } } };
      const newObj = { a: { b: { c: { d: 2 } } } };
      const result = diffObject(old, newObj);
      expect(result).toEqual({ a: { b: { c: { d: 2 } } } });
    });

    it('should return empty nested object when no changes', () => {
      const old = { a: 1, b: { c: 2, d: 3 } };
      const newObj = { a: 1, b: { c: 2, d: 3 } };
      const result = diffObject(old, newObj);
      expect(result).toEqual({});
    });

    it('should handle mixed changes at different levels', () => {
      const old = { a: 1, b: { c: 2, d: 3 }, e: 5 };
      const newObj = { a: 2, b: { c: 4, d: 3 }, e: 5 };
      const result = diffObject(old, newObj);
      expect(result).toEqual({ a: 2, b: { c: 4 } });
    });
  });

  describe('arrays', () => {
    it('should detect array changes with deep comparison', () => {
      const old = { items: [1, 2, 3] };
      const newObj = { items: [1, 2, 4] };
      const result = diffObject(old, newObj);
      expect(result).toEqual({ items: [1, 2, 4] });
    });

    it('should detect identical arrays with deep comparison', () => {
      const old = { items: [1, 2, 3] };
      const newObj = { items: [1, 2, 3] };
      const result = diffObject(old, newObj);
      expect(result).toEqual({});
    });

    it('should detect array length changes', () => {
      const old = { items: [1, 2, 3] };
      const newObj = { items: [1, 2] };
      const result = diffObject(old, newObj);
      expect(result).toEqual({ items: [1, 2] });
    });

    it('should handle arrays with objects', () => {
      const old = {
        items: [
          { id: 1, name: 'a' },
          { id: 2, name: 'b' },
        ],
      };
      const newObj = {
        items: [
          { id: 1, name: 'a' },
          { id: 2, name: 'c' },
        ],
      };
      const result = diffObject(old, newObj);
      expect(result).toEqual({
        items: [
          { id: 1, name: 'a' },
          { id: 2, name: 'c' },
        ],
      });
    });

    it('should use reference comparison when deepArrayComparison is false', () => {
      const arr = [1, 2, 3];
      const old = { items: arr };
      const newObj = { items: arr };
      const result = diffObject(old, newObj, { deepArrayComparison: false });
      expect(result).toEqual({});
    });

    it('should detect different array references when deep comparison is off', () => {
      const old = { items: [1, 2, 3] };
      const newObj = { items: [1, 2, 3] };
      const result = diffObject(old, newObj, { deepArrayComparison: false });
      expect(result).toEqual({ items: [1, 2, 3] });
    });
  });

  describe('edge cases', () => {
    it('should handle null values', () => {
      const old = { a: 1, b: null };
      const newObj = { a: 1, b: 2 };
      const result = diffObject(old, newObj as any);
      expect(result).toEqual({ b: 2 });
    });

    it('should handle undefined values', () => {
      const old = { a: 1, b: undefined };
      const newObj = { a: 1, b: 2 };
      const result = diffObject(old, newObj as any);
      expect(result).toEqual({ b: 2 });
    });

    it('should handle null oldObj', () => {
      const result = diffObject(null as any, { a: 1 });
      expect(result).toEqual({ a: 1 });
    });

    it('should handle null newObj', () => {
      const result = diffObject({ a: 1 }, null as any);
      expect(result).toEqual({});
    });

    it('should handle both null', () => {
      const result = diffObject(null as any, null as any);
      expect(result).toEqual({});
    });

    it('should handle empty objects', () => {
      const result = diffObject({}, {});
      expect(result).toEqual({});
    });

    it('should handle boolean values', () => {
      const old = { flag: true };
      const newObj = { flag: false };
      const result = diffObject(old, newObj);
      expect(result).toEqual({ flag: false });
    });

    it('should handle date objects', () => {
      const old = { date: new Date('2023-01-01') };
      const newObj = { date: new Date('2023-01-02') };
      const result = diffObject(old, newObj);
      expect(result.date).toEqual(new Date('2023-01-02'));
    });
  });

  describe('custom equality function', () => {
    it('should use custom equality function', () => {
      const old = { a: 1.0000001 };
      const newObj = { a: 1.0000002 };

      const approxEqual = (a: any, b: any) => {
        if (typeof a === 'number' && typeof b === 'number') {
          return Math.abs(a - b) < 0.0001;
        }
        return a === b;
      };

      const result = diffObject(old, newObj, { equalityFn: approxEqual });
      expect(result).toEqual({});
    });

    it('should detect differences with custom equality function', () => {
      const old = { a: 1 };
      const newObj = { a: 2 };

      const approxEqual = (a: any, b: any) => {
        if (typeof a === 'number' && typeof b === 'number') {
          return Math.abs(a - b) < 0.0001;
        }
        return a === b;
      };

      const result = diffObject(old, newObj, { equalityFn: approxEqual });
      expect(result).toEqual({ a: 2 });
    });
  });

  describe('preserveStructure option', () => {
    it('should preserve structure with undefined for unchanged values', () => {
      const old = { a: 1, b: 2 };
      const newObj = { a: 2, b: 2 };
      const result = diffObject(old, newObj, { preserveStructure: true });
      expect(result).toEqual({ a: 2, b: undefined });
    });
  });
});

describe('diffObjectDetailed', () => {
  it('should return detailed diff information', () => {
    const old = { a: 1, b: 2, c: 3 };
    const newObj = { a: 1, b: 4, d: 5 };
    const result = diffObjectDetailed(old, newObj as any, {
      includeDeleted: true,
    });

    expect(result.changes).toEqual({ b: 4, c: undefined, d: 5 });
    expect(result.added).toEqual(['d']);
    expect(result.deleted).toEqual(['c']);
    expect(result.modified).toEqual(['b']);
    expect(result.hasChanges).toBe(true);
  });

  it('should handle no changes', () => {
    const obj = { a: 1, b: 2 };
    const result = diffObjectDetailed(obj, obj);

    expect(result.changes).toEqual({});
    expect(result.added).toEqual([]);
    expect(result.deleted).toEqual([]);
    expect(result.modified).toEqual([]);
    expect(result.hasChanges).toBe(false);
  });

  it('should track only modified keys', () => {
    const old = { a: 1, b: 2 };
    const newObj = { a: 2, b: 2 };
    const result = diffObjectDetailed(old, newObj);

    expect(result.changes).toEqual({ a: 2 });
    expect(result.added).toEqual([]);
    expect(result.deleted).toEqual([]);
    expect(result.modified).toEqual(['a']);
    expect(result.hasChanges).toBe(true);
  });

  it('should track nested changes', () => {
    const old = { a: { b: 1, c: 2 } };
    const newObj = { a: { b: 3, c: 2 } };
    const result = diffObjectDetailed(old, newObj);

    expect(result.changes).toEqual({ a: { b: 3 } });
    expect(result.modified).toEqual(['a.b']);
    expect(result.hasChanges).toBe(true);
  });
});

describe('hasObjectChanges', () => {
  it('should return false when objects are identical', () => {
    const obj = { a: 1, b: 2 };
    expect(hasObjectChanges(obj, obj)).toBe(false);
  });

  it('should return true when objects differ', () => {
    const old = { a: 1, b: 2 };
    const newObj = { a: 1, b: 3 };
    expect(hasObjectChanges(old, newObj)).toBe(true);
  });

  it('should return true when properties are added', () => {
    const old = { a: 1 };
    const newObj = { a: 1, b: 2 };
    expect(hasObjectChanges(old, newObj)).toBe(true);
  });

  it('should return false when properties are deleted without includeDeleted', () => {
    const old = { a: 1, b: 2 };
    const newObj = { a: 1 };
    expect(hasObjectChanges(old, newObj)).toBe(false);
  });

  it('should return true when properties are deleted with includeDeleted', () => {
    const old = { a: 1, b: 2 };
    const newObj = { a: 1 };
    expect(hasObjectChanges(old, newObj, { includeDeleted: true })).toBe(true);
  });
});

describe('applyDiff', () => {
  it('should apply simple changes', () => {
    const base = { a: 1, b: 2, c: 3 };
    const diff = { b: 4 };
    const result = applyDiff(base, diff);
    expect(result).toEqual({ a: 1, b: 4, c: 3 });
  });

  it('should apply nested changes', () => {
    const base = { a: 1, b: { c: 2, d: 3 } };
    const diff = { b: { c: 4 } };
    const result = applyDiff(base, diff as any);
    expect(result).toEqual({ a: 1, b: { c: 4, d: 3 } });
  });

  it('should handle added properties', () => {
    const base = { a: 1 };
    const diff = { b: 2 };
    const result = applyDiff(base, diff as any);
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it('should handle deleted properties', () => {
    const base = { a: 1, b: 2 };
    const diff = { b: undefined };
    const result = applyDiff(base, diff as any);
    expect(result).toEqual({ a: 1 });
  });

  it('should handle complex nested structures', () => {
    const base = {
      user: {
        name: 'John',
        age: 30,
        address: {
          city: 'NYC',
          zip: '10001',
        },
      },
    };
    const diff = {
      user: {
        age: 31,
        address: {
          city: 'LA',
        },
      },
    };
    const result = applyDiff(base, diff as any);
    expect(result).toEqual({
      user: {
        name: 'John',
        age: 31,
        address: {
          city: 'LA',
          zip: '10001',
        },
      },
    });
  });

  it('should handle array replacements', () => {
    const base = { items: [1, 2, 3] };
    const diff = { items: [4, 5, 6] };
    const result = applyDiff(base, diff);
    expect(result).toEqual({ items: [4, 5, 6] });
  });
});

describe('getChangedPaths', () => {
  it('should return empty array when no changes', () => {
    const obj = { a: 1, b: 2 };
    const paths = getChangedPaths(obj, obj);
    expect(paths).toEqual([]);
  });

  it('should return paths to changed values', () => {
    const old = { a: 1, b: { c: 2, d: 3 } };
    const newObj = { a: 1, b: { c: 4, d: 3 } };
    const paths = getChangedPaths(old, newObj);
    expect(paths).toEqual(['b.c']);
  });

  it('should return paths for added properties', () => {
    const old = { a: 1 };
    const newObj = { a: 1, b: 2 };
    const paths = getChangedPaths(old, newObj);
    expect(paths).toEqual(['b']);
  });

  it('should return paths for deleted properties', () => {
    const old = { a: 1, b: 2 };
    const newObj = { a: 1 };
    const paths = getChangedPaths(old, newObj);
    expect(paths).toEqual(['b']);
  });

  it('should handle deeply nested paths', () => {
    const old = { a: { b: { c: { d: 1 } } } };
    const newObj = { a: { b: { c: { d: 2 } } } };
    const paths = getChangedPaths(old, newObj);
    expect(paths).toEqual(['a.b.c.d']);
  });

  it('should handle multiple changes', () => {
    const old = { a: 1, b: { c: 2 }, d: { e: 3 } };
    const newObj = { a: 2, b: { c: 4 }, d: { e: 3 } };
    const paths = getChangedPaths(old, newObj);
    expect(paths.sort()).toEqual(['a', 'b.c'].sort());
  });

  it('should return paths with array indices for array changes', () => {
    const old = {
      items: [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ],
    };
    const newObj = {
      items: [
        { id: 1, name: 'x' },
        { id: 2, name: 'b' },
      ],
    };
    const paths = getChangedPaths(old, newObj);
    expect(paths).toEqual(['items[0].name']);
  });

  it('should handle multiple array element changes', () => {
    const old = { items: [{ name: 'a' }, { name: 'b' }, { name: 'c' }] };
    const newObj = { items: [{ name: 'x' }, { name: 'b' }, { name: 'z' }] };
    const paths = getChangedPaths(old, newObj);
    expect(paths.sort()).toEqual(['items[0].name', 'items[2].name'].sort());
  });

  it('should handle nested arrays with indices', () => {
    const old = { data: { items: [{ value: 1 }, { value: 2 }] } };
    const newObj = { data: { items: [{ value: 1 }, { value: 3 }] } };
    const paths = getChangedPaths(old, newObj);
    expect(paths).toEqual(['data.items[1].value']);
  });

  it('should handle added array elements', () => {
    const old = { items: [1, 2] };
    const newObj = { items: [1, 2, 3] };
    const paths = getChangedPaths(old, newObj);
    expect(paths).toEqual(['items[2]']);
  });

  it('should handle deleted array elements', () => {
    const old = { items: [1, 2, 3] };
    const newObj = { items: [1, 2] };
    const paths = getChangedPaths(old, newObj);
    expect(paths).toEqual(['items[2]']);
  });

  it('should handle primitive array element changes', () => {
    const old = { items: [1, 2, 3] };
    const newObj = { items: [1, 5, 3] };
    const paths = getChangedPaths(old, newObj);
    expect(paths).toEqual(['items[1]']);
  });

  it('should handle deeply nested array paths', () => {
    const old = {
      data: {
        items: [{ nested: [{ value: 1 }, { value: 2 }] }],
      },
    };
    const newObj = {
      data: {
        items: [{ nested: [{ value: 1 }, { value: 3 }] }],
      },
    };
    const paths = getChangedPaths(old, newObj);
    expect(paths).toEqual(['data.items[0].nested[1].value']);
  });
});

describe('diffObjectDetailed with array indices', () => {
  it('should track array element modifications with indices', () => {
    const old = {
      items: [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ],
    };
    const newObj = {
      items: [
        { id: 1, name: 'x' },
        { id: 2, name: 'b' },
      ],
    };
    const result = diffObjectDetailed(old, newObj);

    expect(result.modified).toContain('items[0].name');
    expect(result.hasChanges).toBe(true);
  });

  it('should track added array elements with indices', () => {
    const old = { items: [{ name: 'a' }] };
    const newObj = { items: [{ name: 'a' }, { name: 'b' }] };
    const result = diffObjectDetailed(old, newObj);

    expect(result.added).toContain('items[1]');
    expect(result.hasChanges).toBe(true);
  });

  it('should track deleted array elements with indices', () => {
    const old = { items: [{ name: 'a' }, { name: 'b' }] };
    const newObj = { items: [{ name: 'a' }] };
    const result = diffObjectDetailed(old, newObj, { includeDeleted: true });

    expect(result.deleted).toContain('items[1]');
    expect(result.hasChanges).toBe(true);
  });

  it('sould remove', () => {
    const array = ['task 1', 'task 2'];
    const diff = diffObjectDetailed(array, ['task 2']);
    console.log('copy', diff);
  });

  it('should track multiple array changes with indices', () => {
    const old = {
      items: [
        { id: 1, name: 'a', active: true },
        { id: 2, name: 'b', active: false },
      ],
    };
    const newObj = {
      items: [
        { id: 1, name: 'x', active: true },
        { id: 2, name: 'y', active: true },
      ],
    };
    const result = diffObjectDetailed(old, newObj);

    expect(result.modified).toContain('items[0].name');
    expect(result.modified).toContain('items[1].name');
    expect(result.modified).toContain('items[1].active');
    expect(result.hasChanges).toBe(true);
  });

  it('should handle nested array and object paths', () => {
    const old = {
      data: {
        users: [{ name: 'John', tags: ['admin', 'user'] }],
      },
    };
    const newObj = {
      data: {
        users: [{ name: 'John', tags: ['admin', 'moderator'] }],
      },
    };
    const result = diffObjectDetailed(old, newObj);

    expect(result.modified.some((p) => p.includes('data.users[0].tags'))).toBe(
      true
    );
    expect(result.hasChanges).toBe(true);
  });
});

describe('integration tests', () => {
  it('should handle complete workflow', () => {
    const original = {
      user: {
        name: 'John',
        age: 30,
        address: {
          city: 'NYC',
          zip: '10001',
        },
      },
      settings: {
        theme: 'dark',
        notifications: true,
      },
    };

    const updated = {
      user: {
        name: 'John',
        age: 31,
        address: {
          city: 'LA',
          zip: '10001',
        },
      },
      settings: {
        theme: 'light',
        notifications: true,
      },
    };

    const diff = diffObject(original, updated);
    expect(diff).toEqual({
      user: {
        age: 31,
        address: {
          city: 'LA',
        },
      },
      settings: {
        theme: 'light',
      },
    });

    // Check if there are changes
    expect(hasObjectChanges(original, updated)).toBe(true);

    // Get detailed info
    const detailed = diffObjectDetailed(original, updated);
    expect(detailed.hasChanges).toBe(true);
    expect(detailed.modified.sort()).toEqual(
      ['user.age', 'user.address.city', 'settings.theme'].sort()
    );

    const paths = getChangedPaths(original, updated);
    expect(paths.sort()).toEqual(
      ['user.age', 'user.address.city', 'settings.theme'].sort()
    );
  });

  it('should handle complete workflow with arrays', () => {
    const original = {
      users: [
        { id: 1, name: 'John', age: 30, tags: ['admin', 'user'] },
        { id: 2, name: 'Jane', age: 25, tags: ['user'] },
        { id: 3, name: 'Bob', age: 35, tags: ['moderator'] },
      ],
      metadata: {
        count: 3,
        lastUpdate: '2024-01-01',
      },
    };

    const updated = {
      users: [
        { id: 1, name: 'John', age: 31, tags: ['admin', 'user'] },
        { id: 2, name: 'Jane', age: 25, tags: ['editor'] },
        { id: 3, name: 'Bob', age: 35, tags: ['moderator'] },
        { id: 4, name: 'Alice', age: 28, tags: ['user'] },
      ],
      metadata: {
        count: 4,
        lastUpdate: '2024-01-02',
      },
    };

    const diff = diffObject(original, updated);
    expect(diff.users).toBeDefined();
    expect(diff.metadata).toBeDefined();

    // Check if there are changes
    expect(hasObjectChanges(original, updated)).toBe(true);

    // Get detailed info with array indices
    const detailed = diffObjectDetailed(original, updated);
    expect(detailed.hasChanges).toBe(true);
    expect(detailed.modified).toContain('users[0].age');
    expect(detailed.modified).toContain('users[1].tags[0]');
    expect(detailed.modified).toContain('metadata.count');
    expect(detailed.modified).toContain('metadata.lastUpdate');
    expect(detailed.added).toContain('users[3]');

    // Get changed paths with array indices
    const paths = getChangedPaths(original, updated);
    expect(paths).toContain('users[0].age');
    expect(paths).toContain('users[1].tags[0]');
    expect(paths).toContain('users[3]');
    expect(paths).toContain('metadata.count');
    expect(paths).toContain('metadata.lastUpdate');

    // Apply diff and verify
    const result = applyDiff(original, diff);
    expect(result.users![0].age).toBe(31);
    expect(result.users![1].tags).toEqual(['editor']);
    expect(result.users![3]).toEqual({
      id: 4,
      name: 'Alice',
      age: 28,
      tags: ['user'],
    });
    expect(result.metadata!.count).toBe(4);
  });
});
