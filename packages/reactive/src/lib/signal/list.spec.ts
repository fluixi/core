import { describe, it, expect } from 'vitest';
import { createRoot, createSignal, createEffect, onCleanup } from '@fluixi/reactive/signal';
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

      // reorder (same refs): reuse both, only index signals change
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

      // recreate objects with same ids + changed value: reuse by key, value updates live
      setList([{ id: 2, v: 'B' }, { id: 1, v: 'A' }]);
      expect(out().map((g) => g())).toEqual(['B0', 'A1']);
      expect(maps).toBe(2); // no new maps: reused by key

      dispose();
    });
  });

  it('a swap reads the list once, not once per row', () => {
    createRoot((dispose) => {
      const rows = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const [list, setList] = createSignal<any[]>(rows);
      let reads = 0;
      const each = () => {
        reads++;
        return list();
      };
      const runs = [0, 0, 0];
      let slot = 0;
      const out = keyArray(each, (row) => row.id, (item) => {
        const mine = slot++;
        createEffect(() => {
          item();
          runs[mine]++;
        });
        return item;
      });
      out();
      expect(runs).toEqual([1, 1, 1]);
      reads = 0;

      // Same objects, new order: no row effect re-runs, and the only list
      // read is the reconciliation itself.
      setList([rows[2], rows[1], rows[0]]);
      out();
      expect(runs).toEqual([1, 1, 1]);
      expect(reads).toBe(1);

      // One row removed: still one list read, no surviving row re-runs.
      setList([rows[2], rows[0]]);
      out();
      expect(runs).toEqual([1, 1, 1]);
      expect(reads).toBe(2);

      dispose();
    });
  });

  it('a new object under the same key updates only that row', () => {
    createRoot((dispose) => {
      const first = { id: 1, v: 'a' };
      const [list, setList] = createSignal<any[]>([first, { id: 2, v: 'b' }]);
      const runs = [0, 0];
      let slot = 0;
      const items: (() => any)[] = [];
      const out = keyArray(list, (row) => row.id, (item) => {
        const mine = slot++;
        items.push(item);
        createEffect(() => {
          item();
          runs[mine]++;
        });
        return item;
      });
      out();
      expect(runs).toEqual([1, 1]);

      setList([first, { id: 2, v: 'B' }]);
      out();
      expect(runs).toEqual([1, 2]);
      expect(items[1]().v).toBe('B');

      // Shrink past a row, then read its accessor: the last value, not undefined.
      const dropped = items[1];
      setList([first]);
      out();
      expect(dropped().v).toBe('B');

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

      // value at index 0 changes: slot signal updates, map fn not re-run
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
