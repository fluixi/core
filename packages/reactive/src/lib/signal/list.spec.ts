import { describe, it, expect } from 'vitest';
import { createRoot, createSignal, onCleanup } from './signal.js';
import { mapArray, keyArray, indexArray } from './list.js';

describe('mapArray (reference-keyed)', () => {
  it('maps, reuses by reference, updates index, disposes removed', () => {
    createRoot((dispose) => {
      const a = { n: 'a' }, b = { n: 'b' }, c = { n: 'c' };
      const [list, setList] = createSignal<any[]>([a, b]);
      let maps = 0;
      const disposed: string[] = [];
      const out = mapArray(list, (item, index) => {
        maps++;
        onCleanup(() => disposed.push(item.n));
        return () => `${item.n}${index()}`;
      });

      expect(out().map((g) => g())).toEqual(['a0', 'b1']);
      expect(maps).toBe(2);

      // reorder (same refs) — reuse both, only index signals change
      setList([b, a]);
      expect(out().map((g) => g())).toEqual(['b0', 'a1']);
      expect(maps).toBe(2);

      // add c, remove nothing
      setList([b, a, c]);
      expect(out().map((g) => g())).toEqual(['b0', 'a1', 'c2']);
      expect(maps).toBe(3);

      // remove a
      setList([b, c]);
      expect(out().map((g) => g())).toEqual(['b0', 'c1']);
      expect(disposed).toContain('a');

      dispose();
      expect(disposed.sort()).toEqual(['a', 'b', 'c']);
    });
  });

  it('returns fallback when empty', () => {
    createRoot((dispose) => {
      const [list, setList] = createSignal<number[]>([]);
      const out = mapArray(list, (n) => n * 2, { fallback: () => 'empty' });
      expect(out()).toBe('empty');
      setList([1, 2]);
      expect(out()).toEqual([2, 4]);
      dispose();
    });
  });
});

describe('keyArray (key-function keyed)', () => {
  it('reuses by key across object recreation; live item accessor updates', () => {
    createRoot((dispose) => {
      const [list, setList] = createSignal<any[]>([{ id: 1, v: 'a' }, { id: 2, v: 'b' }]);
      let maps = 0;
      const out = keyArray(
        list,
        (item) => item.id,
        (item, index) => {
          maps++;
          return () => `${item().v}${index()}`;
        },
      );
      expect(out().map((g) => g())).toEqual(['a0', 'b1']);
      expect(maps).toBe(2);

      // recreate objects with same ids + changed value — reuse by key, value updates live
      setList([{ id: 2, v: 'B' }, { id: 1, v: 'A' }]);
      expect(out().map((g) => g())).toEqual(['B0', 'A1']);
      expect(maps).toBe(2); // no new maps — reused by key

      dispose();
    });
  });
});

describe('indexArray (index-keyed)', () => {
  it('grows/shrinks by position; value change updates slot signal, not the map fn', () => {
    createRoot((dispose) => {
      const [list, setList] = createSignal<string[]>(['a', 'b']);
      let maps = 0;
      const out = indexArray(list, (item, index) => {
        maps++;
        return () => `${item()}${index}`;
      });
      expect(out().map((g) => g())).toEqual(['a0', 'b1']);
      expect(maps).toBe(2);

      // value at index 0 changes — slot signal updates, map fn NOT re-run
      setList(['X', 'b']);
      expect(out().map((g) => g())).toEqual(['X0', 'b1']);
      expect(maps).toBe(2);

      // grow
      setList(['X', 'b', 'c']);
      expect(out().map((g) => g())).toEqual(['X0', 'b1', 'c2']);
      expect(maps).toBe(3);

      // shrink
      setList(['X']);
      expect(out().map((g) => g())).toEqual(['X0']);

      dispose();
    });
  });
});
