# Sessions

`@fluixi/session` is for an app with its own login page and its own user store. You supply
one function that turns credentials into a token; the package owns everything after that.

```ts
import { createSession } from '@fluixi/session';

export const auth = createSession<User, { email: string; password: string }>({
  async login(creds) {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(creds),
    });
    if (!response.ok) throw new Error('Those details did not match.');

    const { access_token, expires_in } = await response.json();
    return { token: access_token, expiresAt: Date.now() + expires_in * 1000 };
  },

  fetchUser: (token) =>
    fetch('/api/me', { headers: { authorization: `Bearer ${token}` } }).then((r) => r.json()),
});
```

That is the whole client side. What you get without writing it:

- `user()`, `token()`, `status()` and `isAuthenticated()` as signals
- persistence, so a reload does not sign someone out
- hydration on first load, from storage
- automatic refresh before expiry, once you supply `refresh`
- roles and permissions, once you supply `access`
- a guard that reacts to a 401 from your own API

## The adapter

Only `login` and `fetchUser` are required. The rest add behaviour.

```ts
createSession<User, Credentials>({
  login: (creds) => /* -> token string, or { token, expiresAt } */,
  fetchUser: (token) => /* -> the user */,

  logout: () => fetch('/api/logout', { method: 'POST' }),
  register: (data) => /* -> a token to sign them in, or nothing */,
  refresh: (token) => /* -> a fresh token, enables automatic refresh */,
  getExpiry: (token) => /* -> epoch ms, when the token does not say */,
});
```

`refresh` is what turns on the refresh timer. Without it a session simply expires.
`getExpiry` is only needed when your token is opaque and your login response carries no
`expires_in`.

## Where it is kept

The token, the user and the expiry are kept in localStorage in the browser, through
[`@fluixi/storage`](/v1/en/storage), and nowhere on the server: one session object there would
be shared by every visitor. Pass `storage` for somewhere else, or `null` to keep them in memory
only.

```ts
createSession({ ...adapter, storage: createStorage({ adapter: sessionStorageAdapter() }) });
```

## Status, and why it has more than two values

```ts
auth.status();  // 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error'
```

Two states would force you to render a signed-out page while the first hydration is still
in flight, which is the flash every app then works around. `loading` exists so you can
render nothing until the answer is known.

```tsx
<Show when={() => auth.status() !== 'loading'} fallback={<Spinner />}>
  <App />
</Show>
```

## Roles and permissions

`access` maps a user onto a permission set. `getRole` reads the role from wherever it
lives on your user; `permissions` maps roles onto whatever shape you want.

```ts
createSession<User, Credentials, unknown, Permissions>({
  login,
  fetchUser,
  access: {
    getRole: (user) => user?.role ?? null,
    permissions: {
      admin:   { users: { read: true, delete: true } },
      support: { users: { read: true, delete: false } },
    },
    guest: { users: { read: false, delete: false } },
  },
});
```

```ts
auth.roles();                          // ['admin']
auth.can((p) => p.users.delete);       // true
```

`permissions` can be a function instead of a map, for access computed from user fields
rather than a fixed matrix.

This is a rendering aid. Your server decides what is allowed.

## The session cookie, on the server

`@fluixi/session/server` holds a session the browser cannot read. It seals a value into an
httpOnly cookie with AES-GCM through Web Crypto, so it runs on Node, Bun, Deno and a
worker with no native dependency.

```ts
import { createSessionCookie } from '@fluixi/session/server';

const session = createSessionCookie<{ userId: string }>({
  secret: process.env.SESSION_SECRET!,   // at least 32 characters
});

// after your own code checked the password
return new Response(null, {
  status: 302,
  headers: { location: '/', 'set-cookie': await session.write({ userId: user.id }) },
});

// on any later request
const current = await session.read(request);   // { userId } or null
```

It is not an auth system and does not know what a user is. It seals a value and reads it
back, which is the part every server-held session needs.

### The cookie is not your database

The cookie says *which* row to look at. A real store holds the users.

```ts
const { userId } = (await session.read(request)) ?? {};
const user = await db.users.findById(userId);
```

You can seal the claims themselves and skip the lookup, but then you cannot revoke:
disabling an account has no effect until the cookie expires. Sealing a reference keeps the
database as the source of truth, and the extra query is usually worth it.

### What the cookie carries

`HttpOnly`, so no script can read it. `SameSite=Lax` by default, which survives a
top-level navigation back from an external login; `Strict` would withhold it on exactly
that request. `Secure` in production, and forced whenever `sameSite: 'none'`, because that
value is ignored without it. AES-GCM authenticates as well as encrypts, so an altered
cookie fails to open rather than decrypting to something else.

`readCookie(request, name)`, from the same module, returns a single raw cookie value, for a
cookie this helper did not write.

## What you still write yourself

`@fluixi/session` is the client session and the cookie. It is not an auth server, so these
remain yours:

- **Password hashing.** argon2id or bcrypt. Never store a password, never compare in plain
  text.
- **The user table** and the lookup.
- **Login, logout and register routes.**
- **Rate limiting on login,** so the endpoint is not a password oracle.

If that list is more than you want to own, [OAuth2](/v1/en/oauth2) removes it by
delegating to a provider, and `better-auth` with `@fluixi/auth` provides it directly.

## Reacting to an expired session

Your API answering 401 is the signal that a session ended elsewhere.

```ts
const auth = createSession({
  login,
  fetchUser,
  unauthorized: {
    status: 401,
    // Narrow it, so a failed login does not read as an expired session.
    shouldHandle: (url) => url.startsWith('/api/') && !url.endsWith('/login'),
    onExpiry: () => navigate('/login?reason=expired'),
  },
});
```

Then make your data layer use the session's own fetch, which is what applies the rule:

```ts
const response = await auth.guardedFetch('/api/orders');
```

`installGlobal: true` patches the global `fetch` instead, for an SDK that always calls it
and gives you no seam. Prefer `guardedFetch` where you have the choice.

`auth.expired()` is set when this fires, so the login page can say why someone is back
there rather than showing a bare form.

### Without a session

The rule is exported on its own, for a data layer that does not sit behind `createSession`:

```ts
import { createFetchGuard } from '@fluixi/session';

export const api = createFetchGuard({
  status: 401,
  shouldHandle: (url) => url.startsWith('/api/') && !url.endsWith('/login'),
  onUnauthorized: () => location.assign('/login?reason=expired'),
});

const orders = await api('/api/orders');
```

It returns a new `fetch` and changes nothing global. `onUnauthorized` fires once until
`api.reset()`, so ten requests failing together report one expired session, not ten.
`installGlobalFetchGuard(options)` applies the same rule to the global `fetch`. It does nothing
on the server and returns a function that puts the original back.

Next: **[OAuth2 and OIDC](/v1/en/oauth2)**.
