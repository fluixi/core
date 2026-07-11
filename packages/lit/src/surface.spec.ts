// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { html, svg, Show, For, Switch, classMap, styleMap } from './index.js';

// The compiled-rendering proof lives in @fluixi/compiler (lit-plugin.spec) and
// examples/lit-counter. Here we just check the package surface: control flow is
// re-exported from @fluixi/dom, and the html/svg tags are compile-time markers.
describe('@fluixi/lit surface', () => {
  it('re-exports control flow + class/style helpers from @fluixi/dom', () => {
    for (const c of [Show, For, Switch, classMap, styleMap]) {
      expect(typeof c).toBe('function');
    }
  });

  it('html/svg are compile-time markers that throw if executed', () => {
    expect(() => html(['x'] as any)).toThrow(/not compiled/);
    expect(() => svg(['x'] as any)).toThrow(/not compiled/);
  });
});
