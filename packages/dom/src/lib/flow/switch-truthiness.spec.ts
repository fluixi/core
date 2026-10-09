/**
 * A Match is taken when its `when` is truthy in the JavaScript sense, as Show decides it.
 * Switch took `''` and `0` as true, so `<Match when={selectedId()}>` rendered with an empty id
 * and a redirect inside it went to a path missing its segment.
 */
import { describe, expect, it } from 'vitest';
import { createRoot, createSignal } from '@fluixi/reactive/signal';
import { Match, Switch } from './switch.js';

describe('Switch', () => {
  it('skips a Match whose value is an empty string or zero, like Show', () => {
    createRoot((dispose) => {
      const [value, setValue] = createSignal<string | number>('');
      const view = Switch({
        fallback: 'none',
        children: [Match({ when: () => value(), children: (v: unknown) => `matched ${String(v)}` })],
      }) as () => unknown;
      expect(view()).toBe('none');
      setValue(0);
      expect(view()).toBe('none');
      setValue('org-1');
      expect(view()).toBe('matched org-1');
      dispose();
    });
  });
});
