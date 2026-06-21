// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderToStringAsync, hydrate, createNativeElement, insert } from '@fluixi/dom';
import { lazy, Suspense } from '@fluixi/core';
import { createSignal, flush } from '@fluixi/reactive/signal';

const tick = async (ms = 60) => { await new Promise((r) => setTimeout(r, ms)); await flush(); };

// A lazy leaf component with interactive state.
const makeLeaf = () => () => {
  const [n, setN] = createSignal(0);
  const b = createNativeElement('button') as any;
  insert(b, () => n(), null);
  if (typeof b.addEventListener === 'function') b.addEventListener('click', () => setN(n() + 1));
  return b;
};

describe('lazy-route hydration', () => {
  it('hydrates the lazy component in place (no duplicate) and it stays interactive', async () => {
    const Leaf = makeLeaf();
    const Lazy = lazy(async () => ({ default: Leaf }));
    const App = () => Suspense({ fallback: 'loading', children: Lazy({}) });

    // Server: renderToStringAsync awaits the lazy load + resource.
    const container = document.createElement('div');
    document.body.appendChild(container);
    container.innerHTML = await renderToStringAsync(() => App());
    const serverButtons = container.querySelectorAll('button');
    expect(serverButtons.length).toBe(1);      // server rendered the leaf
    const serverBtn = serverButtons[0];
    expect(serverBtn.textContent).toBe('0');

    // Client: hydrate. The lazy resolves async, AFTER the sync hydration pass.
    hydrate(() => App(), container);
    await tick();

    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(1);            // ← no duplicate
    expect(buttons[0]).toBe(serverBtn);        // ← reused the server node (hydrated in place)

    (buttons[0] as HTMLButtonElement).click();
    await flush();
    expect(buttons[0].textContent).toBe('1');  // ← interactive after hydration
  });
});
