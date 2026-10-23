import { describe, it, expect } from 'vitest';
import {
  chunk,
  flatten,
  flattenDeep,
  unique,
  groupBy,
  countBy,
  keyBy,
  sortBy,
  difference,
  intersection,
  union,
  partition,
  take,
  takeLast,
  takeWhile,
  drop,
  dropWhile,
  compact,
  zip,
  unzip,
  shuffle,
  sample,
  sampleSize,
  findIndex,
  findLastIndex,
  pluck,
  pick,
  omit,
  flatMap,
  reduceRight,
  range,
  fill,
  deepCloneArray,
  mergeByKey,
  move,
  rotate,
  insert,
  remove,
  replace,
  filterCompact,
  cartesian,
  findAllIndices,
  isEqual,
  chunkBy,
  updateBy,
  splitDuplicates,
  ensureArray,
  wrap,
  slidingWindow,
  minBy,
  maxBy,
  sumBy,
  avgBy,
  frequencies,
  mostCommon,
  leastCommon,
  batchProcess,
  batchProcessParallel,
  transpose,
  isArrayEqual,
  hasSameElements,
  isSubset,
  isSuperset,
  interleave,
  bifurcate,
  generate,
  repeat,
  median,
  mode,
  without,
  differenceWith,
  groupConsecutive,
  dedupeConsecutive,
  rank,
  percentile,
  quartiles,
  standardDeviation,
  variance,
  normalize,
  standardize,
  scan,
  cumulativeSum,
  diff,
  pad,
  trim,
  pairwise,
  enumerate,
  applyByIndex,
  rotateLeft,
  rotateRight,
  swap,
  reverseSegment,
  isSorted,
  hasDuplicates,
  pickMany,
  toObject,
  mapAsync,
  mapAsyncParallel,
  filterAsync,
  reduceAsync,
  findAsync,
  someAsync,
  everyAsync,
  weightedAverage,
  weightedSample,
  segment,
  selectByCount,
  filterConsecutive,
  mapWithContext,
  batch,
  zipWith,
  mergeArraysByKey,
  indexBy,
  binarySearch,
  insertSorted,
} from './advanced.js';
import { isArray, isNonEmptyArray } from './utils.js';

describe('Array Type Guards', () => {
  describe('isArray', () => {
    it('should return true for arrays', () => {
      expect(isArray([])).toBe(true);
      expect(isArray([1, 2, 3])).toBe(true);
    });

    it('should return false for non-arrays', () => {
      expect(isArray(null)).toBe(false);
      expect(isArray(undefined)).toBe(false);
      expect(isArray('string')).toBe(false);
      expect(isArray(123)).toBe(false);
      expect(isArray({})).toBe(false);
    });
  });

  describe('isNonEmptyArray', () => {
    it('should return true for non-empty arrays', () => {
      expect(isNonEmptyArray([1])).toBe(true);
      expect(isNonEmptyArray([1, 2, 3])).toBe(true);
    });

    it('should return false for empty arrays and non-arrays', () => {
      expect(isNonEmptyArray([])).toBe(false);
      expect(isNonEmptyArray(null)).toBe(false);
      expect(isNonEmptyArray(undefined)).toBe(false);
    });
  });
});

describe('Array Chunking and Flattening', () => {
  describe('chunk', () => {
    it('should chunk array into smaller arrays', () => {
      expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
      expect(chunk([1, 2, 3, 4, 5, 6], 3)).toEqual([
        [1, 2, 3],
        [4, 5, 6],
      ]);
    });

    it('should handle edge cases', () => {
      expect(chunk([], 2)).toEqual([]);
      expect(chunk([1, 2], 0)).toEqual([]);
      expect(chunk([1, 2], 10)).toEqual([[1, 2]]);
    });
  });

  describe('flatten', () => {
    it('should flatten array by one level', () => {
      expect(
        flatten([
          [1, 2],
          [3, 4],
        ])
      ).toEqual([1, 2, 3, 4]);
      expect(flatten([[1], [2], [3]])).toEqual([1, 2, 3]);
    });

    it('should not flatten deeply nested arrays', () => {
      expect(
        flatten([
          [1, [2]],
          [3, [4]],
        ])
      ).toEqual([1, [2], 3, [4]]);
    });
  });

  describe('flattenDeep', () => {
    it('should flatten array recursively', () => {
      expect(flattenDeep([1, [2, [3, [4]]]])).toEqual([1, 2, 3, 4]);
      expect(flattenDeep([[1, 2], [[3]], [[[4]]]])).toEqual([1, 2, 3, 4]);
    });

    it('should handle empty arrays', () => {
      expect(flattenDeep([])).toEqual([]);
      expect(flattenDeep([[[]]])).toEqual([]);
    });
  });
});

describe('Array Uniqueness and Grouping', () => {
  describe('unique', () => {
    it('should return unique primitive values', () => {
      expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
      expect(unique(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
    });

    it('should handle objects with key selector', () => {
      const arr = [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
        { id: 1, name: 'C' },
      ];
      expect(unique(arr, 'id')).toEqual([
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
      ]);
    });

    it('should handle function selector', () => {
      const arr = [{ x: 1 }, { x: 2 }, { x: 1 }];
      expect(unique(arr, (item) => item.x)).toEqual([{ x: 1 }, { x: 2 }]);
    });
  });

  describe('groupBy', () => {
    it('should group by key', () => {
      const arr = [
        { type: 'a', val: 1 },
        { type: 'b', val: 2 },
        { type: 'a', val: 3 },
      ];
      expect(groupBy(arr, 'type')).toEqual({
        a: [
          { type: 'a', val: 1 },
          { type: 'a', val: 3 },
        ],
        b: [{ type: 'b', val: 2 }],
      });
    });

    it('should group by function', () => {
      const arr = [1, 2, 3, 4, 5, 6];
      expect(groupBy(arr, (x) => (x % 2 === 0 ? 'even' : 'odd'))).toEqual({
        odd: [1, 3, 5],
        even: [2, 4, 6],
      });
    });
  });

  describe('countBy', () => {
    it('should count by key', () => {
      const arr = [{ type: 'a' }, { type: 'b' }, { type: 'a' }, { type: 'a' }];
      expect(countBy(arr, 'type')).toEqual({ a: 3, b: 1 });
    });

    it('should count by function', () => {
      const arr = [1, 2, 3, 4, 5, 6];
      expect(countBy(arr, (x) => (x % 2 === 0 ? 'even' : 'odd'))).toEqual({
        odd: 3,
        even: 3,
      });
    });
  });

  describe('keyBy', () => {
    it('should create map by key', () => {
      const arr = [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
      ];
      expect(keyBy(arr, 'id')).toEqual({
        1: { id: 1, name: 'A' },
        2: { id: 2, name: 'B' },
      });
    });
  });
});

describe('Array Sorting and Ordering', () => {
  describe('sortBy', () => {
    it('should sort by single key ascending', () => {
      const arr = [{ age: 30 }, { age: 20 }, { age: 25 }];
      expect(sortBy(arr, 'age')).toEqual([
        { age: 20 },
        { age: 25 },
        { age: 30 },
      ]);
    });

    it('should sort by single key descending', () => {
      const arr = [{ age: 20 }, { age: 30 }, { age: 25 }];
      expect(sortBy(arr, [{ key: 'age', dir: 'desc' }])).toEqual([
        { age: 30 },
        { age: 25 },
        { age: 20 },
      ]);
    });

    it('should sort by multiple keys', () => {
      const arr = [
        { name: 'B', age: 30 },
        { name: 'A', age: 20 },
        { name: 'A', age: 30 },
      ];
      expect(sortBy(arr, ['name', 'age'])).toEqual([
        { name: 'A', age: 20 },
        { name: 'A', age: 30 },
        { name: 'B', age: 30 },
      ]);
    });
  });
});

describe('Set Operations', () => {
  describe('difference', () => {
    it('should return elements in first array but not second', () => {
      expect(difference([1, 2, 3, 4], [2, 4])).toEqual([1, 3]);
      expect(difference([1, 2, 3], [4, 5, 6])).toEqual([1, 2, 3]);
    });

    it('should handle objects with key', () => {
      const arr1 = [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
      ];
      const arr2 = [{ id: 2, name: 'C' }];
      expect(difference(arr1, arr2, 'id')).toEqual([{ id: 1, name: 'A' }]);
    });
  });

  describe('intersection', () => {
    it('should return common elements', () => {
      expect(intersection([1, 2, 3], [2, 3, 4])).toEqual([2, 3]);
      expect(intersection([1, 2], [3, 4])).toEqual([]);
    });

    it('should handle objects with key', () => {
      const arr1 = [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
      ];
      const arr2 = [
        { id: 2, name: 'C' },
        { id: 3, name: 'D' },
      ];
      expect(intersection(arr1, arr2, 'id')).toEqual([{ id: 2, name: 'B' }]);
    });
  });

  describe('union', () => {
    it('should return unique elements from both arrays', () => {
      expect(union([1, 2, 3], [2, 3, 4])).toEqual([1, 2, 3, 4]);
      expect(union([1, 1, 2], [2, 3, 3])).toEqual([1, 2, 3]);
    });
  });
});

describe('Array Partitioning and Selection', () => {
  describe('partition', () => {
    it('should partition array by predicate', () => {
      const [even, odd] = partition([1, 2, 3, 4, 5], (x) => x % 2 === 0);
      expect(even).toEqual([2, 4]);
      expect(odd).toEqual([1, 3, 5]);
    });
  });

  describe('take', () => {
    it('should take first n elements', () => {
      expect(take([1, 2, 3, 4, 5], 3)).toEqual([1, 2, 3]);
      expect(take([1, 2], 5)).toEqual([1, 2]);
    });
  });

  describe('takeLast', () => {
    it('should take last n elements', () => {
      expect(takeLast([1, 2, 3, 4, 5], 3)).toEqual([3, 4, 5]);
      expect(takeLast([1, 2], 5)).toEqual([1, 2]);
    });
  });

  describe('takeWhile', () => {
    it('should take while predicate is true', () => {
      expect(takeWhile([1, 2, 3, 4, 1], (x) => x < 3)).toEqual([1, 2]);
      expect(takeWhile([1, 2, 3], (x) => x > 5)).toEqual([]);
    });
  });

  describe('drop', () => {
    it('should drop first n elements', () => {
      expect(drop([1, 2, 3, 4, 5], 2)).toEqual([3, 4, 5]);
      expect(drop([1, 2], 5)).toEqual([]);
    });
  });

  describe('dropWhile', () => {
    it('should drop while predicate is true', () => {
      expect(dropWhile([1, 2, 3, 4, 1], (x) => x < 3)).toEqual([3, 4, 1]);
      expect(dropWhile([1, 2, 3], (x) => x < 5)).toEqual([]);
    });
  });
});

describe('Array Filtering', () => {
  describe('compact', () => {
    it('should remove falsy values', () => {
      expect(compact([0, 1, false, 2, '', 3, null, undefined])).toEqual([
        1, 2, 3,
      ]);
    });
  });

  describe('filterCompact', () => {
    it('should filter and remove nullish values', () => {
      const arr = [1, 2, 3, 4, 5, null, 6];
      expect(filterCompact(arr, (x) => (x ?? 0) > 2)).toEqual([3, 4, 5, 6]);
    });
  });
});

describe('Array Transformation', () => {
  describe('zip', () => {
    it('should zip arrays together', () => {
      expect(zip([1, 2], ['a', 'b'], [true, false])).toEqual([
        [1, 'a', true],
        [2, 'b', false],
      ]);
    });

    it('should handle arrays of different lengths', () => {
      expect(zip([1, 2, 3], ['a'])).toEqual([
        [1, 'a'],
        [2, undefined],
        [3, undefined],
      ]);
    });
  });

  describe('unzip', () => {
    it('should unzip array of tuples', () => {
      expect(
        unzip([
          [1, 'a', true],
          [2, 'b', false],
        ])
      ).toEqual([
        [1, 2],
        ['a', 'b'],
        [true, false],
      ]);
    });
  });

  describe('transpose', () => {
    it('should transpose 2D array', () => {
      expect(
        transpose([
          [1, 2],
          [3, 4],
          [5, 6],
        ])
      ).toEqual([
        [1, 3, 5],
        [2, 4, 6],
      ]);
    });
  });
});

describe('Random Operations', () => {
  describe('shuffle', () => {
    it('should shuffle array', () => {
      const arr = [1, 2, 3, 4, 5];
      const shuffled = shuffle(arr);
      expect(shuffled).toHaveLength(arr.length);
      expect(shuffled.sort()).toEqual(arr.sort());
    });
  });

  describe('sample', () => {
    it('should return random element', () => {
      const arr = [1, 2, 3, 4, 5];
      const sampled = sample(arr);
      expect(arr).toContain(sampled);
    });
  });

  describe('sampleSize', () => {
    it('should return n random elements', () => {
      const arr = [1, 2, 3, 4, 5];
      const sampled = sampleSize(arr, 3);
      expect(sampled).toHaveLength(3);
      sampled.forEach((item) => expect(arr).toContain(item));
    });
  });
});

describe('Array Search', () => {
  describe('findIndex', () => {
    it('should find index of element matching predicate', () => {
      expect(findIndex([1, 2, 3, 4], (x) => x > 2)).toBe(2);
      expect(findIndex([1, 2, 3], (x) => x > 5)).toBe(-1);
    });
  });

  describe('findLastIndex', () => {
    it('should find last index of element matching predicate', () => {
      expect(findLastIndex([1, 2, 3, 2, 1], (x) => x === 2)).toBe(3);
      expect(findLastIndex([1, 2, 3], (x) => x > 5)).toBe(-1);
    });
  });

  describe('findAllIndices', () => {
    it('should find all indices matching predicate', () => {
      expect(findAllIndices([1, 2, 3, 2, 1], (x) => x === 2)).toEqual([1, 3]);
      expect(findAllIndices([1, 2, 3, 4, 5], (x) => x % 2 === 0)).toEqual([
        1, 3,
      ]);
    });
  });

  describe('binarySearch', () => {
    it('should find element in sorted array', () => {
      expect(binarySearch([1, 2, 3, 4, 5], 3)).toBe(2);
      expect(binarySearch([1, 2, 4, 5], 3)).toBe(-1);
    });

    it('should handle custom comparison', () => {
      const arr = [{ x: 1 }, { x: 2 }, { x: 3 }];
      expect(binarySearch(arr, { x: 2 }, (a, b) => a.x - b.x)).toBe(1);
    });
  });
});

describe('Object Array Operations', () => {
  describe('pluck', () => {
    it('should extract values by key', () => {
      const arr = [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
      ];
      expect(pluck(arr, 'name')).toEqual(['A', 'B']);
      expect(pluck(arr, 'id')).toEqual([1, 2]);
    });
  });

  describe('pick', () => {
    it('should pick specified keys from objects', () => {
      const arr = [
        { id: 1, name: 'A', age: 30 },
        { id: 2, name: 'B', age: 25 },
      ];
      expect(pick(arr, ['id', 'name'])).toEqual([
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
      ]);
    });
  });

  describe('omit', () => {
    it('should omit specified keys from objects', () => {
      const arr = [
        { id: 1, name: 'A', age: 30 },
        { id: 2, name: 'B', age: 25 },
      ];
      expect(omit(arr, ['age'])).toEqual([
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
      ]);
    });
  });
});

describe('Advanced Transformations', () => {
  describe('flatMap', () => {
    it('should map and flatten', () => {
      expect(flatMap([1, 2, 3], (x) => [x, x * 2])).toEqual([1, 2, 2, 4, 3, 6]);
    });
  });

  describe('reduceRight', () => {
    it('should reduce from right to left', () => {
      expect(reduceRight([1, 2, 3, 4], (acc, x) => acc - x, 10)).toBe(0);
    });
  });

  describe('cartesian', () => {
    it('should compute cartesian product', () => {
      expect(cartesian([1, 2], ['a', 'b'])).toEqual([
        [1, 'a'],
        [1, 'b'],
        [2, 'a'],
        [2, 'b'],
      ]);
    });
  });
});

describe('Array Generation', () => {
  describe('range', () => {
    it('should generate range with step', () => {
      expect(range(0, 5, 1)).toEqual([0, 1, 2, 3, 4]);
      expect(range(0, 10, 2)).toEqual([0, 2, 4, 6, 8]);
      expect(range(5, 0, -1)).toEqual([5, 4, 3, 2, 1]);
    });
  });

  describe('fill', () => {
    it('should fill array with value', () => {
      expect(fill([1, 2, 3], 0)).toEqual([0, 0, 0]);
      expect(fill([1, 2, 3, 4, 5], 9, 1, 3)).toEqual([1, 9, 9, 4, 5]);
    });
  });

  describe('generate', () => {
    it('should generate array with function', () => {
      expect(generate(5, (i) => i * 2)).toEqual([0, 2, 4, 6, 8]);
      expect(generate(3, (i) => String.fromCharCode(65 + i))).toEqual([
        'A',
        'B',
        'C',
      ]);
    });
  });

  describe('repeat', () => {
    it('should repeat array n times', () => {
      expect(repeat([1, 2], 3)).toEqual([1, 2, 1, 2, 1, 2]);
      expect(repeat([1], 4)).toEqual([1, 1, 1, 1]);
    });
  });
});

describe('Array Manipulation', () => {
  describe('move', () => {
    it('should move element from one index to another', () => {
      expect(move([1, 2, 3, 4, 5], 0, 4)).toEqual([2, 3, 4, 5, 1]);
      expect(move([1, 2, 3, 4, 5], 4, 0)).toEqual([5, 1, 2, 3, 4]);
    });
  });

  describe('rotate', () => {
    it('should rotate array', () => {
      expect(rotate([1, 2, 3, 4, 5], 2)).toEqual([4, 5, 1, 2, 3]);
      expect(rotate([1, 2, 3, 4, 5], -2)).toEqual([3, 4, 5, 1, 2]);
    });
  });

  describe('insert', () => {
    it('should insert element at index', () => {
      expect(insert([1, 2, 4], 2, 3)).toEqual([1, 2, 3, 4]);
      expect(insert([1, 2, 3], 0, 0)).toEqual([0, 1, 2, 3]);
    });
  });

  describe('remove', () => {
    it('should remove element at index', () => {
      expect(remove([1, 2, 3, 4], 2)).toEqual([1, 2, 4]);
      expect(remove([1, 2, 3], 0)).toEqual([2, 3]);
    });
  });

  describe('replace', () => {
    it('should replace element at index', () => {
      expect(replace([1, 2, 3, 4], 2, 99)).toEqual([1, 2, 99, 4]);
      expect(replace([1, 2, 3], 0, 0)).toEqual([0, 2, 3]);
    });
  });

  describe('swap', () => {
    it('should swap two elements', () => {
      expect(swap([1, 2, 3, 4], 0, 3)).toEqual([4, 2, 3, 1]);
      expect(swap([1, 2, 3], 0, 2)).toEqual([3, 2, 1]);
    });
  });

  describe('reverseSegment', () => {
    it('should reverse segment of array', () => {
      expect(reverseSegment([1, 2, 3, 4, 5], 1, 3)).toEqual([1, 4, 3, 2, 5]);
    });
  });
});

describe('Array Comparison', () => {
  describe('isEqual', () => {
    it('should check deep equality of arrays', () => {
      expect(isEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(isEqual([{ a: 1 }, { b: 2 }], [{ a: 1 }, { b: 2 }])).toBe(true);
      expect(isEqual([1, 2, 3], [1, 2, 4])).toBe(false);
    });
  });

  describe('isArrayEqual', () => {
    it('should check shallow equality', () => {
      expect(isArrayEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(isArrayEqual([1, 2, 3], [1, 2, 4])).toBe(false);
      expect(isArrayEqual([1, 2], [1, 2, 3])).toBe(false);
    });
  });

  describe('hasSameElements', () => {
    it('should check if arrays have same elements regardless of order', () => {
      expect(hasSameElements([1, 2, 3], [3, 2, 1])).toBe(true);
      expect(hasSameElements([1, 2, 2], [2, 1, 2])).toBe(true);
      expect(hasSameElements([1, 2], [1, 2, 2])).toBe(false);
    });
  });

  describe('isSubset', () => {
    it('should check if array1 is subset of array2', () => {
      expect(isSubset([1, 2], [1, 2, 3, 4])).toBe(true);
      expect(isSubset([1, 5], [1, 2, 3, 4])).toBe(false);
    });
  });

  describe('isSuperset', () => {
    it('should check if array1 is superset of array2', () => {
      expect(isSuperset([1, 2, 3, 4], [1, 2])).toBe(true);
      expect(isSuperset([1, 2, 3], [1, 5])).toBe(false);
    });
  });

  describe('isSorted', () => {
    it('should check if array is sorted', () => {
      expect(isSorted([1, 2, 3, 4])).toBe(true);
      expect(isSorted([1, 3, 2, 4])).toBe(false);
      expect(isSorted([4, 3, 2, 1], (a, b) => b - a)).toBe(true);
    });
  });

  describe('hasDuplicates', () => {
    it('should check if array has duplicates', () => {
      expect(hasDuplicates([1, 2, 3])).toBe(false);
      expect(hasDuplicates([1, 2, 2, 3])).toBe(true);
    });
  });
});

describe('Chunking and Windowing', () => {
  describe('chunkBy', () => {
    it('should chunk by predicate', () => {
      const arr = [1, 1, 2, 2, 2, 3, 3];
      expect(chunkBy(arr, (x) => x)).toEqual([
        [1, 1],
        [2, 2, 2],
        [3, 3],
      ]);
    });
  });

  describe('slidingWindow', () => {
    it('should create sliding windows', () => {
      expect(slidingWindow([1, 2, 3, 4, 5], 3)).toEqual([
        [1, 2, 3],
        [2, 3, 4],
        [3, 4, 5],
      ]);
      expect(slidingWindow([1, 2, 3, 4, 5], 2, 2)).toEqual([
        [1, 2],
        [3, 4],
      ]);
    });
  });
});

describe('Statistical Operations', () => {
  describe('minBy', () => {
    it('should find minimum by key', () => {
      const arr = [{ age: 30 }, { age: 20 }, { age: 25 }];
      expect(minBy(arr, 'age')).toEqual({ age: 20 });
    });

    it('should work with function selector', () => {
      const arr = [{ x: 5 }, { x: 2 }, { x: 8 }];
      expect(minBy(arr, (item) => item.x)).toEqual({ x: 2 });
    });
  });

  describe('maxBy', () => {
    it('should find maximum by key', () => {
      const arr = [{ age: 30 }, { age: 20 }, { age: 25 }];
      expect(maxBy(arr, 'age')).toEqual({ age: 30 });
    });
  });

  describe('sumBy', () => {
    it('should sum values by key', () => {
      const arr = [{ price: 10 }, { price: 20 }, { price: 30 }];
      expect(sumBy(arr, 'price')).toBe(60);
    });

    it('should work with function selector', () => {
      const arr = [{ x: 5 }, { x: 10 }, { x: 15 }];
      expect(sumBy(arr, (item) => item.x)).toBe(30);
    });
  });

  describe('avgBy', () => {
    it('should calculate average by key', () => {
      const arr = [{ score: 80 }, { score: 90 }, { score: 100 }];
      expect(avgBy(arr, 'score')).toBe(90);
    });
  });

  describe('median', () => {
    it('should find median of odd-length array', () => {
      expect(median([1, 2, 3, 4, 5])).toBe(3);
    });

    it('should find median of even-length array', () => {
      expect(median([1, 2, 3, 4])).toBe(2.5);
    });
  });

  describe('mode', () => {
    it('should find most frequent value', () => {
      expect(mode([1, 2, 2, 3, 3, 3])).toBe(3);
    });
  });

  describe('standardDeviation', () => {
    it('should calculate standard deviation', () => {
      const result = standardDeviation([2, 4, 4, 4, 5, 5, 7, 9]);
      expect(result).toBeCloseTo(2, 1);
    });
  });

  describe('variance', () => {
    it('should calculate variance', () => {
      const result = variance([2, 4, 4, 4, 5, 5, 7, 9]);
      expect(result).toBeCloseTo(4, 1);
    });
  });

  describe('normalize', () => {
    it('should normalize values to 0-1 range', () => {
      expect(normalize([1, 2, 3, 4, 5])).toEqual([0, 0.25, 0.5, 0.75, 1]);
    });
  });

  describe('standardize', () => {
    it('should standardize values', () => {
      const result = standardize([2, 4, 4, 4, 5, 5, 7, 9]);
      const avg = result.reduce((sum, x) => sum + x, 0) / result.length;
      expect(avg).toBeCloseTo(0, 10);
    });
  });

  describe('rank', () => {
    it('should assign standard ranks', () => {
      expect(rank([10, 20, 20, 30])).toEqual([1, 2, 2, 4]);
    });

    it('should assign dense ranks', () => {
      expect(rank([10, 20, 20, 30], 'dense')).toEqual([1, 2, 2, 3]);
    });

    it('should assign ordinal ranks', () => {
      expect(rank([10, 20, 20, 30], 'ordinal')).toEqual([1, 2, 3, 4]);
    });
  });

  describe('percentile', () => {
    it('should calculate percentile', () => {
      expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3);
      expect(percentile([1, 2, 3, 4, 5, 6], 75)).toBe(4.75);
    });
  });

  describe('quartiles', () => {
    it('should calculate quartiles', () => {
      const result = quartiles([1, 2, 3, 4, 5]);
      expect(result).toBeDefined();
      expect(result!.q2).toBe(3);
      expect(result!.iqr).toBeGreaterThan(0);
    });
  });
});

describe('Frequency Operations', () => {
  describe('frequencies', () => {
    it('should count frequencies', () => {
      const freq = frequencies([1, 2, 2, 3, 3, 3]);
      expect(freq.get(1)).toBe(1);
      expect(freq.get(2)).toBe(2);
      expect(freq.get(3)).toBe(3);
    });
  });

  describe('mostCommon', () => {
    it('should find most common values', () => {
      expect(mostCommon([1, 2, 2, 3, 3, 3])).toEqual([3]);
      expect(mostCommon([1, 1, 2, 2, 3], 2).sort()).toEqual([1, 2]);
    });
  });

  describe('leastCommon', () => {
    it('should find least common values', () => {
      expect(leastCommon([1, 2, 2, 3, 3, 3])).toEqual([1]);
    });
  });
});

describe('Batch Processing', () => {
  describe('batchProcess', () => {
    it('should process batches sequentially', async () => {
      const results: number[][] = [];
      await batchProcess([1, 2, 3, 4, 5], 2, async (batch) => {
        results.push(batch);
      });
      expect(results).toEqual([[1, 2], [3, 4], [5]]);
    });
  });

  describe('batchProcessParallel', () => {
    it('should process batches in parallel', async () => {
      const results: number[][] = [];
      await batchProcessParallel([1, 2, 3, 4], 2, 2, async (batch) => {
        results.push(batch);
      });
      expect(results).toHaveLength(2);
    });
  });
});

describe('Array Utilities', () => {
  describe('interleave', () => {
    it('should interleave arrays', () => {
      expect(interleave([1, 2], ['a', 'b'] as any[], [true, false])).toEqual([
        1,
        'a',
        true,
        2,
        'b',
        false,
      ]);
    });
  });

  describe('bifurcate', () => {
    it('should split array into pass and fail', () => {
      const result = bifurcate([1, 2, 3, 4, 5], (x) => x % 2 === 0);
      expect(result.pass).toEqual([2, 4]);
      expect(result.fail).toEqual([1, 3, 5]);
    });
  });

  describe('without', () => {
    it('should remove specified values', () => {
      expect(without([1, 2, 3, 2, 4], 2, 3)).toEqual([1, 4]);
    });
  });

  describe('differenceWith', () => {
    it('should compute difference with multiple arrays', () => {
      expect(differenceWith([1, 2, 3], [2], [3])).toEqual([1]);
    });
  });

  describe('groupConsecutive', () => {
    it('should group consecutive identical values', () => {
      expect(groupConsecutive([1, 1, 2, 2, 2, 3, 1])).toEqual([
        [1, 1],
        [2, 2, 2],
        [3],
        [1],
      ]);
    });
  });

  describe('dedupeConsecutive', () => {
    it('should remove consecutive duplicates', () => {
      expect(dedupeConsecutive([1, 1, 2, 2, 2, 3, 1])).toEqual([1, 2, 3, 1]);
    });
  });

  describe('scan', () => {
    it('should return cumulative results', () => {
      expect(scan([1, 2, 3, 4], (acc, x) => acc + x, 0)).toEqual([1, 3, 6, 10]);
    });
  });

  describe('cumulativeSum', () => {
    it('should calculate cumulative sum', () => {
      expect(cumulativeSum([1, 2, 3, 4])).toEqual([1, 3, 6, 10]);
    });
  });

  describe('diff', () => {
    it('should calculate differences', () => {
      expect(diff([1, 3, 6, 10])).toEqual([2, 3, 4]);
    });
  });

  describe('pad', () => {
    it('should pad array at end', () => {
      expect(pad([1, 2, 3], 5, 0)).toEqual([1, 2, 3, 0, 0]);
    });

    it('should pad array at start', () => {
      expect(pad([1, 2, 3], 5, 0, 'start')).toEqual([0, 0, 1, 2, 3]);
    });
  });

  describe('trim', () => {
    it('should trim matching elements from ends', () => {
      expect(trim([0, 0, 1, 2, 3, 0, 0], (x) => x === 0)).toEqual([1, 2, 3]);
    });
  });

  describe('pairwise', () => {
    it('should create pairs of adjacent elements', () => {
      expect(pairwise([1, 2, 3, 4])).toEqual([
        [1, 2],
        [2, 3],
        [3, 4],
      ]);
    });
  });

  describe('enumerate', () => {
    it('should create index-value pairs', () => {
      expect(enumerate(['a', 'b', 'c'])).toEqual([
        [0, 'a'],
        [1, 'b'],
        [2, 'c'],
      ]);
    });
  });

  describe('applyByIndex', () => {
    it('should apply functions by index', () => {
      expect(
        applyByIndex([1, 2, 3], [(x) => x * 2, (x) => x + 10, (x) => x ** 2])
      ).toEqual([2, 12, 9]);
    });
  });

  describe('rotateLeft', () => {
    it('should rotate left', () => {
      expect(rotateLeft([1, 2, 3, 4, 5], 2)).toEqual([3, 4, 5, 1, 2]);
    });
  });

  describe('rotateRight', () => {
    it('should rotate right', () => {
      expect(rotateRight([1, 2, 3, 4, 5], 2)).toEqual([4, 5, 1, 2, 3]);
    });
  });

  describe('segment', () => {
    it('should segment array by sizes', () => {
      expect(segment([1, 2, 3, 4, 5, 6], [2, 3, 1])).toEqual([
        [1, 2],
        [3, 4, 5],
        [6],
      ]);
    });
  });

  describe('toObject', () => {
    it('should convert array to object', () => {
      const arr = [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
      ];
      expect(
        toObject(
          arr,
          (x) => x.id,
          (x) => x.name
        )
      ).toEqual({
        1: 'A',
        2: 'B',
      });
    });
  });

  describe('indexBy', () => {
    it('should create index by key', () => {
      const arr = [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
      ];
      expect(indexBy(arr, 'id')).toEqual({
        '1': { id: 1, name: 'A' },
        '2': { id: 2, name: 'B' },
      });
    });
  });

  describe('insertSorted', () => {
    it('should insert value maintaining sort order', () => {
      expect(insertSorted([1, 3, 5, 7], 4)).toEqual([1, 3, 4, 5, 7]);
      expect(insertSorted([1, 2, 3], 0)).toEqual([0, 1, 2, 3]);
    });
  });
});

describe('Async Operations', () => {
  describe('mapAsync', () => {
    it('should map asynchronously in sequence', async () => {
      const result = await mapAsync([1, 2, 3], async (x) => x * 2);
      expect(result).toEqual([2, 4, 6]);
    });
  });

  describe('mapAsyncParallel', () => {
    it('should map asynchronously in parallel', async () => {
      const result = await mapAsyncParallel([1, 2, 3], async (x) => x * 2);
      expect(result).toEqual([2, 4, 6]);
    });
  });

  describe('filterAsync', () => {
    it('should filter asynchronously', async () => {
      const result = await filterAsync([1, 2, 3, 4, 5], async (x) => x > 2);
      expect(result).toEqual([3, 4, 5]);
    });
  });

  describe('reduceAsync', () => {
    it('should reduce asynchronously', async () => {
      const result = await reduceAsync(
        [1, 2, 3, 4],
        async (acc, x) => acc + x,
        0
      );
      expect(result).toBe(10);
    });
  });

  describe('findAsync', () => {
    it('should find element asynchronously', async () => {
      const result = await findAsync([1, 2, 3, 4], async (x) => x > 2);
      expect(result).toBe(3);
    });
  });

  describe('someAsync', () => {
    it('should check if some element matches', async () => {
      const result = await someAsync([1, 2, 3], async (x) => x > 2);
      expect(result).toBe(true);
    });
  });

  describe('everyAsync', () => {
    it('should check if every element matches', async () => {
      const result = await everyAsync([1, 2, 3], async (x) => x > 0);
      expect(result).toBe(true);
    });
  });
});

describe('Weighted Operations', () => {
  describe('weightedAverage', () => {
    it('should calculate weighted average', () => {
      const arr = [
        { score: 80, credits: 3 },
        { score: 90, credits: 2 },
      ];
      expect(weightedAverage(arr, 'score', 'credits')).toBe(84);
    });
  });

  describe('weightedSample', () => {
    it('should sample with weights', () => {
      const arr = [
        { item: 'A', prob: 0.7 },
        { item: 'B', prob: 0.3 },
      ];
      const samples = weightedSample(arr, 'prob', 10);
      expect(samples).toHaveLength(10);
      samples.forEach((s) => expect(arr).toContain(s));
    });
  });
});

describe('Advanced Utilities', () => {
  describe('zipWith', () => {
    it('should zip arrays with function', () => {
      expect(zipWith([1, 2, 3], [4, 5, 6], (a, b) => a + b)).toEqual([5, 7, 9]);
    });
  });

  describe('mapWithContext', () => {
    it('should map with accumulated context', () => {
      const result = mapWithContext(
        [1, 2, 3],
        (x, ctx) => ({ value: x + ctx, newContext: ctx + x }),
        0
      );
      expect(result).toEqual([1, 3, 6]);
    });
  });

  describe('mergeArraysByKey', () => {
    it('should merge arrays by key with last strategy', () => {
      const result = mergeArraysByKey(
        [[{ id: 1, a: 1 }], [{ id: 1, b: 2 }]],
        'id',
        'last'
      );
      expect(result).toEqual([{ id: 1, b: 2 }]);
    });
  });

  describe('selectByCount', () => {
    it('should select elements by occurrence count', () => {
      expect(selectByCount([1, 1, 2, 2, 2, 3], 2)).toEqual([1, 1]);
    });
  });

  describe('filterConsecutive', () => {
    it('should filter consecutive matches', () => {
      expect(filterConsecutive([1, 2, 2, 3, 3, 3], 2, (x) => x > 1)).toEqual([
        2, 2, 3, 3, 3,
      ]);
    });
  });

  describe('splitDuplicates', () => {
    it('should split unique and duplicate values', () => {
      const result = splitDuplicates([1, 2, 2, 3, 3, 3]);
      expect(result.unique).toEqual([1, 2, 3]);
      expect(result.duplicates.sort()).toEqual([2, 3, 3].sort());
    });
  });

  describe('updateBy', () => {
    it('should update matching elements', () => {
      const arr = [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
      ];
      const result = updateBy(arr, (x) => x.id === 1, { name: 'Updated' });
      expect(result[0].name).toBe('Updated');
    });
  });

  describe('mergeByKey', () => {
    it('should merge arrays by key', () => {
      const arr1 = [
        { id: 1, c: 1 },
        { id: 2, c: 2 },
      ];
      const arr2 = [
        { id: 1, b: 10 },
        { id: 3, b: 30 },
      ];
      const result = mergeByKey(arr1, arr2 as any, 'id');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('ensureArray', () => {
    it('should wrap non-arrays in array', () => {
      expect(ensureArray(1)).toEqual([1]);
      expect(ensureArray([1, 2])).toEqual([1, 2]);
    });
  });

  describe('wrap', () => {
    it('should wrap value in array', () => {
      expect(wrap(1)).toEqual([1]);
      expect(wrap([1])).toEqual([1]);
    });
  });

  describe('deepCloneArray', () => {
    it('should deep clone array', () => {
      const arr = [{ a: 1 }, { b: 2 }];
      const cloned = deepCloneArray(arr);
      expect(cloned).toEqual(arr);
      expect(cloned).not.toBe(arr);
      expect(cloned[0]).not.toBe(arr[0]);
    });
  });

  describe('batch', () => {
    it('should batch array', () => {
      expect(batch([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });
  });

  describe('pickMany', () => {
    it('should pick keys from array of objects', () => {
      const arr = [
        { a: 1, b: 2, c: 3 },
        { a: 4, b: 5, c: 6 },
      ];
      expect(pickMany(arr, ['a', 'c'])).toEqual([
        { a: 1, c: 3 },
        { a: 4, c: 6 },
      ]);
    });
  });
});
