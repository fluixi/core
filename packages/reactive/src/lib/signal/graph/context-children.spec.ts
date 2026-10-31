import { describe, it, expect } from 'vitest';
import { createContext, useContext, createRoot, createSignal } from './signal-next.js';

/** What an insert does with a Provider's result: read it, from outside the Provider. */
const read = (value: unknown): unknown =>
  typeof value === 'function' ? read((value as () => unknown)()) : Array.isArray(value) ? value.map(read) : value;

describe('a Provider function child', () => {
  it('reads the provided value although it runs later, outside the Provider', () => {
    const Theme = createContext('none');
    let out: unknown;
    createRoot(() => {
      out = Theme.Provider({ value: 'dark', children: () => useContext(Theme) });
    });
    expect(read(out)).toBe('dark');
  });

  it('keeps the value when it re-runs', () => {
    const Theme = createContext('none');
    const [open, setOpen] = createSignal(false);
    let out: unknown;
    createRoot(() => {
      out = Theme.Provider({ value: 'dark', children: [() => (open() ? useContext(Theme) : 'closed')] });
    });
    expect(read(out)).toEqual(['closed']);
    setOpen(true);
    expect(read(out)).toEqual(['dark']);
  });
});
