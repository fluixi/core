import { describe, it, expect } from 'vitest';
import { createSignal } from '@fluixi/reactive/signal';
import { splitProps } from '@fluixi/dom';

describe('splitProps', () => {
  it('splits keys into a group + rest', () => {
    const props = { class: 'a', id: 'x', role: 'btn', tabindex: 0 };
    const [local, rest] = splitProps(props, ['class', 'id']);
    expect(local.class).toBe('a');
    expect(local.id).toBe('x');
    expect(rest.role).toBe('btn');
    expect(rest.tabindex).toBe(0);
    expect((rest as any).class).toBeUndefined();
    expect('class' in rest).toBe(false);
    expect('role' in local).toBe(false);
  });

  it('enumerates only its own keys', () => {
    const props = { a: 1, b: 2, c: 3 };
    const [local, rest] = splitProps(props, ['a', 'b']);
    expect(Object.keys(local).sort()).toEqual(['a', 'b']);
    expect(Object.keys(rest)).toEqual(['c']);
    expect({ ...local }).toEqual({ a: 1, b: 2 });
    expect({ ...rest }).toEqual({ c: 3 });
  });

  it('preserves reactivity, a signal-backed prop stays live', () => {
    const [cls, setCls] = createSignal('a');
    const props = {
      get class() {
        return cls();
      },
      id: 'x',
    };
    const [local, rest] = splitProps(props, ['class']);
    expect(local.class).toBe('a');
    setCls('b');
    expect(local.class).toBe('b'); // forwarded getter, not a snapshot
    expect(rest.id).toBe('x');
  });

  it('supports multiple groups', () => {
    const props = { class: 'a', id: 'x', role: 'btn' };
    const [g1, g2, rest] = splitProps(props, ['class'], ['id']);
    expect(g1.class).toBe('a');
    expect(g2.id).toBe('x');
    expect(rest.role).toBe('btn');
    expect((g1 as any).id).toBeUndefined();
  });

  it('does not throw on non-configurable source props', () => {
    const props = {};
    Object.defineProperty(props, 'fixed', { value: 1, enumerable: true, configurable: false });
    Object.defineProperty(props, 'other', { value: 2, enumerable: true, configurable: false });
    const [local, rest] = splitProps(props as any, ['fixed']);
    expect((local as any).fixed).toBe(1);
    expect(Object.keys(rest)).toEqual(['other']); // would TypeError without forced configurable
    expect({ ...rest }).toEqual({ other: 2 });
  });
});
