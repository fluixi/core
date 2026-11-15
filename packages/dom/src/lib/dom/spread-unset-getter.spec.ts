// @vitest-environment jsdom
/**
 * A getter-backed prop that reads `undefined` when the element is spread.
 *
 * Component props and `mergeProps` forward values as getters. The first pass of `spread` skipped
 * any prop equal to its previous value, and on the first pass every previous value is
 * `undefined`: a getter that had no value yet got no binding, so its attribute never appeared.
 */
import { describe, expect, it } from 'vitest';
import { createRoot, createSignal } from '@fluixi/reactive/signal';
import { spread } from './runtime.js';

describe('spread, a getter that starts undefined', () => {
  it('sets the attribute once the getter has a value, and removes it again', () =>
    createRoot((dispose) => {
      const [side, setSide] = createSignal<string | undefined>(undefined);
      const element = document.createElement('a');
      spread({
        element,
        props: {
          get 'data-side'() {
            return side();
          },
        },
      });
      expect(element.hasAttribute('data-side')).toBe(false);
      setSide('end');
      expect(element.getAttribute('data-side')).toBe('end');
      setSide(undefined);
      expect(element.hasAttribute('data-side')).toBe(false);
      dispose();
    }));

  it('sets a property the same way', () =>
    createRoot((dispose) => {
      const [title, setTitle] = createSignal<string | undefined>(undefined);
      const element = document.createElement('a');
      spread({
        element,
        props: {
          get title() {
            return title();
          },
        },
      });
      setTitle('Work');
      expect(element.title).toBe('Work');
      dispose();
    }));

  it('leaves a handler or ref that is unset alone', () =>
    createRoot((dispose) => {
      const element = document.createElement('button');
      expect(() => spread({ element, props: { onClick: undefined, ref: undefined, 'on:focus': undefined } })).not.toThrow();
      dispose();
    }));
});
