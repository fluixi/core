import { describe, it, expect, expectTypeOf } from 'vitest';
import { z } from 'zod';
import { route, notFound } from './index.js';
import { ApiClientError, createClient } from './client.js';

const project = z.object({ id: z.string(), name: z.string(), tags: z.array(z.string()) });
const store = new Map([['p1', { id: 'p1', name: 'Launch', tags: ['a'], secret: 'dropped' }]]);

// Route modules, the way `api.gen.ts` sees them through `typeof import(...)`.
const byId = {
  GET: route({
    params: z.object({ id: z.string() }),
    response: project,
    handler: ({ params }) => store.get(params.id) ?? Promise.reject(notFound()),
  }),
  DELETE: route({ params: z.object({ id: z.string() }), handler: ({ params }) => void store.delete(params.id) }),
};
const collection = {
  GET: route({
    query: z.object({ tag: z.array(z.string()).optional(), limit: z.coerce.number().default(20) }),
    response: z.object({ items: z.array(project), limit: z.number() }),
    handler: ({ query }) => ({
      items: [...store.values()].filter((p) => !query.tag || p.tags.some((t) => query.tag!.includes(t))),
      limit: query.limit,
    }),
  }),
  POST: route({
    body: z.object({ name: z.string().min(1), tags: z.array(z.string()).default([]) }),
    response: project,
    status: 201,
    handler: ({ body }) => {
      const created = { id: `p${store.size + 1}`, ...body };
      store.set(created.id, { ...created, secret: '' });
      return created;
    },
  }),
};
const auth = { GET: (request: Request) => Promise.resolve(Response.json({ path: new URL(request.url).pathname })) };

// An interface, as the generated file declares it: it has no index signature.
interface Routes {
  '/api/v1/projects': typeof collection;
  '/api/v1/projects/{id}': typeof byId;
  '/api/auth/{all}': typeof auth;
}

/** Dispatches to the handlers above by path template, as start would. */
const server: typeof fetch = async (input, init) => {
  const request = new Request(input as string, init);
  const { pathname } = new URL(request.url);
  const table: [RegExp, Record<string, any>, string[]][] = [
    [/^\/api\/v1\/projects$/, collection, []],
    [/^\/api\/v1\/projects\/([^/]+)$/, byId, ['id']],
    [/^\/api\/auth\/(.+)$/, auth, ['all']],
  ];
  for (const [pattern, mod, keys] of table) {
    const match = pathname.match(pattern);
    if (!match) continue;
    const params = Object.fromEntries(keys.map((k, i) => [k, decodeURIComponent(match[i + 1]!)]));
    return mod[request.method](request, { params });
  }
  return new Response('not here', { status: 404 });
};

const api = createClient<Routes>({ baseUrl: 'http://api.test', fetch: server });

describe('createClient', () => {
  it('reads a route, typed by its response schema', async () => {
    const result = await api.get('/api/v1/projects/{id}', { params: { id: 'p1' } });
    expect(result).toEqual({ id: 'p1', name: 'Launch', tags: ['a'] });
    expectTypeOf(result).toEqualTypeOf<{ id: string; name: string; tags: string[] }>();
  });

  it('sends the query with repeated keys for arrays', async () => {
    const result = await api.get('/api/v1/projects', { query: { tag: ['a', 'b'], limit: 5 } });
    expect(result.limit).toBe(5);
    expect(result.items.map((p) => p.id)).toEqual(['p1']);
  });

  it('may leave out an all-optional query', async () => {
    expect((await api.get('/api/v1/projects')).limit).toBe(20);
  });

  it('sends a JSON body and returns what was created', async () => {
    const created = await api.post('/api/v1/projects', { body: { name: 'Portal' } });
    expect(created).toMatchObject({ name: 'Portal', tags: [] });
  });

  it('resolves to undefined on 204', async () => {
    const result = await api.delete('/api/v1/projects/{id}', { params: { id: 'p2' } });
    expect(result).toBeUndefined();
  });

  it('throws the error model as an ApiClientError', async () => {
    const failed = await api.post('/api/v1/projects', { body: { name: '' } }).catch((e: unknown) => e);
    expect(failed).toBeInstanceOf(ApiClientError);
    expect(failed).toMatchObject({ status: 400, code: 'validation_failed' });
    expect((failed as ApiClientError).details).toEqual([expect.objectContaining({ path: 'body.name' })]);

    const missing = await api.get('/api/v1/projects/{id}', { params: { id: 'nope' } }).catch((e: unknown) => e);
    expect(missing).toMatchObject({ status: 404, code: 'not_found' });
  });

  it('calls a route without a contract, keeping the slashes of a catch-all', async () => {
    const result = await api.get('/api/auth/{all}', { params: { all: 'sign-in/email' } });
    expect(result).toEqual({ path: '/api/auth/sign-in/email' });
    expectTypeOf(result).toBeUnknown();
  });

  it('adds the client headers, from a function per call', async () => {
    let seen: string | null = null;
    const client = createClient<Routes>({
      baseUrl: 'http://api.test',
      headers: () => ({ cookie: 'session=1' }),
      fetch: (input, init) => {
        seen = new Headers(init?.headers).get('cookie');
        return server(input, init);
      },
    });
    await client.get('/api/v1/projects');
    expect(seen).toBe('session=1');
  });

  it('refuses at compile time what the contract does not accept', () => {
    const check = () => {
      // @ts-expect-error: no such path
      api.get('/api/v1/nothing');
      // @ts-expect-error: no POST on this path
      api.post('/api/v1/projects/{id}', { params: { id: 'p1' } });
      // @ts-expect-error: params are required
      api.get('/api/v1/projects/{id}');
      // @ts-expect-error: the body is required
      api.post('/api/v1/projects');
      // @ts-expect-error: name must be a string
      api.post('/api/v1/projects', { body: { name: 1 } });
    };
    expect(check).toBeTypeOf('function');
  });
});
