// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { createEffect, createSignal } from './graph/compat.js';
import { createRoot } from './graph/runtime.js';
import {
  createResourceCache,
  setResourceCacheScope,
  setResourceDataSink,
  setResourceIdSource,
  setServerDataGetter,
  type ResourceCache,
} from './graph/ssr-hooks.js';
import { cachedResource, clearCachedResources } from './cached-resource.js';

const settled = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

const read = (fn: () => ReturnType<typeof cachedResource<string>>) => {
  let handle!: ReturnType<typeof cachedResource<string>>;
  const dispose = createRoot((d) => {
    handle = fn();
    createEffect(() => void handle.latest);
    return d;
  });
  return { handle, dispose };
};

afterEach(() => {
  setResourceCacheScope(null);
  setResourceIdSource(null);
  setServerDataGetter(null);
  setResourceDataSink(null);
});

describe('cachedResource scopes', () => {
  it('shares entries and in-flight fetches within a scope only', async () => {
    let calls = 0;
    const fetchUser = async () => `user-${++calls}`;
    const one: ResourceCache = createResourceCache();
    const two: ResourceCache = createResourceCache();

    setResourceCacheScope(() => one);
    const a = read(() => cachedResource(fetchUser, { name: 'me' }));
    const b = read(() => cachedResource(fetchUser, { name: 'me' }));
    setResourceCacheScope(() => two);
    const c = read(() => cachedResource(fetchUser, { name: 'me' }));
    await settled();

    expect(a.handle.latest).toBe('user-1');
    expect(b.handle.latest).toBe('user-1'); // joined the same request
    expect(c.handle.latest).toBe('user-2'); // another request, its own fetch
    expect(calls).toBe(2);
    [a, b, c].forEach((r) => r.dispose());
  });

  it('shares nothing on a server with no scope injected', async () => {
    let calls = 0;
    const a = read(() => cachedResource(async () => `v${++calls}`, { name: 'x' }));
    const b = read(() => cachedResource(async () => `v${++calls}`, { name: 'x' }));
    await settled();
    expect(calls).toBe(2);
    [a, b].forEach((r) => r.dispose());
  });

  it('reports the server value and seeds the browser read from it', async () => {
    const sent = new Map<string, unknown>();
    setResourceCacheScope(() => createResourceCache());
    setResourceIdSource(() => 'r0');
    setResourceDataSink((id, value) => sent.set(id, value));
    const server = read(() => cachedResource(async () => 'from-server', { name: 'page' }));
    await settled();
    expect(sent.get('r0')).toBe('from-server');
    server.dispose();

    setResourceDataSink(null);
    setServerDataGetter((id) => (sent.has(id) ? { value: sent.get(id) } : undefined));
    let fetched = false;
    const client = read(() => cachedResource(async () => ((fetched = true), 'refetched'), { name: 'page' }));
    expect(client.handle.latest).toBe('from-server');
    await settled();
    expect(fetched).toBe(false);
    client.dispose();
  });

  it('caches each combination of deps apart and follows their changes', async () => {
    const cache = createResourceCache();
    setResourceCacheScope(() => cache);
    const [user, setUser] = createSignal('ann');
    const fetched: string[] = [];
    const r = read(() =>
      cachedResource(async () => (fetched.push(user()), `orgs of ${user()}`), { name: 'orgs', deps: [user] }),
    );
    await settled();
    expect(r.handle.latest).toBe('orgs of ann');
    setUser('bob');
    await settled();
    expect(r.handle.latest).toBe('orgs of bob');
    setUser('ann');
    await settled();
    expect(r.handle.latest).toBe('orgs of ann'); // from its own entry
    expect(fetched).toEqual(['ann', 'bob']);
    expect([...cache.keys()].sort()).toEqual(['orgs:true:["ann"]', 'orgs:true:["bob"]']);
    r.dispose();
  });

  it('clears one name or the whole scope, and invalidates through the handle', async () => {
    const cache = createResourceCache();
    setResourceCacheScope(() => cache);
    let n = 0;
    const r = read(() => cachedResource(async () => `n${++n}`, { name: 'list' }));
    await settled();
    expect([...cache.keys()]).toEqual(['list:true']);
    clearCachedResources('other');
    expect([...cache.keys()]).toHaveLength(1);
    r.handle.invalidate();
    await settled();
    expect(r.handle.latest).toBe('n2');
    clearCachedResources();
    expect([...cache.keys()]).toHaveLength(0);
    r.dispose();
  });
});
