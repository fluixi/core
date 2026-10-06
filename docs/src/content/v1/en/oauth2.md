# OAuth2 and OIDC

`@fluixi/oauth2` is for an app that delegates identity to a provider: Keycloak, Auth0,
Okta, Curity, Entra, or your own authorization server. You do not build the login page and
you hold no user records.

```ts
import { createAuthService } from '@fluixi/oauth2';
import { useNavigate } from '@fluixi/start/router';
import { env } from '@fluixi/start/env';

// Not location.origin: app.config.ts loads this module on the server too, which has no location.
const appUrl = env('APP_URL') ?? 'http://localhost:3000';

export const auth = createAuthService<User>({
  config: {
    tokens: 'browser',
    issuer: 'https://localhost:8443/realms/app',
    clientId: 'admin-spa',
    redirectUri: `${appUrl}/callback`,
  },
  navigate: { handler: useNavigate },
  loginPath: '/login',
});
```

One issuer URL is the whole configuration. Discovery reads the authorize, token, userinfo
and end-session endpoints from `/.well-known/openid-configuration`.

## The two halves

`AuthClient` is the protocol: start a login, turn a callback into tokens, refresh, end the
session. It holds no application state.

`AuthService` is the application: who is signed in, whether the session holds, when to
refresh, what to render. It is built on [`@fluixi/session`](/v1/en/session), so everything
on that page applies here too.

The service depends on a client and never on which one, which is what lets the same app
code run whether the tokens live in the browser or on a server.

## Configuration from the environment

Which provider, which issuer, which client and where the tokens live are deployment facts, so
they belong in the environment. `authFromEnv` reads them and returns a preset for the provider
plus a client config ready to spread:

```ts
// src/config/env.ts
import { publicEnv } from '@fluixi/start/env';
import { authFromEnv } from '@fluixi/oauth2/env';
import { rolesFrom } from '@fluixi/oauth2/roles';

export const auth = authFromEnv(publicEnv(), {
  clientPrefix: '',
  roles: rolesFrom.keycloakRealm,
});
```

It returns `provider`, `providerName`, `clientId`, `tokens`, `redirectUri`, `scopes` and
`client`. Moving to another provider is then a change to `.env`, not to code.

| Variable | Meaning |
| --- | --- |
| `AUTH_PROVIDER` | `oidc` (default), `keycloak`, `auth0`, `okta`, `google`, `dex`, `oauth2` |
| `AUTH_ISSUER` | the issuer, for `oidc` and `oauth2` |
| `AUTH_CLIENT_ID` | this client |
| `AUTH_TOKENS` | `browser` (default) or `server` |
| `AUTH_REDIRECT_URI` | where the provider sends the browser back |
| `AUTH_SCOPES` | space or comma separated, replacing the preset's |
| `AUTH_AUDIENCE` | an API identifier. Auth0 needs it to issue a JWT access token |
| `AUTH_DPOP` | `true` or `false`, overriding the preset |
| `AUTH_DOMAIN` | the tenant, for `auth0` and `okta` |
| `AUTH_BASE_URL` | for `keycloak` and `dex` |
| `AUTH_REALM` | for `keycloak` |
| `AUTH_AUTH_SERVER` | for `okta`: `default` unless set, `org` for the org server |
| `AUTH_ROLES_CLAIM` | the namespaced claim an Auth0 action adds |

The names above carry `clientPrefix`, `VITE_` by default. With `publicEnv()` pass
`clientPrefix: ''`: the app declares which variables the browser may see in `env.public`, so
the names need no prefix to say it (see [Environment variables](/v1/en/environment)). A
client secret is never one of them; the server reads it with `serverEnv`.

`prefix: 'GOOGLE'` reads `GOOGLE_*` before `AUTH_*`, so one app can carry several providers.
`provider`, `tokens` and `roles` in the options override what the environment says. A missing
variable throws with its name, and a `TOKENS` value other than `browser` or `server` throws
naming both.

### Provider presets

A preset holds what each provider turned out to need when it was tested live: how it spells
its issuer, where it keeps roles, what a verifier should check. `authFromEnv` picks one from
`AUTH_PROVIDER`; `presets` from `@fluixi/oauth2/presets` can also be called directly.

| Preset | `AUTH_PROVIDER` | Needs |
| --- | --- | --- |
| Any OIDC provider | `oidc` | `_ISSUER` |
| Plain OAuth2 | `oauth2` | `_ISSUER`, plus `endpoints` in code |
| Keycloak | `keycloak` | `_BASE_URL`, `_REALM` |
| Auth0 | `auth0` | `_DOMAIN`; `_AUDIENCE` and `_ROLES_CLAIM` optional |
| Okta | `okta` | `_DOMAIN`; `_AUTH_SERVER` optional |
| Google | `google` | nothing; a hosted domain optional |
| Dex | `dex` | `_BASE_URL` |

Each preset also records the constraints that cost a live run to find:

**Plain OAuth2**

- Publishes no discovery document, so every endpoint is configured by hand.

**Keycloak**

- Puts no `aud` on an access token until a dedicated audience mapper is configured. Configure one and switch the verifier to `audience: clientId`.
- Revokes the whole session when an authorization code is replayed, so a replay test has to run last.

**Auth0**

- Issues an opaque access token unless `audience` names an API, so token verification needs it.
- A refresh token needs three things together: `offline_access` in the scopes, an audience whose API has Allow Offline Access on, and Refresh Token Rotation enabled on the application. Any one missing and the scope is ignored silently.
- Has no roles claim of its own. An action must add a namespaced one, and Auth0 drops a custom claim that is not a URI.
- The issuer carries a trailing slash. A verifier pinned without it rejects every token.

**Okta**

- Two authorization servers: /oauth2/<name> for an application, the bare domain for the management API. They are not interchangeable.
- Turns DPoP on by default for a new application, and an integrator org will not let you untick it.
- Binds the refresh token to the DPoP key as well as the access token, so a refresh must be proved with the key that obtained it.
- A public SPA cannot introspect at all. An API Services client with `private_key_jwt` has to ask instead.
- Client credentials against the org server must use `private_key_jwt`, whatever the application is set to.

**Google**

- Refuses a public client: the token endpoint reports `client_secret is missing` before checking PKCE, so browser mode cannot work.
- Publishes its issuer both with and without a scheme, so a verifier needs both spellings.
- Issues a refresh token only on the first consent unless `prompt=consent` and `access_type=offline` are sent.

**Dex**

- Sends no CORS headers on discovery or the token endpoint, so browser mode cannot work. Naming the endpoints explicitly only moves the failure to the token request.
- Has no admin interface. Users are static entries in its config file, and a password is a bcrypt hash.
- Publishes no revocation endpoint.
## Wiring it up

`fluixi add auth oauth2` (or `create-fluixi` with `--auth=oauth2`) writes these files, registers the
module, and adds the `AUTH_*` names to `env.public` and to `.env.example`. This section shows what
it writes, for reading or for wiring by hand.

Three files: the service, the app config that registers it, and the callback route.

```ts
// src/services/auth.ts
import { createAuthService, authModule } from '@fluixi/oauth2';
import { env } from '@fluixi/start/env';
import { auth as authEnv } from '../config/env.js';

// Not location.origin: app.config.ts loads this module on the server too, which has no location.
const appUrl = env('APP_URL') ?? 'http://localhost:3000';

interface User {
  sub: string;
  email?: string;
  role?: string;
}

export const auth = createAuthService<User>({
  config: {
    ...authEnv.client,
    tokens: 'browser',
    redirectUri: `${appUrl}/callback`,
    postLogoutRedirectUri: `${appUrl}/login`,
  },
});

export const AuthModule = authModule(auth);
export const { protectedRoute, Protect, Can, useUser } = auth;
```

`tokens` is set again after the spread so TypeScript knows which half of the config this is.

```ts
// src/app.config.ts
import { defineApp } from '@fluixi/start/app';
import { AuthModule } from './services/auth.js';

export default defineApp({ imports: [AuthModule] });
```

`@fluixi/start` registers `src/app.config.ts` before either entry runs, so neither
`entry-client` nor `entry-server` mentions auth. See [App modules](/v1/en/app-modules).

```tsx
// src/routes/callback.tsx
import { OAuthCallback } from '@fluixi/oauth2/callback';
import { auth } from '../config/env.js';

export default OAuthCallback({
  enabled: () => auth.tokens === 'browser',
  pending: () => <p>Signing you in</p>,
  failed: (reason) => (
    <>
      <p>{reason}</p>
      <a href="/login">Try again</a>
    </>
  ),
});
```

`OAuthCallback` is the whole redirect-URI route. It exchanges the code, checks the `state`,
and sends the visitor to the destination `signIn({ returnTo })` recorded before the redirect.
It gets the service from `AuthServiceToken`, which `authModule` registered; pass `service` to
skip injection.

Give `failed` a way back to the login: a visitor stuck on this page has nothing else to do.
`enabled` returns false when the app runs with `tokens: 'server'`, where the provider
redirects to the server's own `/auth/callback` and there is nothing to exchange here.

It leaves with `location.replace` by default, since the page exists for one transition. Pass
`onSignedIn(destination)` to stay in the client router instead. `useOAuthCallback` is the hook
underneath, with `stage`, `error`, `destination` and `params` as signals, for a page that wants
to show the steps.

The login page and the guards:

```tsx
// src/routes/login.tsx
import { auth } from '../services/auth.js';

export default function Login() {
  return <button onClick={() => auth.signIn({ returnTo: '/dashboard' })}>Sign in</button>;
}
```

```tsx
export default protectedRoute(Dashboard);
```

## Where the tokens live

### `tokens: 'browser'`

A public client with PKCE, holding its own tokens. No server required, so a static single
page deployment works.

The access token is kept in memory alone; the refresh token goes to `sessionStorage` by
default, or `localStorage` with `storage: 'local'` if a session should survive a tab
close. Either way it is reachable by any script on the page. That is the cost of not
running a server, and it is why the other mode exists.

There is no client secret, because anything shipped to a browser is not a secret. PKCE is
what replaces it, and it is not optional here.

### `tokens: 'server'`

The tokens stay on your server and the browser gets an httpOnly cookie it cannot read, so
a script on the page has nothing to steal. The server half is a module:

```ts
// src/services/auth.server.ts
import { authServerModule } from '@fluixi/oauth2/server';
import { publicEnv, serverEnv } from '@fluixi/start/env';
import { auth } from '../config/env.js';

export function authServer() {
  const appUrl = publicEnv().APP_URL ?? 'http://localhost:3000';
  return authServerModule({
    ...auth.client,
    clientSecret: serverEnv('OIDC_CLIENT_SECRET', { required: true }),
    cookieSecret: serverEnv('SESSION_SECRET', { required: true }),
    redirectUri: `${appUrl}/auth/callback`,
    defaultReturnTo: '/dashboard',
    secureCookie: appUrl.startsWith('https://'),
  });
}
```

```ts
// src/app.config.server.ts
import { defineApp } from '@fluixi/start/app';
import { auth } from './config/env.js';
import { authServer } from './services/auth.server.js';

export default defineApp({
  imports: auth.tokens === 'server' ? [authServer()] : [],
});
```

Only the server build imports `src/app.config.server.ts`, so the client secret and the cookie
key never reach the browser bundle. `authServer` is a function because `serverEnv` with
`required` throws when a variable is unset, and in browser mode these are.

`authServerModule` mounts `oauthRoutes` and then `sessionLocals`. The routes live under
`basePath`, `/auth` by default: `/login`, `/callback`, `/refresh`, `/me`, `/revoke` and
`/logout`. Register `<appUrl>/auth/callback` as the redirect URI at the provider. The cookie is
encrypted with a key derived from `cookieSecret`, which must be at least 32 bytes.

This is also the mode for a provider that refuses a public client: Google answers a token
request without a secret with `client_secret is missing`.

`sessionLocals` puts the signed-in user on request locals, which is where the auth hooks
look during a server render, so `useUser()` answers during SSR instead of filling in after
hydration.

It reuses a userinfo response for `userCacheMs` (30 seconds by default) rather than asking
the provider on every render. Set `0` to always ask. The tradeoff is freshness: a session
ended at the provider keeps rendering as signed in until the entry expires.

### Calling your APIs as the user

A signed-in request also carries a `fetch` on `locals.auth` that sends the session's access
token, with a DPoP proof when the token is bound to the session's key. `requestAuth()` from
`@fluixi/oauth2/server` reads it in a route's data loader, a server function or an API route:

```ts
import { requestAuth } from '@fluixi/oauth2/server';

export async function projects() {
  const { fetch } = await requestAuth();
  if (!fetch) throw new Error('signed out');
  const response = await fetch(`${apiUrl}/projects`);
  return response.json();
}
```

The token never reaches the browser and never passes through app code. A signed-out request has
no `fetch`. It does not refresh: a call made after the token expired gets the API's 401, and the
browser refreshes through `/auth/refresh` on its own schedule. A body is sent twice when the
server asks for a DPoP nonce, so pass a string rather than a stream.

There is no browser-mode equivalent of `sessionLocals`, and that is not an omission. In
that mode the token never leaves the browser and is not sent on a document request, so the
server has no credential to resolve. An app built that way renders the signed-out shell
and fills it in on the client.

## DPoP

A bearer token works for whoever holds a copy. DPoP (RFC 9449) binds the token to a key the
client holds: the provider records the key's thumbprint in the token as `cnf.jkt`, and every
request carries a fresh proof signed with that key. A copied token is useless without the key.

Turn it on with `dpop: true`, or `AUTH_DPOP=true` through `authFromEnv`. Proofs are signed with
`dpopAlgorithm`, `ES256` unless set, and need the `jose` package, an optional peer. Some
providers leave no choice: Okta turns DPoP on for a new application, and an integrator org will
not let you turn it off.

A provider that wants a server-chosen nonce refuses the request with `use_dpop_nonce` and a
`DPoP-Nonce` header. The client repeats the request once with that nonce in the proof, in both
modes.

### In the browser

```ts
import { createAuthService } from '@fluixi/oauth2';
import { env } from '@fluixi/start/env';

// Not location.origin: app.config.ts loads this module on the server too, which has no location.
const appUrl = env('APP_URL') ?? 'http://localhost:3000';

export const auth = createAuthService({
  config: {
    tokens: 'browser',
    issuer: 'https://example.okta.com/oauth2/default',
    clientId: 'spa',
    redirectUri: `${appUrl}/callback`,
    dpop: true,
  },
});
```

The key is made per client, non-extractable, and kept in IndexedDB. IndexedDB stores the key
object itself, so the private half is never bytes a script could read or send anywhere. It
persists across reloads on purpose: a refresh token is bound to the key that obtained it, and
a refresh proved with any other key is refused.

### On the server

Set `dpop: true` on the `authServerModule` config. Each session gets its own key at the code
exchange, kept as a JWK inside the encrypted session cookie. Refreshes are signed with that
same key, and the userinfo calls behind `/auth/me` and `sessionLocals` use the `DPoP` scheme
with a proof carrying the token's hash (`ath`).

### At the API

Binding protects nothing unless the API checks the proof. `createTokenVerifier({ dpop: true })`
does; see [Token verification](/v1/en/token-verification).

## Signing out, and what it leaves behind

`auth.logout()` clears the session here and sends the visitor to the provider's end
session endpoint, so the provider's own cookie goes too and the next login is a prompt
rather than a silent redirect.

It also **revokes** the refresh token first, through the provider's revocation endpoint
(RFC 7009). That matters more than it looks: forgetting a refresh token locally leaves any
copy of it working for its whole lifetime, while this browser believes it signed out. An
access token expires on its own in minutes; a refresh token does not.

To retire a token without ending the session, call it directly:

```ts
await auth.client.revoke();                      // the refresh token
await auth.client.revoke(token, 'access_token'); // a specific one
```

A provider that publishes no revocation endpoint cannot do this, and the call resolves
without having done anything rather than failing a logout over it.

## Where the user comes from

By default, the provider's OIDC userinfo endpoint. Most apps want their own, because the
provider knows who someone is but not that they are a support agent here.

```ts
createAuthService<User>({
  config: {
    tokens: 'browser',
    issuer,
    clientId,
    redirectUri,
    userInfo: {
      url: 'https://api.example.com/me',
      map: (raw) => ({ id: raw.data.uid, email: raw.data.email, role: raw.data.role }),
      headers: { 'x-tenant': 'acme' },
      credentials: 'include',   // for an API that answers from a cookie
    },
  },
});
```

`map` receives the parsed body and the access token, and may be async. Use it alone,
without `url`, to reshape the provider's own claims. The bearer token is still sent to a
custom endpoint: it is your API, but it is still authenticated.

For anything this does not reach, replace `fetchUser` outright:

```ts
createAuthService<User>({ config, fetchUser: async (accessToken) => { /* ... */ } });
```

## Providers that are not standard OIDC

**No discovery document.** Give the endpoints directly:

```ts
config: {
  tokens: 'browser',
  clientId,
  redirectUri,
  endpoints: {
    authorization: 'https://example.com/oauth/authorize',
    token: 'https://example.com/oauth/token',
    userinfo: 'https://example.com/api/user',
  },
}
```

**No userinfo endpoint at all,** as with plain OAuth2 providers like GitHub. Set
`userInfo.url` or `fetchUser`.

**Credentials in a header.** Some token endpoints accept only HTTP Basic:

```ts
config: { /* ... */ tokenAuthMethod: 'basic' }
```

**Provider-specific parameters,** such as Auth0's `audience`:

```ts
config: { /* ... */ extraParams: { audience: 'https://api.example.com' } }
```

**More than one provider on a page.** Each client namespaces its stored values by
`clientId`, so two in-flight logins do not overwrite each other. Set `storageKey` when two
clients share a provider.

## Roles from the provider

```ts
createAuthService<User, Permissions>({
  config,
  access: {
    getRole: (user) => user?.role ?? user?.groups?.[0] ?? null,
    permissions: ROLE_PERMISSIONS,
  },
});
```

Where the roles are depends on the provider. Keycloak puts realm roles in `realm_access.roles`
on the access token, not in userinfo, so an app wanting them either configures a mapper or
reads them server-side. See [Token verification](/v1/en/token-verification).

## Dependency injection

App code usually imports the service, which is simpler and works outside a component. The
tokens are for code that cannot import your app: `OAuthCallback` injects `AuthServiceToken`
when it is given no `service`, and a test can provide a fake.

`authModule(auth)` in `src/app.config.ts` registers `AuthServiceToken` and `AuthClientToken`.
On the server the same instance serves every request. That is safe because it holds nothing
about the visitor: the signed-in user comes from request locals, which `sessionLocals` fills per
request. See [App modules](/v1/en/app-modules) and
[Dependency injection](/v1/en/dependency-injection).

## What the package checks, and what it does not

**Checked.** The `state` on a callback must match the one this client sent, which is the
CSRF check. The PKCE verifier is single use, so a replayed callback fails. A userinfo `sub`
that does not match the id token is discarded, which OIDC requires. A refresh refused
with `invalid_grant` clears the stored refresh token, since RFC 6749 says it is finished;
any other failure (a wrong proof, a nonce request, a dropped connection) is about the attempt
and keeps it.

A `returnTo` arrives on the query string, so it is attacker controlled. Anything that is not a
path on this origin is refused unless its origin is in `allowedReturnOrigins`. Server mode
checks it when the flow starts and again when it redirects.

**Not checked, deliberately.** The client does not verify token signatures. The tokens
arrive over a direct TLS call this client makes to the token endpoint, exchanging a code
obtained with a PKCE verifier only it holds, and OIDC allows a code-flow client to rely on
that. Identity comes from a userinfo round trip rather than from decoding a token, which is
the safer source anyway.

Signature verification belongs at the API receiving the token. That is
[Token verification](/v1/en/token-verification), and it is not optional.

## Lower-level pieces

The service is built from these, exported for anything it does not cover.

| Export | From | What it is |
| --- | --- | --- |
| `createBrowserClient` | `@fluixi/oauth2` | the protocol client for `tokens: 'browser'`: PKCE, storage, refresh, DPoP |
| `createServerClient` | `@fluixi/oauth2` | the browser half of `tokens: 'server'`; calls `/auth/*` and never sees a token |
| `discover`, `clearDiscoveryCache` | `@fluixi/oauth2` | reads and caches `/.well-known/openid-configuration` |
| `createPkcePair`, `createVerifier`, `createChallenge`, `createStateValue` | `@fluixi/oauth2` | PKCE (S256) and `state` values |
| `safeReturnTo` | `@fluixi/oauth2` | the check applied to a post-login destination |
| `expiryFromJwt` | `@fluixi/oauth2` | reads `exp` from a JWT without verifying it |
| `createDpopKey`, `proofFor`, `thumbprintOf`, `boundKeyOf` | `@fluixi/oauth2` | DPoP keys, proofs, RFC 7638 thumbprints, a token's `cnf.jkt` |
| `presets` | `@fluixi/oauth2/presets` | the provider presets above |
| `rolesFrom` | `@fluixi/oauth2/roles` | where each provider keeps roles; safe in a browser bundle |

Next: **[Better Auth](/v1/en/better-auth)**.
