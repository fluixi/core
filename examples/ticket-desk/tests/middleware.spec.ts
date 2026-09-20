/**
 * The real middleware chain, composed the way the server composes it.
 *
 * Nothing is stubbed here except the terminal handler standing in for SSR, so the
 * ordering these assert is the ordering a deployed request gets.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { composeMiddleware } from '@fluixi/start';
import chain from '../src/middleware.js';

/** The chain, ending in a handler that reports it was reached. */
function run(url: string, init?: RequestInit) {
  let reached = false;
  const handler = composeMiddleware(chain, async () => {
    reached = true;
    return new Response('<html>rendered</html>', {
      headers: { 'content-type': 'text/html' },
    });
  });
  return handler(new Request(url, init)).then((res) => ({ res, reached: () => reached }));
}

const asUser = (token: string) => ({ headers: { authorization: `Bearer ${token}` } });

afterEach(() => {
  delete process.env.DESK_MAINTENANCE;
});

describe('every response is tagged', () => {
  it('carries a request id', async () => {
    const { res } = await run('https://desk.test/');
    expect(res.headers.get('x-request-id')).toMatch(/^req-/);
  });

  it('reuses an incoming request id rather than minting a new one', async () => {
    const { res } = await run('https://desk.test/', {
      headers: { 'x-request-id': 'req-from-the-edge' },
    });
    expect(res.headers.get('x-request-id')).toBe('req-from-the-edge');
  });

  it('gives two requests different ids', async () => {
    const [a, b] = await Promise.all([run('https://desk.test/'), run('https://desk.test/')]);
    expect(a.res.headers.get('x-request-id')).not.toBe(b.res.headers.get('x-request-id'));
  });

  it('reports how long the request took, measured around the render', async () => {
    const { res } = await run('https://desk.test/');
    expect(res.headers.get('server-timing')).toMatch(/^app;dur=\d+$/);
  });

  it('sets the security headers', async () => {
    const { res } = await run('https://desk.test/');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
  });
});

describe('the guard stops the chain instead of rendering', () => {
  it('redirects an anonymous user away from a protected path', async () => {
    const { res, reached } = await run('https://desk.test/tickets/new');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/login?next=%2Ftickets%2Fnew');
    // The important half: SSR never ran for a request that was not allowed.
    expect(reached()).toBe(false);
  });

  it('lets a signed-in user through to the render', async () => {
    const { res, reached } = await run('https://desk.test/tickets/new', asUser('rita:agent'));
    expect(res.status).toBe(200);
    expect(reached()).toBe(true);
  });

  it('refuses a signed-in user without the admin role', async () => {
    const { res, reached } = await run('https://desk.test/admin', asUser('rita:agent'));
    expect(res.status).toBe(403);
    expect(reached()).toBe(false);
  });

  it('admits an admin', async () => {
    const { res, reached } = await run('https://desk.test/admin', asUser('rita:agent,admin'));
    expect(res.status).toBe(200);
    expect(reached()).toBe(true);
  });

  it('leaves public paths alone', async () => {
    const { res, reached } = await run('https://desk.test/about');
    expect(res.status).toBe(200);
    expect(reached()).toBe(true);
  });
});

describe('layers that run before the guard still apply to what it returns', () => {
  it('a redirect is still tagged and timed', async () => {
    const { res } = await run('https://desk.test/tickets/new');
    expect(res.status).toBe(302);
    // These come from layers 1-3, which wrap the guard rather than following it.
    expect(res.headers.get('x-request-id')).toMatch(/^req-/);
    expect(res.headers.get('server-timing')).toMatch(/^app;dur=/);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });
});

describe('the maintenance switch', () => {
  it('turns the whole app off without touching a route', async () => {
    process.env.DESK_MAINTENANCE = '1';
    const { res, reached } = await run('https://desk.test/');
    expect(res.status).toBe(503);
    expect(res.headers.get('retry-after')).toBe('120');
    expect(reached()).toBe(false);
  });

  it('is off by default', async () => {
    const { res } = await run('https://desk.test/');
    expect(res.status).toBe(200);
  });
});
