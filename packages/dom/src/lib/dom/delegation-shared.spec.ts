// @vitest-environment jsdom
/**
 * One document listener per event, however many copies of this module are on the page.
 *
 * Delegation kept its registry in a module-level `Set`, so a second build of the runtime
 * believed no listener existed yet and added its own. Both dispatchers then walked the
 * same tree and found the same `$$click`, so every handler ran once per copy. Two
 * standalone custom elements is the ordinary way a page ends up with two copies, and a
 * single click counted twice.
 *
 * The registry is on `globalThis` now, for the reason the reactive graph is.
 */
import { describe, expect, it, vi } from 'vitest';
import { addDelegatedEventListener, delegateEvents } from './runtime.js';

describe('the delegation registry is shared', () => {
  it('lives on globalThis, where a second copy of the module finds it', () => {
    delegateEvents(['click']);
    const state = (globalThis as Record<string, any>)['__fluixi_delegated_events__'];
    expect(state?.names).toBeInstanceOf(Set);
    expect(state.names.has('click')).toBe(true);
  });

  it('adds one document listener for an event, not one per call', () => {
    const add = vi.spyOn(document, 'addEventListener');
    delegateEvents(['customtype']);
    const first = add.mock.calls.filter(([type]) => type === 'customtype').length;
    delegateEvents(['customtype']);
    const second = add.mock.calls.filter(([type]) => type === 'customtype').length;
    expect(first).toBe(1);
    expect(second).toBe(1);
    add.mockRestore();
  });

  it('runs a handler once per click', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    let calls = 0;
    addDelegatedEventListener(button, 'click', () => calls++);

    button.click();

    // The regression: this was 2 on a page carrying two builds of the runtime.
    expect(calls).toBe(1);
    button.remove();
  });

  it('reaches a handler inside a shadow root', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = host.attachShadow({ mode: 'open' });
    const button = document.createElement('button');
    root.appendChild(button);

    let calls = 0;
    addDelegatedEventListener(button, 'click', () => calls++);

    // `click()` dispatches a composed event, which is what crosses the boundary. A
    // hand-built `new Event('click')` is not composed and by spec stays inside.
    button.click();

    expect(calls).toBe(1);
    host.remove();
  });
});
