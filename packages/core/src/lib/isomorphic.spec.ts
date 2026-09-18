// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createIsomorphicState, createIsomorphicStore } from './isomorphic.js';

describe('createIsomorphicState: client seeding', () => {
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

interface RegionData {
  region: { id: string } | null;
  regions: { id: string }[];
}

describe('createIsomorphicStore', () => {
  it('exposes per-field accessors derived from the value', () => {
    delete (window as any).__FX_DATA__;
    const store = createIsomorphicStore<RegionData>('store-fields', {
      server: () => ({ region: null, regions: [] }),
      fallback: { region: null, regions: [] },
    });
    store.set({ region: { id: 'r1' }, regions: [{ id: 'r1' }, { id: 'r2' }] });
    expect(store.fields.region()).toEqual({ id: 'r1' });
    expect(store.fields.regions()).toHaveLength(2);
    expect(store.value()).toEqual({ region: { id: 'r1' }, regions: [{ id: 'r1' }, { id: 'r2' }] });
  });

  it('setField updates one field and preserves the rest', () => {
    delete (window as any).__FX_DATA__;
    const store = createIsomorphicStore<RegionData>('store-setfield', {
      server: () => ({ region: null, regions: [] }),
      fallback: { region: null, regions: [] },
    });
    store.set({ region: { id: 'r1' }, regions: [{ id: 'r1' }] });
    store.setField('region', { id: 'r2' });
    expect(store.fields.region()).toEqual({ id: 'r2' });
    expect(store.fields.regions()).toEqual([{ id: 'r1' }]); // preserved
  });

  it('ensureInit runs the async client resolver exactly once (memoised)', async () => {
    delete (window as any).__FX_DATA__;
    let calls = 0;
    const store = createIsomorphicStore<RegionData>('store-init', {
      server: () => ({ region: null, regions: [] }),
      client: async () => {
        calls++;
        return { region: { id: 'cold' }, regions: [{ id: 'cold' }] };
      },
      fallback: { region: null, regions: [] },
    });
    await Promise.all([store.ensureInit(), store.ensureInit()]);
    await store.ensureInit();
    expect(calls).toBe(1);
    expect(store.fields.region()).toEqual({ id: 'cold' });
  });

  it('ensureInit is a no-op when the value was server-seeded (no cold fetch)', async () => {
    (window as any).__FX_DATA__ = { '__iso:store-seeded': { region: { id: 'srv' }, regions: [{ id: 'srv' }] } };
    let calls = 0;
    const store = createIsomorphicStore<RegionData>('store-seeded', {
      server: () => ({ region: null, regions: [] }),
      client: async () => {
        calls++;
        return { region: { id: 'cold' }, regions: [] };
      },
      fallback: { region: null, regions: [] },
    });
    await store.ensureInit();
    expect(calls).toBe(0); // seeded -> never fetched
    expect(store.fields.region()).toEqual({ id: 'srv' });
    delete (window as any).__FX_DATA__;
  });

  it('ensureInit resets its promise on failure so a later call can retry', async () => {
    delete (window as any).__FX_DATA__;
    let calls = 0;
    const store = createIsomorphicStore<RegionData>('store-retry', {
      server: () => ({ region: null, regions: [] }),
      client: async () => {
        calls++;
        if (calls === 1) throw new Error('backend down');
        return { region: { id: 'ok' }, regions: [] };
      },
      fallback: { region: null, regions: [] },
    });
    await expect(store.ensureInit()).rejects.toThrow('backend down');
    await store.ensureInit(); // retries
    expect(calls).toBe(2);
    expect(store.fields.region()).toEqual({ id: 'ok' });
  });

  it('persist mirrors the value into localStorage on write', () => {
    delete (window as any).__FX_DATA__;
    localStorage.removeItem('store_persist_key');
    const store = createIsomorphicStore<RegionData>('store-persist', {
      server: () => ({ region: null, regions: [] }),
      fallback: { region: null, regions: [] },
      persist: 'store_persist_key',
    });
    store.setField('region', { id: 'p1' });
    expect(JSON.parse(localStorage.getItem('store_persist_key')!).region).toEqual({ id: 'p1' });
  });
});
