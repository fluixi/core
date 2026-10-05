// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@fluixi/core';
import { flush } from '@fluixi/reactive/signal';
import App from './App';

// Regression: lazy routes nested under providers + Router + Suspense must render.
// (Before the lazy-children-getter fix, the lazy route's owner chain bypassed the
// Suspense scope, so it never resolved and the app rendered empty.)
describe('router example (providers -> Router -> Suspense -> lazy)', () => {
  it('renders the matched lazy route', async () => {
    const host = document.createElement('div');
    render(() => <App />, host);
    // The route is a dynamic import: wait for it to arrive rather than for a fixed time, which a
    // busy machine overruns.
    await vi.waitFor(
      async () => {
        await flush();
        expect(host.querySelector('.home')?.textContent).toBe('Home page');
      },
      { timeout: 2000 },
    );
  });
});
