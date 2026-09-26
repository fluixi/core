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
 * `tokens: 'browser'` is a public client with PKCE. No server is required, so it works for
 * a static single-page deployment. A refresh token in storage is readable by any script
 * on the page, which is the cost.
 *
 * `tokens: 'server'` keeps the tokens on the application's own server and gives the browser
 * an httpOnly cookie. A script on the page has nothing to steal. It needs the routes
 * from `@fluixi/oauth2/server`, so the app has to run a server.
 *
 * ## Wiring it
 *
 * ```ts
 * // services/auth.ts
 * export const auth = createAuthService<User>({
 *   config: {
 *     tokens: 'browser',
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
 * ## Binding a token to a key
 *
 * `dpop: true` stops a token being usable by whoever holds a copy. The provider records
 * the key's thumbprint in the token, this client signs a proof for every request, and a
 * service checks the two match. Okta turns the requirement on by default for a new client,
 * so this is sometimes not optional.
 *
 * Both halves matter. A service that receives bound tokens must set `dpop: true` on its
 * verifier as well, or it accepts them as though they were bearer tokens and the binding
 * protects nothing.
 *
 * ## Where trust comes from
 *
 * This client does not verify token signatures, and that is deliberate rather than
 * missing. Three things follow from it, and they are worth knowing before changing any
 * of them.
 *
 * **The tokens are authentic by transport.** They arrive over a direct TLS call this
 * client makes to the token endpoint, exchanging a code obtained with a PKCE verifier
 * only this client holds. OIDC allows a client using the code flow to rely on that in
 * place of checking the id token signature.
 *
 * **Identity comes from userinfo, not from reading a token.** The user is a round trip
 * to the provider with the access token, so it is the provider's answer rather than a
 * claim decoded here. Trusting a decoded id token for identity is the usual mistake, and
 * it is why the userinfo subject is checked against the id token instead.
 *
 * **Verification belongs at the resource server.** An access token is a bearer credential
 * for an API, opaque to the client by design. The API must check the signature, issuer,
 * audience and expiry on every request, with the provider's JWKS. Discovery exposes
 * `jwks_uri` on `Endpoints` for that, and an audited library such as `jose` should do the
 * checking: algorithm confusion and `alg: none` are the standard ways a hand-written
 * verifier becomes worse than none at all.
 *
 * A signature check added here would buy little: an attacker able to forge a token in
 * this client's memory already controls the page, and a locally valid token says nothing
 * about whether the session was revoked a minute ago.
 *
 * ## Hooks
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

export { createDpopKey, proofFor, thumbprintOf, boundKeyOf } from './dpop.js';
export type { DpopKey, ProofOptions } from './dpop.js';

export { safeReturnTo } from './return-to.js';
export type { ReturnToOptions } from './return-to.js';

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

// Token verification lives on `@fluixi/oauth2/verify`, so a browser bundle never pulls in
// `jose` just because the package was imported.
