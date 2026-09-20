/**
 * Client entry: hydrate, register the same services, install the fetch interceptors.
 *
 * `provideRoot` here creates genuine singletons, because there is no request context on
 * the client — one browser tab is one user. The identical call in `entry-server.ts`
 * produces per-request instances instead. Same code, different lifetime, decided by
 * where it runs.
 */
import { startClient } from '@fluixi/core/client';
// From the subpath, not the package root: the root entry carries the dev server, the
// build commands and the adapters, so importing it here pulls node:fs and esbuild into
// the browser bundle.
import { addInterceptor } from '@fluixi/start/interceptors';
import { provideRoot } from '@fluixi/start/di';
import App from './app.js';
import { rootProviders } from './services/providers.js';
import { currentToken } from './services/session.js';

provideRoot(rootProviders());

// Every outbound call carries the signed-in user, so no call site has to remember to
// attach it. Adding the first interceptor also routes server-function RPC through the
// chain, which is why the desk's `'use server'` calls arrive authenticated too.
addInterceptor({
  request(request) {
    const token = currentToken();
    if (!token) return request;
    const next = new Request(request);
    next.headers.set('authorization', `Bearer ${token}`);
    return next;
  },
});

// Surface a failed call once, centrally, instead of in every catch block. The request id
// comes back from the middleware, so a console line is enough to find the server side of
// the same request.
addInterceptor({
  response(response) {
    if (!response.ok) {
      console.warn(
        `[desk] ${response.status} ${response.url} (${response.headers.get('x-request-id')})`,
      );
    }
    return response;
  },
  error(error, request) {
    console.warn(`[desk] ${request.method} ${request.url} failed —`, error);
    // Returning nothing rethrows; the desk would rather the caller see the failure.
  },
});

startClient(App, { root: '#root' });
