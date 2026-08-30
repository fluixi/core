// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { signal, createRoot } from '@fluixi/reactive';
import { createComponent, registerCreateComponent, resetIntegration } from './integration.js';

afterEach(() => resetIntegration());

describe('createComponent', () => {
  it('runs the component once, untracked', () => {
    createRoot(() => {
      const count = signal(0);
      let runs = 0;
      const Comp = () => {
        runs += 1;
        return count();
      };
      createComponent(Comp as never, undefined);
      expect(runs).toBe(1);

      // Reading a signal while the component is created must not make the caller
      // depend on it, so nothing re-runs here.
      count.set(1);
      expect(runs).toBe(1);
      return null;
    });
  });

  it('lets a host install its own model', () => {
    const calls: string[] = [];
    registerCreateComponent(((Comp: () => unknown) => {
      calls.push('host');
      return Comp();
    }) as never);

    createComponent((() => 'x') as never, undefined);
    expect(calls).toEqual(['host']);
  });

  it('passes primitives through untouched', () => {
    expect(createComponent('text' as never, undefined)).toBe('text');
  });
});
