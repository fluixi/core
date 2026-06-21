import { describe, it, expect, vi, afterEach } from 'vitest';
import { createResource } from './resource.js';
import { createSignal } from './compat.js';
import { setResourceIdSource, setServerDataGetter } from '../signal.js';

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

afterEach(() => {
  setResourceIdSource(null);
  setServerDataGetter(null);
});

describe('resource port — async fetch', () => {
  it('loading → ready with the resolved value', async () => {
    const [data] = createResource(() => Promise.resolve('hello'));
    expect(data.loading).toBe(true);
    expect(data.latest).toBeUndefined();
    await tick();
    expect(data.loading).toBe(false);
    expect(data.latest).toBe('hello');
    expect(data.state).toBe('ready');
  });

  it('captures fetch errors', async () => {
    const [data] = createResource(() => Promise.reject(new Error('nope')));
    await tick();
    expect(data.state).toBe('errored');
    expect((data.error as Error).message).toBe('nope');
  });

  it('refetch re-runs the fetcher', async () => {
    let n = 0;
    const [data, { refetch }] = createResource(() => Promise.resolve(++n));
    await tick();
    expect(data.latest).toBe(1);
    refetch();
    await tick();
    expect(data.latest).toBe(2);
  });

  it('source-driven: changing the source refetches with the new key', async () => {
    const [id, setId] = createSignal(1);
    const fetcher = vi.fn((k: number) => Promise.resolve(`user-${k}`));
    const [data] = createResource(id, fetcher);
    await tick();
    expect(data.latest).toBe('user-1');
    setId(2);
    await tick();
    expect(data.latest).toBe('user-2');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe('resource port — SSR seeding (reuses the legacy __FX_DATA__ hooks)', () => {
  it('seeds from server data and does NOT fetch on the first run', async () => {
    let rid = 0;
    setResourceIdSource(() => `r${rid++}`);
    setServerDataGetter((id) => (id === 'r0' ? { value: 'from-server' } : undefined));

    const fetcher = vi.fn(() => Promise.resolve('from-client'));
    const [data] = createResource(fetcher);

    // seeded synchronously: ready, server value, no fetch
    expect(data.state).toBe('ready');
    expect(data.latest).toBe('from-server');
    await tick();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
