import { describe, it, expect } from 'vitest';
import { createSignal } from '@fluixi/reactive/signal';
import { render, flush, fireEvent, insert } from './index.js';

describe('@fluixi/testing', () => {
  it('mounts into a container and unmounts', () => {
    const { container, find, unmount } = render(() => {
      const p = document.createElement('p');
      p.textContent = 'hello';
      return p;
    });

    expect(find('p')?.textContent).toBe('hello');
    expect(document.body.contains(container)).toBe(true);

    unmount();
    expect(document.body.contains(container)).toBe(false);
  });

  it('reflects signal updates after flush', async () => {
    const [count, setCount] = createSignal(1);
    const { find, unmount } = render(() => {
      const out = document.createElement('output');
      insert(out, count);
      return out;
    });

    expect(find('output')?.textContent).toBe('1');

    setCount(5);
    await flush();
    expect(find('output')?.textContent).toBe('5');

    unmount();
  });

  it('fires a delegated click handler', async () => {
    let clicks = 0;
    const { find, unmount } = render(() => {
      const btn = document.createElement('button');
      insert(btn, () => 'inc');
      btn.addEventListener('click', () => clicks++);
      return btn;
    });

    fireEvent(find('button')!, 'click');
    expect(clicks).toBe(1);

    unmount();
  });
});
