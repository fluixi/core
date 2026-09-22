# OAuth2 and OIDC

`@fluixi/oauth2` is for an app that delegates identity to a provider: Keycloak, Auth0,
Okta, Curity, Entra, or your own authorization server. You do not build the login page and
you hold no user records.

```ts
import { createAuthService } from '@fluixi/oauth2';
import { useNavigate } from '@fluixi/start/router';

export const auth = createAuthService<User>({
  config: {
    mode: 'browser',
    issuer: 'https://localhost:8443/realms/app',
    clientId: 'admin-spa',
    redirectUri: `${location.origin}/callback`,
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

## Wiring it up

Three pieces: a login page that starts the flow, a callback route that finishes it, and a
guard.

```tsx
// routes/login.tsx
export default function Login() {
  return <button onClick={() => auth.signIn({ returnTo: '/dashboard' })}>Sign in</button>;
}
```

```tsx
// routes/callback.tsx
export default function Callback() {
  const navigate = useNavigate();
  const error = signal<string | null>(null);

  // Browser only. The authorization code is on this URL and the PKCE verifier is in this
  // browser's storage, so the exchange cannot happen anywhere else.
  if (typeof window !== 'undefined') {
    void auth.complete()
      .then((destination) => navigate(destination, { replace: true }))
      .catch((cause) => error.set(String(cause)));
  }

  return <p>{() => error() ?? 'Signing you in'}</p>;
}
```

`complete()` exchanges the code, loads the user, and returns where the visitor was heading
when the login started, which is what `signIn({ returnTo })` recorded before the redirect.

The guards come back from the service itself, so there is no second file:

```tsx
export const { protectedRoute, Can, useUser } = auth;

export default protectedRoute(Dashboard);
```

## Choosing a mode

### `mode: 'browser'`

A public client with PKCE, holding its own tokens. No server required, so a static single
page deployment works.

The access token is kept in memory alone; the refresh token goes to `sessionStorage` by
default, or `localStorage` with `storage: 'local'` if a session should survive a tab
close. Either way it is reachable by any script on the page. That is the cost of not
running a server, and it is why the other mode exists.

There is no client secret, because anything shipped to a browser is not a secret. PKCE is
what replaces it, and it is not optional here.

### `mode: 'server'`

The tokens stay on your server and the browser gets an httpOnly cookie it cannot read, so
a script on the page has nothing to steal. It needs the routes:

```ts
// src/middleware.ts
import { defineMiddleware } from '@fluixi/start';
import { oauthRoutes, sessionLocals } from '@fluixi/oauth2/server';

const config = {
  issuer: process.env.OIDC_ISSUER!,
  clientId: process.env.OIDC_CLIENT_ID!,
  clientSecret: process.env.OIDC_CLIENT_SECRET!,
  redirectUri: 'http://localhost:3000/auth/callback',
  cookieSecret: process.env.SESSION_SECRET!,
};

export default defineMiddleware([oauthRoutes(config), sessionLocals(config)]);
```

`oauthRoutes` serves `/auth/login`, `/callback`, `/refresh`, `/me` and `/logout`.
`sessionLocals` puts the signed-in user on request locals, which is where the auth hooks
look during a server render, so `useUser()` answers during SSR instead of filling in after
hydration. Mount it after `oauthRoutes`.

It reuses a userinfo response for `userCacheMs` (30 seconds by default) rather than asking
the provider on every render. Set `0` to always ask. The tradeoff is freshness: a session
ended at the provider keeps rendering as signed in until the entry expires.

There is no browser-mode equivalent of `sessionLocals`, and that is not an omission. In
that mode the token never leaves the browser and is not sent on a document request, so the
server has no credential to resolve. An app built that way renders the signed-out shell
and fills it in on the client.

## Where the user comes from

By default, the provider's OIDC userinfo endpoint. Most apps want their own, because the
provider knows who someone is but not that they are a support agent here.

```ts
createAuthService<User>({
  config: {
    mode: 'browser',
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
  mode: 'browser',
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

The service is usually imported directly, which works anywhere including outside a
component. Tokens exist for the cases that want a seam, such as a test providing a fake:

```ts
import { AuthServiceToken, AuthClientToken } from '@fluixi/oauth2';
import { provideRoot } from '@fluixi/start/di';

export function provideAuth(): void {
  provideRoot([
    { provide: AuthServiceToken, useValue: auth },
    { provide: AuthClientToken, useValue: auth.client },
  ]);
}
```

Call it from the client entry, and from the server entry too if any route injects during a
server render. See [Dependency injection](/v1/en/dependency-injection) for why the root
scope is the right one here.

## What the package checks, and what it does not

**Checked.** The `state` on a callback must match the one this client sent, which is the
CSRF check. The PKCE verifier is single use, so a replayed callback fails. A userinfo `sub`
that does not match the id token is discarded, which OIDC requires. A refused refresh
clears the dead token rather than retrying it forever.

**Not checked, deliberately.** The client does not verify token signatures. The tokens
arrive over a direct TLS call this client makes to the token endpoint, exchanging a code
obtained with a PKCE verifier only it holds, and OIDC allows a code-flow client to rely on
that. Identity comes from a userinfo round trip rather than from decoding a token, which is
the safer source anyway.

Signature verification belongs at the API receiving the token. That is
[Token verification](/v1/en/token-verification), and it is not optional.

Next: **[Better Auth](/v1/en/better-auth)**.
