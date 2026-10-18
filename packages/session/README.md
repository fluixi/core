# @fluixi/session

The **client-side** session lifecycle as a reusable primitive. Bring a small backend
**adapter**; `createSession` owns the rest: token/user signals, `isAuthenticated`,
loading/error state, SSR-safe persistence (via `@fluixi/core`'s universal `storage`),
the hydrate-on-load flow, and **automatic token refresh** before expiry.

> Looking for the full server-first auth engine (OAuth, MFA, organizations, RBAC,
> database adapters)? That's `@fluixi/auth`. This package is the lightweight,
> bring-your-own-backend session tier.

```ts
import { createSession } from '@fluixi/session';

const session = createSession<Customer, { email: string; password: string }>({
  // adapter — the backend-specific bits you provide:
  login:     (c)   => authApi.login(c.email, c.password), // → token | { token, expiresAt }
  fetchUser: ()    => customerApi.me(),
  logout:    ()    => authApi.logout(),
  register:  (d)   => authApi.register(d),                 // optional
  refresh:   (t)   => authApi.refresh(t),                  // optional → auto-refresh
  getExpiry: (t)   => decodeJwt(t).exp * 1000,             // optional

  // hooks (optional):
  onLogin, onLogout, onError, onRefresh,
});

session.user();             // reactive
session.isAuthenticated();
session.isLoading();
session.error();
await session.login(creds); // adapter → store token → fetchUser → persist → onLogin
await session.hydrate();    // restore from stored token on load
await session.logout();
```

Provide `refresh` + (`getExpiry` or an `expiresAt` from `login`) and the session
schedules a refresh `refreshSkewMs` (default 60s) before the token expires: client
only, never during SSR.
