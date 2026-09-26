import { describe, it, expect } from 'vitest';
import { derivePattern, isApiPath, matchApiRoutes, handleApi, type ApiRoute } from './api.js';

const route = (rel: string, mod: Record<string, unknown>): ApiRoute => {
  const { source, keys, rank } = derivePattern(rel);
  return { source, keys, rank, mod };
};

describe('api routes', () => {
  it('derives patterns: static, param, catch-all, index', () => {
    expect(derivePattern('hello')).toMatchObject({ source: '^/api/hello/?$', keys: [] });
    expect(derivePattern('users/[id]')).toMatchObject({ source: '^/api/users/([^/]+)/?$', keys: ['id'] });
    expect(derivePattern('files/[...path]')).toMatchObject({ source: '^/api/files/(.+)/?$', keys: ['path'] });
    expect(derivePattern('index')).toMatchObject({ source: '^/api/?$', keys: [] });
  });

  it('isApiPath gates the /api prefix', () => {
    expect(isApiPath('/api')).toBe(true);
    expect(isApiPath('/api/x')).toBe(true);
    expect(isApiPath('/about')).toBe(false);
  });

  it('matches by specificity (static beats param) and decodes params', () => {
    const routes = [route('users/[id]', { GET: 1 }), route('users/me', { GET: 2 })];
    expect(matchApiRoutes(routes, '/api/users/me')?.mod.GET).toBe(2);
    const m = matchApiRoutes(routes, '/api/users/42%20a');
    expect(m?.params).toEqual({ id: '42 a' });
  });

  it('handleApi: invokes the method, 405 on missing method, 404 on no route', async () => {
    const routes = [
      route('echo/[v]', {
        GET: (_req: Request, ctx: { params: Record<string, string> }) => Response.json({ v: ctx.params.v }),
      }),
    ];
    const ok = await handleApi(routes, new Request('http://x/api/echo/7'));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ v: '7' });

    const wrongMethod = await handleApi(routes, new Request('http://x/api/echo/7', { method: 'POST' }));
    expect(wrongMethod.status).toBe(405);
    expect(wrongMethod.headers.get('allow')).toBe('GET');

    const miss = await handleApi(routes, new Request('http://x/api/nope'));
    expect(miss.status).toBe(404);
  });

  it('answers a thrown 401 or 403 with that status, as requireUser throws them', async () => {
    const refusal = (status: 401 | 403) => Object.assign(new Error('no'), { status, redirectTo: '/login' });
    const routes = [
      route('me', { GET: () => { throw refusal(401); } }),
      route('admin', { GET: () => { throw refusal(403); } }),
    ];
    const me = await handleApi(routes, new Request('http://x/api/me'));
    expect(me.status).toBe(401);
    expect(await me.json()).toEqual({ error: 'unauthorized', redirectTo: '/login' });
    expect((await handleApi(routes, new Request('http://x/api/admin'))).status).toBe(403);
  });

  it('still throws anything else', async () => {
    const routes = [route('boom', { GET: () => { throw new Error('boom'); } })];
    await expect(handleApi(routes, new Request('http://x/api/boom'))).rejects.toThrow('boom');
  });

  it('wraps a non-Response return value as JSON', async () => {
    const routes = [route('data', { GET: () => ({ ok: true }) })];
    const res = await handleApi(routes, new Request('http://x/api/data'));
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(await res.json()).toEqual({ ok: true });
  });
});
