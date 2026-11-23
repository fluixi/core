/**
 * Element hydration installed by another copy of this package: a bundler can pre-bundle the
 * package with the elements that use it and serve the `hydrate` entry the app imports from a
 * second copy. The elements still find the hydrator and adopt the server's nodes.
 */
import { describe, it, expect, vi } from 'vitest';
import { createNativeElement, insert } from '@fluixi/dom';
import { typedElement, prop, defineCustomElement } from './index.js';

class Deals extends typedElement({ heading: prop.string('') }) {
  protected override render(): unknown {
    const h2 = createNativeElement('h2');
    insert(h2, () => this.heading);
    return h2;
  }
}

describe('element hydration installed by another copy of the package', () => {
  it('reaches the elements of this copy', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // What the other copy's `installElementHydration` leaves behind.
    const hydrate = vi.fn((_element: Element, render: () => unknown) => render());
    (globalThis as Record<symbol, unknown>)[Symbol.for('fluixi.elementHydrator')] = { hydrate };
    document.body.innerHTML = '<fx-copy-deals heading="Pipeline" data-fx-ssr><h2>Pipeline</h2></fx-copy-deals>';

    defineCustomElement('fx-copy-deals', Deals);
    await Promise.resolve();

    expect(hydrate).toHaveBeenCalledTimes(1);
    expect(hydrate.mock.calls[0][0]).toBe(document.querySelector('fx-copy-deals'));
    expect(warn.mock.calls.some(([m]) => String(m).includes('nothing installs element hydration'))).toBe(false);
    warn.mockRestore();
  });
});
