/**
 * Route contracts: validation before the handler, typed input, the response schema on the way
 * out, one error model. Run with Zod and Valibot, and once through @fluixi/start's own dispatcher.
 */
import { describe, it, expect, expectTypeOf, vi, afterEach } from 'vitest';
import { z } from 'zod';
import * as v from 'valibot';
import { derivePattern, handleApi } from '@fluixi/start/api';
import { ApiError, contractOf, notFound, route, setErrorReporter, type ApiErrorBody } from './index.js';

const url = (path: string) => `http://localhost${path}`;
const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(url(path), {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
const json = async (response: Response) => (await response.json()) as any;

afterEach(() => setErrorReporter((error) => console.error(error)));

describe('a contracted route', () => {
  const update = route({
    params: z.object({ id: z.string().uuid() }),
    query: z.object({ notify: z.coerce.boolean().default(false) }),
    body: z.object({ name: z.string().min(1), tags: z.array(z.string()).default([]) }),
    response: z.object({ id: z.string(), name: z.string(), tags: z.array(z.string()) }),
    handler({ params, query, body }) {
      expectTypeOf(params.id).toEqualTypeOf<string>();
      expectTypeOf(query.notify).toEqualTypeOf<boolean>();
      expectTypeOf(body.tags).toEqualTypeOf<string[]>();
      // A database row with more in it than the contract allows out.
      return { id: params.id, name: body.name, tags: body.tags, passwordHash: 'secret' };
    },
  });
  const id = '8b1c3f5e-2a4d-4c6b-9e7f-0a1b2c3d4e5f';

  it('hands the handler validated, parsed input and applies the response schema on the way out', async () => {
    const res = await update(post(`/api/projects/${id}?notify=1`, { name: 'Site' }), { params: { id } });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    const out = await json(res);
    expect(out).toEqual({ id, name: 'Site', tags: [] });
    expect(out).not.toHaveProperty('passwordHash');
  });

  it('reports every invalid part of the request at once, with where it is', async () => {
    const res = await update(post('/api/projects/nope', { name: '' }), { params: { id: 'nope' } });
    expect(res.status).toBe(400);
    const { error } = (await json(res)) as ApiErrorBody;
    expect(error.code).toBe('validation_failed');
    const paths = (error.details as { path: string }[]).map((issue) => issue.path);
    expect(paths).toEqual(expect.arrayContaining(['params.id', 'body.name']));
  });

  it('keeps the contract on the handler', () => {
    expect(contractOf(update)?.params).toBeDefined();
    expect(contractOf(() => new Response())).toBeUndefined();
  });
});

describe('the body', () => {
  const echo = route({
    body: z.object({ text: z.string() }),
    bodyLimit: 64,
    handler: ({ body }) => body,
  });

  it('refuses a body that is not JSON with 415', async () => {
    const res = await echo(post('/api/echo', 'text=hi', { 'content-type': 'application/x-www-form-urlencoded' }));
    expect(res.status).toBe(415);
    expect((await json(res)).error.code).toBe('unsupported_media_type');
  });

  it('refuses malformed JSON with 400', async () => {
    const res = await echo(post('/api/echo', '{"text":'));
    expect((await json(res)).error.code).toBe('invalid_json');
  });

  it('refuses a body over the limit, declared or not', async () => {
    const big = JSON.stringify({ text: 'x'.repeat(200) });
    expect((await echo(post('/api/echo', big))).status).toBe(413);
    // No Content-Length: the limit is enforced on the bytes as they are read.
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(big));
        controller.close();
      },
    });
    const streamed = new Request(url('/api/echo'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: stream,
      duplex: 'half',
    } as RequestInit);
    expect((await echo(streamed)).status).toBe(413);
  });

  it('treats a missing body as a validation failure when one is required', async () => {
    const res = await echo(new Request(url('/api/echo'), { method: 'POST' }));
    expect(res.status).toBe(400);
    expect((await json(res)).error.code).toBe('validation_failed');
  });

  it('collects repeated query keys as an array', async () => {
    const list = route({ query: z.object({ tag: z.array(z.string()) }), handler: ({ query }) => query.tag });
    expect(await json(await list(new Request(url('/api/x?tag=a&tag=b'))))).toEqual(['a', 'b']);
  });
});

describe('errors', () => {
  it('sends an ApiError as it was thrown', async () => {
    const res = await route({ handler: () => { throw notFound('No such project.'); } })(new Request(url('/api/x')));
    expect(res.status).toBe(404);
    expect(await json(res)).toEqual({ error: { code: 'not_found', message: 'No such project.' } });

    const detailed = route({ handler: () => { throw new ApiError(409, 'conflict', 'Taken.', { field: 'slug' }); } });
    expect(await json(await detailed(new Request(url('/api/x'))))).toEqual({
      error: { code: 'conflict', message: 'Taken.', details: { field: 'slug' } },
    });
  });

  it('answers an auth refusal with 401 or 403 in the same shape', async () => {
    const refused = route({ handler: () => { throw Object.assign(new Error('no user'), { status: 401 }); } });
    const res = await refused(new Request(url('/api/x')));
    expect(res.status).toBe(401);
    expect((await json(res)).error.code).toBe('unauthorized');
  });

  it('hides an unexpected error, and reports it', async () => {
    const seen = vi.fn();
    setErrorReporter(seen);
    const res = await route({ handler: () => { throw new Error('SELECT * FROM users failed'); } })(new Request(url('/api/x')));
    expect(res.status).toBe(500);
    const body = await res.text();
    expect(body).not.toContain('SELECT');
    expect(JSON.parse(body).error.code).toBe('internal');
    expect(seen).toHaveBeenCalledOnce();
  });

  it('treats a response that breaks its own contract as a server fault', async () => {
    const seen = vi.fn();
    setErrorReporter(seen);
    const broken = route({ response: z.object({ count: z.number() }), handler: () => ({ count: 'many' }) as never });
    const res = await broken(new Request(url('/api/x')));
    expect(res.status).toBe(500);
    expect((await json(res)).error.code).toBe('internal');
    expect(seen).toHaveBeenCalledOnce();
  });
});

describe('what a handler returns', () => {
  it('answers 204 for nothing, and passes a Response through', async () => {
    expect((await route({ handler: () => undefined })(new Request(url('/api/x')))).status).toBe(204);
    const raw = await route({ handler: () => new Response('csv', { status: 202 }) })(new Request(url('/api/x')));
    expect([raw.status, await raw.text()]).toEqual([202, 'csv']);
  });

  it('uses the declared success status', async () => {
    const created = route({ status: 201, response: z.object({ ok: z.boolean() }), handler: () => ({ ok: true }) });
    expect((await created(new Request(url('/api/x')))).status).toBe(201);
  });
});

describe('with Valibot', () => {
  it('validates and types the same way', async () => {
    const create = route({
      body: v.object({ title: v.pipe(v.string(), v.minLength(3)) }),
      response: v.object({ title: v.string() }),
      handler: ({ body }) => {
        expectTypeOf(body.title).toEqualTypeOf<string>();
        return { title: body.title, internal: 1 };
      },
    });
    expect(await json(await create(post('/api/t', { title: 'Logo' })))).toEqual({ title: 'Logo' });
    const bad = await create(post('/api/t', { title: 'x' }));
    expect((await json(bad)).error.details[0].path).toBe('body.title');
  });
});

describe('inside @fluixi/start', () => {
  it('is routed by start like any API handler, with the params from the file name', async () => {
    const GET = route({
      params: z.object({ id: z.coerce.number().int() }),
      response: z.object({ id: z.number() }),
      handler: ({ params }) => ({ id: params.id }),
    });
    const routes = [{ ...derivePattern('projects/[id]'), mod: { GET } }];
    const ok = await handleApi(routes, new Request(url('/api/projects/42')));
    expect(await json(ok)).toEqual({ id: 42 });
    const bad = await handleApi(routes, new Request(url('/api/projects/abc')));
    expect(bad.status).toBe(400);
    expect((await handleApi(routes, new Request(url('/api/projects/42'), { method: 'DELETE' }))).status).toBe(405);
  });
});
