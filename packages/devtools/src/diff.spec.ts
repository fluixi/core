import { describe, it, expect } from 'vitest';
import { diffValues } from './diff.js';

describe('diffValues', () => {
  it('names the one row an append added, and leaves the rest alone', () => {
    const a = { id: 1 };
    const b = { id: 2 };
    const change = diffValues([a, b], [a, b, { id: 3 }]);
    expect(change?.shape).toBe('array');
    expect(change?.entries).toEqual([
      { key: '2', op: 'added', to: '{id: 3}', toJson: '{"id":3}' },
    ]);
    expect(change?.length).toEqual({ from: 2, to: 3 });
  });

  it('names the one row a removal took out, not every row after it', () => {
    const a = { id: 1 };
    const b = { id: 2 };
    const c = { id: 3 };
    const change = diffValues([a, b, c], [a, c]);
    // Trimming both ends is what stops this reading as "index 1 and 2 both changed".
    expect(change?.entries).toEqual([
      { key: '1', op: 'removed', from: '{id: 2}', fromJson: '{"id":2}' },
    ]);
  });

  it('reports a row replaced in place as one change with both sides', () => {
    const change = diffValues([{ done: false }], [{ done: true }]);
    expect(change?.entries).toEqual([
      {
        key: '0',
        op: 'changed',
        from: '{done: false}',
        fromJson: '{"done":false}',
        to: '{done: true}',
        toJson: '{"done":true}',
      },
    ]);
  });

  it('treats a rebuilt row with the same contents as unchanged', () => {
    // What `items.map(x => ({ ...x }))` produces: new objects, nothing a reader would call
    // a change.
    const change = diffValues([{ id: 1 }, { id: 2 }], [{ id: 1 }, { id: 2 }]);
    expect(change).toBeUndefined();
  });

  it('names the keys an object gained, lost and changed', () => {
    const change = diffValues({ a: 1, b: 2 }, { a: 9, c: 3 });
    expect(change?.shape).toBe('object');
    expect(change?.entries).toEqual(
      expect.arrayContaining([
        { key: 'a', op: 'changed', from: '1', to: '9' },
        { key: 'b', op: 'removed', from: '2' },
        { key: 'c', op: 'added', to: '3' },
      ]),
    );
    expect(change?.entries).toHaveLength(3);
  });

  it('stops after a while, and says how much it did not list', () => {
    const before = Array.from({ length: 200 }, (_, i) => i);
    const after = before.map((n) => n + 1);
    const change = diffValues(before, after);
    expect(change?.entries).toHaveLength(24);
    expect(change?.more).toBe(176);
  });

  it('has nothing to add about a plain value', () => {
    // The entry already carries 0 → 1; a list saying the value changed is a line and no fact.
    expect(diffValues(0, 1)).toBeUndefined();
    expect(diffValues('a', 'b')).toBeUndefined();
    expect(diffValues([1], 'nope')).toBeUndefined();
  });

  it('says nothing when an array was rewritten to itself', () => {
    expect(diffValues([1, 2, 3], [1, 2, 3])).toBeUndefined();
  });
});

describe('what a diff entry carries for copying', () => {
  it('gives an object as json, so it can be read and pasted', () => {
    const change = diffValues([{ id: 1 }], [{ id: 1, text: 'go' }]);
    expect(change?.entries?.[0]?.toJson).toBe('{"id":1,"text":"go"}');
  });

  it('leaves a plain value alone — a second copy of 3 helps nobody', () => {
    const change = diffValues({ n: 1 }, { n: 2 });
    expect(change?.entries?.[0]).toEqual({ key: 'n', op: 'changed', from: '1', to: '2' });
  });

  it('says nothing rather than throwing on something json cannot carry', () => {
    const cyclic: Record<string, unknown> = { name: 'a' };
    cyclic.self = cyclic;
    const change = diffValues({ x: 1 }, { x: cyclic });
    // The formatted string still describes it; only the copyable form is missing.
    expect(change?.entries?.[0]?.toJson).toBeUndefined();
    expect(change?.entries?.[0]?.to).toBeTruthy();
  });

  it('drops a value too big to be worth sending on every write', () => {
    const big = { text: 'x'.repeat(5000) };
    const change = diffValues([{ text: 'a' }], [big]);
    expect(change?.entries?.[0]?.toJson).toBeUndefined();
  });
});
