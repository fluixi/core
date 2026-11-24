import { describe, it, expect } from 'vitest';
import { createSignal } from '@fluixi/reactive/signal';
import { mergeProps } from '@fluixi/dom';

describe('mergeProps', () => {
  it('a later undefined falls through to an earlier defined value', () => {
    expect(mergeProps({ value: 1 }, { value: undefined }).value).toBe(1);
  });

  it('a defined later value still wins (last-source-wins)', () => {
    expect(mergeProps({ value: 1 }, { value: 2 }).value).toBe(2);
  });

  it('preserves reactivity: re-reads the source, not a snapshot', () => {
    let v = 'a';
    const live = {} as { value: string };
    Object.defineProperty(live, 'value', { enumerable: true, get: () => v });
    const merged = mergeProps({ value: 'default' }, live);
    expect(merged.value).toBe('a');
    v = 'b';
    expect(merged.value).toBe('b');
  });

  it('tracks a signal-backed source live', () => {
    const [count, setCount] = createSignal(0);
    const merged = mergeProps({ get count() { return undefined as unknown as number; } }, { get count() { return count(); } });
    expect(merged.count).toBe(0);
    setCount(5);
    expect(merged.count).toBe(5);
  });

  it('merges the union of keys across sources', () => {
    const merged = mergeProps<{ a: number; b: number; c: number }>({ a: 1 }, { b: 2 }, { c: 3 });
    expect({ ...merged }).toEqual({ a: 1, b: 2, c: 3 });
    expect(Object.keys(merged).sort()).toEqual(['a', 'b', 'c']);
    expect('b' in merged).toBe(true);
  });

  it('spreading re-resolves (stays reactive through a re-merge)', () => {
    let v = 1;
    const live = {} as { x: number };
    Object.defineProperty(live, 'x', { enumerable: true, get: () => v });
    const merged = mergeProps({ x: 0 }, live);
    const remerged = mergeProps<{ x: number; y: number }>(merged, { y: 9 });
    expect(remerged.x).toBe(1);
    v = 42;
    expect(remerged.x).toBe(42);
    expect(remerged.y).toBe(9);
  });

  it('ignores null/undefined sources', () => {
    const merged = mergeProps(null as any, { a: 1 }, undefined as any);
    expect(merged.a).toBe(1);
  });

  it('reads a getter once per access: a children getter builds its nodes when read', () => {
    let reads = 0;
    const merged = mergeProps<{ a: number; children: string }>({ a: 1 }, {
      get children() {
        reads++;
        return 'built';
      },
    });
    expect(merged.children).toBe('built');
    expect(reads).toBe(1);
  });

  it('reads a function source on each access, so a spread built from signals stays live', () => {
    const [count, setCount] = createSignal(1);
    let built = 0;
    const merged = mergeProps<Record<string, string>>(() => {
      built += 1;
      return { 'data-count': String(count()) };
    }, { title: 'x' }) as Record<string, string>;
    expect(built).toBe(0);
    expect(merged['data-count']).toBe('1');
    setCount(2);
    expect(merged['data-count']).toBe('2');
    expect(Object.keys(merged).sort()).toEqual(['data-count', 'title']);
    expect('data-count' in merged).toBe(true);
  });
});

