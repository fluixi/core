// @vitest-environment jsdom
// router needs a DOM at import time (HTMLElement), so load under jsdom, then
// stub `window` away to exercise the server (no-window) branch of the router hooks.
import { describe, it, expect } from 'vitest';
import { createRoot } from '@fluixi/reactive/signal';
import { useRouter, useNavigate } from './index.js';

function withoutWindow(fn: () => void) {
  const saved = (globalThis as any).window;
  delete (globalThis as any).window; // simulate SSR (no window)
  try {
    createRoot(fn);
  } finally {
    (globalThis as any).window = saved;
  }
}

describe('router hooks: SSR-safe outside <Router>', () => {
  // The storefront crash: a slow data resource settles after the response is
  // serialized + the root disposed, re-running a layout (Navbar) on a detached owner
  // where RouterContext is gone. On the server the hooks must degrade, not throw
  // that re-render's output is discarded anyway.
  it('useRouter returns a safe stub on the server (no throw)', () => {
    withoutWindow(() => {
      const r = useRouter();
      expect(typeof r.location).toBe('function');
      expect(r.location().pathname).toBe('');
      expect(r.params()).toEqual({});
      expect(() => r.router.navigate('/x')).not.toThrow();
    });
  });

  it('useNavigate returns a no-op on the server (no throw)', () => {
    withoutWindow(() => {
      const nav = useNavigate();
      expect(typeof nav).toBe('function');
      expect(() => nav('/anywhere')).not.toThrow();
    });
  });

  it('useRouter throws on the client (genuine misuse outside <Router>)', () => {
    createRoot(() => {
      expect(() => useRouter()).toThrow(/within <Router>/);
    });
  });
});
