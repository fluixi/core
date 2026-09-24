/**
 * Server-held sessions, one mount per provider.
 *
 * Mounted at `/auth/<provider>`, matching the `basePath` the client half uses, so more
 * than one provider can be configured at once and a switch in the interface needs no
 * restart.
 *
 * A provider appears only when its secrets are set. Its client secret and the cookie
 * secret are read from `process.env` and carry no `VITE_` prefix: that prefix puts a value
 * in the browser bundle.
 *
 * The chain is assembled on the first request rather than when this module loads. The
 * framework copies `.env` into `process.env` as it starts, and a module-level read happens
 * before that, so a value present in the file read as absent and nothing mounted.
 */
import { defineMiddleware, type Middleware } from '@fluixi/start';
import { oauthRoutes, sessionLocals } from '@fluixi/oauth2/server';
import { needsSetup, PROVIDERS, type Provider } from './lib/providers.js';

function mountsFor(provider: Provider): Middleware[] {
  const clientSecret = process.env[`${provider.id.toUpperCase()}_CLIENT_SECRET`];
  const cookieSecret = process.env.SESSION_SECRET;
  const appUrl = process.env.APP_URL ?? 'http://localhost:3100';

  if (!clientSecret || !cookieSecret || needsSetup(provider)) return [];

  const config = {
    issuer: provider.issuer,
    // A server-held session authenticates with a secret, which a public client has none
    // of, so that mode uses the confidential client registered alongside it.
    clientId: provider.serverClientId ?? provider.clientId,
    clientSecret,
    cookieSecret,
    basePath: `/auth/${provider.id}`,
    redirectUri: `${appUrl}/auth/${provider.id}/callback`,
    defaultReturnTo: '/',
    scopes: provider.scopes,
    secureCookie: appUrl.startsWith('https://'),
    // One cookie per provider, so a session with one does not overwrite another's.
    cookieName: `fx_session_${provider.id}`,
    ...(provider.endpoints ? { endpoints: provider.endpoints } : {}),
    mapUser: (claims: Record<string, unknown>) => claims,
  };

  // oauthRoutes first: a request to its own routes is answered rather than having a
  // session resolved on the way past.
  return [oauthRoutes(config), sessionLocals(config)];
}

/** Which providers are mounted, for `/api/modes` to report without deciding twice. */
export function serverReadyProviders(): string[] {
  return Object.values(PROVIDERS)
    .filter((p) => mountsFor(p).length > 0)
    .map((p) => p.id);
}

let chain: Middleware[] | null = null;

/**
 * One middleware that owns the rest.
 *
 * `defineMiddleware` takes middleware rather than a factory, so the chain is built here on
 * first use and each member run in order.
 */
const dispatch: Middleware = async (request, next) => {
  if (chain === null) {
    chain = Object.values(PROVIDERS).flatMap(mountsFor);
    if (chain.length === 0) {
      console.warn(
        '[auth-debugger] No provider is configured for a server-held session. Set SESSION_SECRET and <PROVIDER>_CLIENT_SECRET to enable one. Browser mode needs neither.',
      );
    }
  }

  // Compose the chain around `next`, so an unmatched request falls through untouched.
  const run = (index: number): Promise<Response> =>
    index >= chain!.length ? next() : chain![index](request, () => run(index + 1));

  return run(0);
};

export default defineMiddleware(dispatch);
