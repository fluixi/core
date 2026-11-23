// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createSignal } from '@fluixi/reactive/signal';
import { render } from './runtime.js';

describe('render', () => {
  it('runs the code once, whatever it reads while building', async () => {
    const [count, setCount] = createSignal(0);
    let builds = 0;
    const container = document.createElement('div');
    const dispose = render(() => {
      builds++;
      count();
      const p = document.createElement('p');
      p.textContent = 'app';
      return p;
    }, container);

    setCount(1);
    await new Promise((r) => setTimeout(r, 0));
    expect(builds).toBe(1);
    expect(container.innerHTML).toBe('<p>app</p>');
    dispose();
  });
});
