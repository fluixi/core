// @vitest-environment jsdom
/**
 * `load:interaction` rendered in the browser: with an element fallback it listens on that; with
 * nothing on the page to interact with, on the page.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createRoot } from '@fluixi/reactive/signal';
import { insert } from '@fluixi/dom';
import { ensureIntegration } from './component.js';
import { deferred } from './deferred.js';

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));
beforeAll(() => ensureIntegration());

function mount(fallback?: unknown) {
  const Widget = () => Object.assign(document.createElement('p'), { textContent: 'loaded' });
  const Lazy = deferred(() => Promise.resolve({ default: Widget }), {
    strategy: { kind: 'interaction', events: ['pointerdown'] },
    fallback,
  });
  const host = document.createElement('div');
  document.body.append(host);
  createRoot(() => insert(host, (Lazy as (p: object) => unknown)({}) as never));
  return host;
}

describe('load:interaction rendered in the browser', () => {
  it('listens on an element fallback, not on the page', async () => {
    const placeholder = Object.assign(document.createElement('button'), { textContent: 'open' });
    const host = mount(placeholder);
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await tick(10);
    expect(host.textContent).toBe('open');

    placeholder.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await tick(10);
    expect(host.textContent).toBe('loaded');
  });

  it('listens on the page when it has nothing rendered yet', async () => {
    const host = mount();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await tick(10);
    expect(host.textContent).toBe('loaded');
  });
});
