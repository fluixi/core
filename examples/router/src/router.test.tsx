// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from 'fluixi';
import { flush } from '@fluixi/reactive/signal';
import App from './App';

// Regression: lazy routes nested under providers + Router + Suspense must render.
// (Before the lazy-children-getter fix, the lazy route's owner chain bypassed the
// Suspense scope, so it never resolved and the app rendered empty.)
describe('router example (providers -> Router -> Suspense -> lazy)', () => {
  it('renders the matched lazy route', async () => {
    const host = document.createElement('div');
    render(() => <App />, host);
    await new Promise((r) => setTimeout(r, 80));
    await flush();
    expect(host.querySelector('.home')?.textContent).toBe('Home page');
  });
});
