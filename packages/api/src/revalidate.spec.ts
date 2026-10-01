import { describe, it, expect, afterEach } from 'vitest';
import { z } from 'zod';
import { route, REVALIDATE_HEADER, notFound } from './index.js';
import { createClient } from './client.js';

const call = (handler: (r: Request) => Promise<Response>) => (input: RequestInfo | URL, init?: RequestInit) =>
  handler(new Request(new URL(String(input), 'http://api.test'), init));

describe('revalidates on a route', () => {
  it('names the stale data on a success, from a list or from the result', async () => {
    const create = route({
      body: z.object({ name: z.string() }),
      revalidates: (result) => ['orgs', `org:${(result as { id: string }).id}`],
      handler: ({ body }) => ({ id: body.name }),
    });
    const res = await create(new Request('http://api.test/orgs', { method: 'POST', body: JSON.stringify({ name: 'acme' }), headers: { 'content-type': 'application/json' } }));
    expect(res.headers.get(REVALIDATE_HEADER)).toBe('orgs, org:acme');
    const empty = route({ revalidates: ['orgs'], handler: () => undefined });
    expect((await empty(new Request('http://api.test/x', { method: 'DELETE' }))).headers.get(REVALIDATE_HEADER)).toBe('orgs');
    const redirect = route({ revalidates: ['orgs'], handler: () => Response.redirect('http://api.test/next', 302) });
    expect((await redirect(new Request('http://api.test/x'))).status).toBe(302);
  });

  it('says nothing when the route refuses', async () => {
    const missing = route({ revalidates: ['orgs'], handler: () => { throw notFound('No such organisation.'); } });
    const res = await missing(new Request('http://api.test/x'));
    expect(res.status).toBe(404);
    expect(res.headers.get(REVALIDATE_HEADER)).toBeNull();
  });
});

describe('the client and x-fx-revalidate', () => {
  const key = Symbol.for('fluixi.revalidate');
  afterEach(() => {
    delete (globalThis as Record<symbol, unknown>)[key];
    delete (globalThis as { window?: unknown }).window;
  });
  const handler = route({ revalidates: ['orgs', 'members'], handler: () => ({ ok: true }) });

  it('hands the names to onRevalidate', async () => {
    const seen: string[][] = [];
    const api = createClient<any>({ fetch: call(handler) as typeof fetch, baseUrl: 'http://api.test', onRevalidate: (n) => seen.push(n) });
    await api.post('/orgs' as never);
    expect(seen).toEqual([['orgs', 'members']]);
  });

  it('defaults to the router in a browser, and to nothing on a server', async () => {
    const seen: string[][] = [];
    (globalThis as Record<symbol, unknown>)[key] = (n: string[]) => seen.push(n);
    const api = createClient<any>({ fetch: call(handler) as typeof fetch, baseUrl: 'http://api.test' });
    await api.post('/orgs' as never);
    expect(seen).toEqual([]);
    (globalThis as { window?: unknown }).window = {};
    await api.post('/orgs' as never);
    expect(seen).toEqual([['orgs', 'members']]);
    await createClient<any>({ fetch: call(handler) as typeof fetch, baseUrl: 'http://api.test', onRevalidate: false }).post('/orgs' as never);
    expect(seen).toHaveLength(1);
  });
});
