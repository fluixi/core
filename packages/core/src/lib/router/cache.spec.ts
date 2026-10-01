// @vitest-environment jsdom
/** Cached route data: freshness, sharing, revalidation, and actions that invalidate. */
import { describe, it, expect, beforeEach } from 'vitest';
import { createComponent, createNativeElement, insert, render } from '@fluixi/dom';
import { createMemo, createRoot, createResourceCache } from '@fluixi/reactive/signal';
import { ensureIntegration } from '../render/component.js';
import { Router, action, cache, createMemoryHistory, revalidate, useRouteData } from './index.js';

beforeEach(() => ensureIntegration());

const tick = () => new Promise((r) => setTimeout(r, 0));
const text = (tag: string, value: unknown) => {
  const node = createNativeElement(tag);
  insert(node, value as never);
  return node;
};

describe('cache', () => {
  it('shares one request, serves fresh hits, and fetches again after revalidate', async () => {
    const store = createResourceCache();
    let calls = 0;
    const orgs = cache(async () => [`org-${++calls}`], 'orgs', { cache: store });
    const [a, b] = await Promise.all([orgs(), orgs()]);
    expect(a).toEqual(['org-1']);
    expect(b).toBe(a);
    expect(await orgs()).toBe(a);
    revalidate('orgs', store);
    expect(await orgs()).toEqual(['org-2']);
    expect(calls).toBe(2);
  });

  it('returns the stale value and refreshes behind it', async () => {
    const store = createResourceCache();
    let n = 0;
    const list = cache(async () => ++n, 'list', { cache: store, ttl: 0 });
    expect(await list()).toBe(1);
    await new Promise((r) => setTimeout(r, 2));
    expect(await list()).toBe(1); // stale, served at once
    await tick();
    expect(store.get('list:[]')?.value).toBe(2);
  });

  it('keys by arguments and revalidates by name or predicate', async () => {
    const store = createResourceCache();
    const user = cache(async (id: string) => id, 'user', { cache: store });
    await user('a');
    await user('b');
    revalidate((k) => k.endsWith('"a"]'), store);
    expect([...store.keys()]).toEqual(['user:["b"]']);
    revalidate('user', store);
    expect([...store.keys()]).toEqual([]);
  });
});

describe('revalidation from the API client', () => {
  it('registers the router for x-fx-revalidate and drops every named entry', async () => {
    const page = createResourceCache();
    const a = cache(async () => 1, 'orgs', { cache: page });
    const b = cache(async () => 2, 'members', { cache: page });
    await a();
    await b();
    revalidate(['orgs', 'members'], page);
    expect([...page.keys()]).toEqual([]);
    expect(typeof (globalThis as Record<symbol, unknown>)[Symbol.for('fluixi.revalidate')]).toBe('function');
  });
});

describe('route data and revalidation', () => {
  it('loads the page again on revalidate, keeping it on screen meanwhile', async () => {
    let calls = 0;
    let finish: ((v: string[]) => void) | undefined;
    const orgs = cache(
      () => (++calls === 1 ? Promise.resolve(['acme']) : new Promise<string[]>((r) => (finish = r))),
      'route-orgs',
    );
    const Orgs = () => {
      const data = useRouteData<string[]>();
      return text('ul', () => (data() ?? []).join(','));
    };
    const routes = [{ path: '/', component: Orgs, data: () => orgs() }];
    const container = document.createElement('div');
    createRoot(() => {
      const view = createMemo(() => createComponent(Router, { routes, history: createMemoryHistory('/') } as never));
      render(view, container);
    });
    await tick();
    expect(container.textContent).toBe('acme');

    const create = action(async (name: string) => name, 'org.create', { invalidates: ['route-orgs'] });
    await create('globex');
    await tick();
    expect(calls).toBe(2);
    expect(container.textContent).toBe('acme'); // still shown while the new list loads
    finish!(['acme', 'globex']);
    await tick();
    expect(container.textContent).toBe('acme,globex');
  });
});
