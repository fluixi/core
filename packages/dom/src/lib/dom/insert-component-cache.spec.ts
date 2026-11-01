// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { signal, createRoot } from '@fluixi/reactive';
import { insert } from './runtime.js';
import { asComponent } from '../component/modifiers.js';

// The component cache exists so a thunk is called once and its nodes stay
// identical across re-runs of the enclosing effect (focus stays put). It is
// created lazily now; this pins that the identity survives that.
describe('insert component cache', () => {
  it('calls a component thunk once across re-runs of the enclosing effect', () => {
    const host = document.createElement('div');
    document.body.append(host);
    let calls = 0;
    const tick = signal(0);
    const thunk = asComponent(() => {
      calls++;
      const el = document.createElement('span');
      el.textContent = 'x';
      return el;
    });
    createRoot((dispose) => {
      insert(host, () => {
        tick();
        return [thunk];
      });
      const first = host.querySelector('span');
      expect(first).not.toBeNull();
      tick.set(1);
      tick.set(2);
      expect(calls).toBe(1);
      expect(host.querySelector('span')).toBe(first);
      dispose();
    });
  });
});
