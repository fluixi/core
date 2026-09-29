import { describe, it, expect } from 'vitest';
import { apiSecurity, cors, originCheck, securityHeaders } from './security.js';
import { memoryRateLimitStore, rateLimit } from './rate-limit.js';
import type { Middleware } from './middleware.js';

const API = 'https://api.example.test';
const WEB = 'https://app.example.test';

const ok = () => Promise.resolve(new Response('{}', { headers: { 'content-type': 'application/json' } }));
const run = (mw: Middleware, request: Request, next = ok) => Promise.resolve(mw(request, next));
const req = (path: string, init: RequestInit & { headers?: Record<string, string> } = {}) => new Request(API + path, init);

describe('securityHeaders', () => {
  it('sets the OWASP defaults', async () => {
    const res = await run(securityHeaders(), req('/api/x'));
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('content-security-policy')).toBe("default-src 'none'; frame-ancestors 'none'");
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('strict-transport-security')).toContain('max-age=');
  });

  it('keeps what the response set, and leaves out what is turned off', async () => {
    const next = () => Promise.resolve(new Response('', { headers: { 'cache-control': 'max-age=60' } }));
    const res = await run(securityHeaders({ 'x-frame-options': false }), req('/api/x'), next);
    expect(res.headers.get('cache-control')).toBe('max-age=60');
    expect(res.headers.has('x-frame-options')).toBe(false);
  });

  it('copies a response whose headers are immutable', async () => {
    const immutable = Response.redirect(API + '/elsewhere', 302);
    const res = await run(securityHeaders(), req('/api/x'), () => Promise.resolve(immutable));
    expect(res.status).toBe(302);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });
});

describe('cors', () => {
  const mw = cors({ origins: [WEB] });

  it('leaves a request without an Origin alone', async () => {
    const res = await run(mw, req('/api/x'));
    expect(res.headers.has('access-control-allow-origin')).toBe(false);
  });

  it('answers the preflight of a listed origin', async () => {
    const res = await run(
      mw,
      req('/api/x', {
        method: 'OPTIONS',
        headers: { origin: WEB, 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type' },
      }),
    );
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe(WEB);
    expect(res.headers.get('access-control-allow-credentials')).toBe('true');
    expect(res.headers.get('access-control-allow-headers')).toBe('content-type');
    expect(res.headers.get('access-control-allow-methods')).toContain('PATCH');
  });

  it('refuses the preflight of an unlisted origin', async () => {
    const res = await run(
      mw,
      req('/api/x', { method: 'OPTIONS', headers: { origin: 'https://evil.test', 'access-control-request-method': 'POST' } }),
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe('origin_not_allowed');
  });

  it('lets a listed origin read the response, and an unlisted one not', async () => {
    const listed = await run(mw, req('/api/x', { headers: { origin: WEB } }));
    expect(listed.headers.get('access-control-allow-origin')).toBe(WEB);
    expect(listed.headers.get('vary')).toBe('Origin');
    const unlisted = await run(mw, req('/api/x', { headers: { origin: 'https://evil.test' } }));
    expect(unlisted.headers.has('access-control-allow-origin')).toBe(false);
    expect(unlisted.headers.get('vary')).toBe('Origin');
  });

  it('refuses every cross-origin preflight when no origin is listed', async () => {
    const res = await run(
      cors({ origins: [] }),
      req('/api/x', { method: 'OPTIONS', headers: { origin: WEB, 'access-control-request-method': 'GET' } }),
    );
    expect(res.status).toBe(403);
  });
});

describe('originCheck', () => {
  const mw = originCheck({ origins: [WEB] });
  const post = (headers: Record<string, string>) => req('/api/x', { method: 'POST', headers });

  it('refuses a cookie-carrying write from another site', async () => {
    const res = await run(mw, post({ cookie: 's=1', origin: 'https://evil.test', 'sec-fetch-site': 'cross-site' }));
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe('cross_origin_refused');
  });

  it('refuses one without Sec-Fetch-Site whose Origin is unlisted', async () => {
    expect((await run(mw, post({ cookie: 's=1', origin: 'https://evil.test' }))).status).toBe(403);
  });

  it.each([
    ['a listed origin', { cookie: 's=1', origin: WEB, 'sec-fetch-site': 'same-site' }],
    ['the same origin', { cookie: 's=1', 'sec-fetch-site': 'same-origin' }],
    ['the origin of the API itself', { cookie: 's=1', origin: API }],
    ['no cookie', { origin: 'https://evil.test', 'sec-fetch-site': 'cross-site' }],
    ['no browser headers (curl)', { cookie: 's=1' }],
  ])('lets through %s', async (_, headers) => {
    expect((await run(mw, post(headers))).status).toBe(200);
  });

  it('lets reads through', async () => {
    const res = await run(mw, req('/api/x', { headers: { cookie: 's=1', origin: 'https://evil.test', 'sec-fetch-site': 'cross-site' } }));
    expect(res.status).toBe(200);
  });
});

describe('rateLimit', () => {
  const from = (address: string, path = '/api/auth/sign-in/email') =>
    req(path, { method: 'POST', headers: { 'x-test-address': address } });
  const key = (request: Request) => request.headers.get('x-test-address') ?? undefined;

  it('refuses the hit over the limit with 429 and Retry-After', async () => {
    const mw = rateLimit({ limit: 2, window: 60, key, store: memoryRateLimitStore() });
    expect((await run(mw, from('a'))).headers.get('ratelimit-remaining')).toBe('1');
    expect((await run(mw, from('a'))).status).toBe(200);
    const refused = await run(mw, from('a'));
    expect(refused.status).toBe(429);
    expect((await refused.json()).error.code).toBe('rate_limited');
    expect(Number(refused.headers.get('retry-after'))).toBeGreaterThan(0);
    expect((await run(mw, from('b'))).status).toBe(200);
  });

  it('counts only matching paths and methods', async () => {
    const mw = rateLimit({ match: ['/api/auth/sign-in/*'], methods: ['POST'], limit: 1, window: 60, key, store: memoryRateLimitStore() });
    await run(mw, from('a'));
    expect((await run(mw, from('a', '/api/v1/me'))).status).toBe(200);
    expect((await run(mw, req('/api/auth/sign-in/email', { headers: { 'x-test-address': 'a' } }))).status).toBe(200);
    expect((await run(mw, from('a'))).status).toBe(429);
  });

  it('keeps two limits on one store apart', async () => {
    const store = memoryRateLimitStore();
    const first = rateLimit({ limit: 1, window: 60, key, store });
    const second = rateLimit({ limit: 1, window: 60, key, store });
    await run(first, from('a'));
    expect((await run(second, from('a'))).status).toBe(200);
  });

  it('keys on the address @fluixi/start recorded, and skips a request without one', async () => {
    const registry = ((globalThis as Record<symbol, unknown>)[Symbol.for('fluixi.clientAddress')] ??= new WeakMap()) as WeakMap<Request, string>;
    const mw = rateLimit({ limit: 1, window: 60, store: memoryRateLimitStore() });
    const known = () => {
      const request = req('/api/x');
      registry.set(request, '203.0.113.1');
      return request;
    };
    await run(mw, known());
    expect((await run(mw, known())).status).toBe(429);
    expect((await run(mw, req('/api/x'))).status).toBe(200);
    expect((await run(mw, req('/api/x'))).status).toBe(200);
  });
});

describe('apiSecurity', () => {
  it('leaves paths outside the API alone', async () => {
    const res = await run(apiSecurity(), req('/'));
    expect(res.headers.has('content-security-policy')).toBe(false);
  });

  it('puts the headers and CORS on refusals too', async () => {
    const mw = apiSecurity({
      origins: [WEB],
      rateLimits: [{ limit: 0, window: 60, key: () => 'k', store: memoryRateLimitStore() }],
    });
    const res = await run(mw, req('/api/x', { headers: { origin: WEB } }));
    expect(res.status).toBe(429);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('access-control-allow-origin')).toBe(WEB);
  });

  it('turns a part off only when told', async () => {
    const res = await run(apiSecurity({ headers: false }), req('/api/x'));
    expect(res.headers.has('x-content-type-options')).toBe(false);
  });
});
