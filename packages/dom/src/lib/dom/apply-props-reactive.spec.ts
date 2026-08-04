import { describe, expect, it } from 'vitest';
import { createRoot } from '@fluixi/reactive/signal';
import { createSignal } from '@fluixi/reactive/signal';
import { applyProps } from './runtime.js';

/**
 * `applyProps` is the path a component takes when it forwards a computed value
 * through a props object rather than as a compiled JSX attribute — which is what
 * every polymorphic/`as` wrapper does. `class` and `classList` already unwrapped
 * an accessor there; `style` applied once and never updated.
 */
describe('applyProps accepts accessors for class and style', () => {
  it('updates style when the value is an accessor', () => {
    createRoot(() => {
      const element = document.createElement('div');
      const [dense, setDense] = createSignal(false);
      applyProps(element, { style: () => (dense() ? 'padding:1px' : 'padding:4px') });

      expect(element.getAttribute('style')).toContain('padding: 4px');
      setDense(true);
      expect(element.getAttribute('style')).toContain('padding: 1px');
    });
  });

  it('updates class when the value is an accessor', () => {
    createRoot(() => {
      const element = document.createElement('div');
      const [active, setActive] = createSignal(false);
      applyProps(element, { class: () => (active() ? 'on' : 'off') });

      expect(element.getAttribute('class')).toBe('off');
      setActive(true);
      expect(element.getAttribute('class')).toBe('on');
    });
  });

  it('still applies a plain string once', () => {
    createRoot(() => {
      const element = document.createElement('div');
      applyProps(element, { style: 'color:red', class: 'plain' });
      expect(element.getAttribute('style')).toContain('color: red');
      expect(element.getAttribute('class')).toBe('plain');
    });
  });
});
