import { describe, it, expect, afterEach } from 'vitest';
import { createRoot } from '@fluixi/reactive/signal';
import { ClientOnly, NoSsr } from './client-only.js';
import { hydration } from '../dom/hydration-state.js';
import { setServerMode, isServer } from '../dom/server/host.js';

/** Read whatever the component returned: a memo, or a plain value. */
const read = (out: unknown): unknown => (typeof out === 'function' ? (out as () => unknown)() : out);

afterEach(() => {
  setServerMode(typeof document === 'undefined');
  hydration.active = false;
});

describe('ClientOnly', () => {
  it('renders the fallback, not children, on the server', () => {
    setServerMode(true);
    expect(isServer()).toBe(true);
    const out = ClientOnly({ fallback: 'placeholder', children: 'browser-only' });
    expect(read(out)).toBe('placeholder');
  });

  it('renders children immediately on a plain client render', () => {
    // Nothing to match, so there is no reason to flash the fallback.
    createRoot(() => {
      const out = ClientOnly({ fallback: 'placeholder', children: 'browser-only' });
      expect(read(out)).toBe('browser-only');
    });
  });

  it('renders the fallback during hydration, then swaps after the pass', async () => {
    // The point of the component: rendering children mid-hydration would desync
    // the cursor from the server markup.
    hydration.active = true;
    await createRoot(async () => {
      const out = ClientOnly({ fallback: 'placeholder', children: 'browser-only' });
      expect(read(out)).toBe('placeholder');

      // The swap lands on a microtask, i.e. after the synchronous hydrate pass.
      await Promise.resolve();
      expect(read(out)).toBe('browser-only');
    });
  });

  it('falls back to null when no fallback is given', () => {
    setServerMode(true);
    expect(read(ClientOnly({ children: 'x' }))).toBeNull();
  });

  it('NoSsr is the same component', () => {
    expect(NoSsr).toBe(ClientOnly);
  });
});
