// @vitest-environment node
/**
 * On a server there is no `HTMLElement`, and a module declaring an element is still imported
 * by code that renders there.
 */
import { describe, it, expect } from 'vitest';

describe('on a server', () => {
  it('lets a class element be declared, and defines nothing', async () => {
    expect(typeof (globalThis as { HTMLElement?: unknown }).HTMLElement).toBe('undefined');
    const { HTMLReactiveElement, prop, customElement } = await import('./index.js');
    class Counter extends HTMLReactiveElement {
      static override props = { step: prop.number(1) };
    }
    expect(Counter.observedAttributes).toEqual(['step']);
    expect(() => customElement('fx-server', () => null, { props: { step: prop.number(1) } })).not.toThrow();
  });
});
