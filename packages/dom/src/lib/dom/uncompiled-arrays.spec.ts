// @vitest-environment jsdom
/**
 * An array of children written by hand, without the compiler: each reactive member updates on its
 * own, so a change to one leaves its siblings, and whatever they built, exactly as they were.
 */
import { describe, it, expect } from 'vitest';
import { createMemo, createRoot, createSignal } from '@fluixi/reactive/signal';
import { insert } from './runtime.js';

const tick = () => new Promise((r) => setTimeout(r, 0));
const el = (tag: string, text: string) => {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
};

describe('a hand-written array of children', () => {
  it('updates the member that changed and leaves its siblings', async () => {
    const [count, setCount] = createSignal(0);
    const [label, setLabel] = createSignal('a');
    let panels = 0;
    const host = document.createElement('div');
    const header = el('h2', 'header');
    createRoot(() =>
      insert(host, [
        header,
        () => `count ${count()}`,
        // A member that builds something stateful each time it runs.
        () => {
          panels++;
          return el('section', `panel ${label()}`);
        },
      ]),
    );
    const section = host.querySelector('section');
    expect(host.textContent).toBe('headercount 0panel a');

    setCount(1);
    await tick();
    expect(host.textContent).toBe('headercount 1panel a');
    expect(host.querySelector('h2')).toBe(header);
    expect(host.querySelector('section')).toBe(section);
    expect(panels).toBe(1);

    setLabel('b');
    await tick();
    expect(host.textContent).toBe('headercount 1panel b');
    expect(panels).toBe(2);
  });

  it('updates a memo member in place, as a component that returns control flow hands it', async () => {
    const [open, setOpen] = createSignal(false);
    const host = document.createElement('div');
    const before = el('b', 'before');
    const after = el('i', 'after');
    createRoot(() => {
      const panel = createMemo(() => (open() ? el('p', 'open') : null));
      insert(host, [before, panel, after]);
    });
    expect(host.textContent).toBe('beforeafter');

    setOpen(true);
    await tick();
    expect(host.textContent).toBe('beforeopenafter');
    expect(host.firstChild).toBe(before);
    expect(host.lastChild).toBe(after);
  });
});
