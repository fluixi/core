// @vitest-environment node
/**
 * #5: an element file that registers with the standard `customElements.define`, imported by
 * code that also runs on a server.
 */
import { describe, it, expect } from 'vitest';

describe('#5 customElements.define on a server', () => {
  it('does not crash once @fluixi/web-components is loaded', async () => {
    const { HTMLReactiveElement } = await import('./index.js');
    class Counter extends HTMLReactiveElement {}
    expect(() => customElements.define('fx-server-defined', Counter)).not.toThrow();
  });
});
