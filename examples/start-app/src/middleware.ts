// Request middleware runs before SSR, in both `fluixi dev` and `fluixi start`.
// A middleware returns a Response to short-circuit (guards/redirects), or calls
// `next()` to continue — optionally adjusting the downstream response.
import { defineMiddleware } from '@fluixi/start';

export default defineMiddleware([
  // Tag every response (demo of the call-next-then-adjust pattern).
  async (_request, next) => {
    const res = await next();
    res.headers.set('x-fluixi-mw', 'on');
    return res;
  },
  // Guard example: block /admin (no auth in this demo) with a redirect.
  (request, next) => {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith('/admin')) {
      return new Response(null, { status: 302, headers: { location: '/' } });
    }
    return next();
  },
]);
