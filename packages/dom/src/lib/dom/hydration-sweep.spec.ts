// @vitest-environment jsdom
/** The sweep after hydration: what nothing claimed goes, an unbuilt element's content stays. */
import { describe, it, expect } from 'vitest';
import { clearHydrationKeys, claimKeyed, indexHydrationKeys, removeUnclaimedKeyed } from './hydration-keys.js';

describe('removeUnclaimedKeyed', () => {
  it('removes keyed server elements nothing claimed, and keeps the claimed ones', () => {
    document.body.innerHTML =
      '<div id="app"><h1 data-hk="a">kept</h1><p data-hk="b">stale</p>' +
      '<wb-x data-fx-ssr data-hk="c"><span data-hk="d">mine</span></wb-x></div>';
    const app = document.getElementById('app')!;
    clearHydrationKeys();
    indexHydrationKeys(app);
    expect(claimKeyed('a', 'h1')).not.toBeNull();
    expect(claimKeyed('c', 'wb-x')).not.toBeNull();

    expect(removeUnclaimedKeyed(app)).toBe(1);
    expect(app.querySelector('p')).toBeNull();
    expect(app.querySelector('h1')?.textContent).toBe('kept');
    // Inside an element that has not built yet: left for the element to adopt.
    expect(app.querySelector('wb-x span')?.textContent).toBe('mine');
    clearHydrationKeys();
  });

  it('a claim takes the element out of the sweep only once', () => {
    document.body.innerHTML = '<div id="app"><p data-hk="x">one</p></div>';
    const app = document.getElementById('app')!;
    clearHydrationKeys();
    indexHydrationKeys(app);
    expect(claimKeyed('x', 'p')).not.toBeNull();
    expect(claimKeyed('x', 'p')).toBeNull();
    expect(removeUnclaimedKeyed(app)).toBe(0);
    clearHydrationKeys();
  });
});
