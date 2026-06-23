// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createIsomorphicState } from './isomorphic.js';

describe('createIsomorphicState — client seeding', () => {
  it('seeds the value from window.__FX_DATA__ (the server transfer) over the fallback', () => {
    (window as any).__FX_DATA__ = { '__iso:region': { id: 'reg_SEED' } };
    const region = createIsomorphicState('region', {
      server: () => ({ id: 'reg_SERVER' }),
      fallback: null,
    });
    expect(region.value()).toEqual({ id: 'reg_SEED' });
    delete (window as any).__FX_DATA__;
  });

  it('uses client() over fallback when there is no server seed (pure SPA load)', () => {
    delete (window as any).__FX_DATA__;
    const a = createIsomorphicState('iso-a', { server: () => 1, fallback: 9 });
    expect(a.value()).toBe(9);
    const b = createIsomorphicState('iso-b', { server: () => 1, client: () => 7, fallback: 9 });
    expect(b.value()).toBe(7);
  });

  it('registers on the globalThis registry so the server can resolve it', () => {
    createIsomorphicState('iso-reg', { server: () => 'x', fallback: null });
    expect((globalThis as any).__fluixi_iso_states__?.has('iso-reg')).toBe(true);
  });
});
