/**
 * OAuth2 and OIDC for a Fluixi application.
 *
 * Two pieces, and the split is the point. `AuthClient` drives the protocol: it starts a
 * login, turns a callback into tokens, refreshes and ends the session. `AuthService`
 * drives the application: who is signed in, whether the session holds, what to render.
 * The service depends on a client and never on which one, so the same application code
 * runs whether the tokens live in the browser or on a server.
 *
 * ## Choosing a mode
 *
 * `mode: 'browser'` is a public client with PKCE. No server is required, so it works for
 * a static single-page deployment. A refresh token in storage is readable by any script
 * on the page, which is the cost.
 *
 * `mode: 'server'` keeps the tokens on the application's own server and gives the browser
 * an httpOnly cookie. A script on the page has nothing to steal. It needs the routes
 * from `@fluixi/oauth2/server`, so the app has to run a server.
 *
 * ## Wiring it
 *
 * ```ts
 * // services/auth.ts
 * export const auth = createAuthService<User>({
 *   config: {
 *     mode: 'browser',
 *     issuer: 'https://localhost:8443',
 *     clientId: 'admin-spa',
 *     redirectUri: `${location.origin}/callback`,
 *   },
 * });
 *
 * // entry-client.tsx
 * provideRoot([{ provide: AuthServiceToken, useValue: auth }]);
 *
 * // anywhere below
 * const auth = inject(AuthServiceToken);
 * ```
 *
 * The hooks from `@fluixi/auth/client` take the service directly, because it satisfies
 * the session shape they expect:
 *
 * ```ts
 * export const { protectedRoute, useUser, Can } = createAuthHooks({
 *   session: auth,
 *   navigate: { handler: useNavigate },
 *   loginPath: '/login',
 * });
 * ```
 */
export { createAuthService, paramsFromUrl } from './service.js';
export type { AuthService, AuthServiceOptions, AuthCredentials } from './service.js';

export { createBrowserClient } from './browser.js';
export { createServerClient, COOKIE_SESSION } from './server-client.js';

export { discover, clearDiscoveryCache } from './discovery.js';
export {
  createPkcePair,
  createVerifier,
  createChallenge,
  createStateValue,
  expiryFromJwt,
} from './pkce.js';

export { OAuthError } from './types.js';
export type {
  AuthClient,
  AuthConfig,
  BaseConfig,
  BrowserConfig,
  CallbackParams,
  Endpoints,
  LoginOptions,
  ServerConfig,
  Tokens,
} from './types.js';

export { AuthServiceToken, AuthClientToken } from './tokens.js';
