/**
 * The request chain, in the order it runs.
 *
 * A middleware either returns a `Response` to stop the chain, or calls `next()` and gets
 * the downstream response back to adjust. Both shapes are here because the desk needs
 * both: the auth guard stops, the timing and header layers pass through.
 *
 * Order matters and is visible in the output. `x-request-id` is assigned first, so every
 * later layer and the render itself can quote the same id; `server-timing` is measured
 * around `next()`, so it covers everything downstream including SSR.
 */
import { defineMiddleware } from '@fluixi/start';
import { newRequestId, rememberRequestId } from './services/request-id.js';

/** Paths that require a signed-in user. Everything else is public. */
const PROTECTED = ['/tickets/new', '/admin'];

/** Paths that additionally require the `admin` role. */
const ADMIN_ONLY = ['/admin'];

function userFrom(request: Request): { name: string; roles: string[] } | null {
  const header = request.headers.get('authorization') ?? '';
  if (!header.startsWith('Bearer ')) return null;
  const [name, roles = ''] = header.slice(7).split(':');
  return name ? { name, roles: roles.split(',').filter(Boolean) } : null;
}

export default defineMiddleware([
  // 1. Identify the request. Generated here so the id exists before anything can log,
  //    and echoed back so a client can quote it in a bug report.
  async (request, next) => {
    const id = request.headers.get('x-request-id') ?? newRequestId();
    rememberRequestId(request, id);
    const res = await next();
    res.headers.set('x-request-id', id);
    return res;
  },

  // 2. Time the whole downstream, SSR included.
  async (_request, next) => {
    const started = Date.now();
    const res = await next();
    res.headers.set('server-timing', `app;dur=${Date.now() - started}`);
    return res;
  },

  // 3. Headers every response should carry. Set after `next()` so a route cannot
  //    forget them, and so they apply to server-function and API responses too.
  async (_request, next) => {
    const res = await next();
    res.headers.set('x-content-type-options', 'nosniff');
    res.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
    return res;
  },

  // 4. The guard. This one short-circuits: it returns without calling `next()`, so no
  //    render happens at all for a request that is not allowed through.
  (request, next) => {
    const { pathname } = new URL(request.url);
    const user = userFrom(request);

    if (PROTECTED.some((p) => pathname.startsWith(p)) && !user) {
      return new Response(null, {
        status: 302,
        headers: { location: `/login?next=${encodeURIComponent(pathname)}` },
      });
    }

    if (ADMIN_ONLY.some((p) => pathname.startsWith(p)) && !user?.roles.includes('admin')) {
      return new Response('Forbidden', {
        status: 403,
        headers: { 'content-type': 'text/plain' },
      });
    }

    return next();
  },

  // 5. A maintenance switch, to show a whole-app short-circuit driven by config rather
  //    than by the path.
  (_request, next) => {
    if (process.env.DESK_MAINTENANCE === '1') {
      return new Response('The desk is down for maintenance.', {
        status: 503,
        headers: { 'content-type': 'text/plain', 'retry-after': '120' },
      });
    }
    return next();
  },
]);
