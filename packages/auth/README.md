# @fluixi/auth

Server-first auth for Fluixi — **native bindings over [Better Auth](https://better-auth.com)**.
Better Auth owns the security primitives (password hashing, sessions, CSRF, secure cookies,
OAuth, 2FA/TOTP, organizations, RBAC, DB adapters — audited and maintained). This package
owns the *Fluixi integration* Better Auth can't provide: request-context server helpers,
SSR-seeded reactive hooks, middleware wiring, and route protection.

`better-auth` is a **peer dependency** — the bindings consume it structurally, so the app owns the version.

## Server (`@fluixi/auth/server`)

```ts
// auth.config.ts
import { betterAuth } from 'better-auth';
import { defineAuth } from '@fluixi/auth/server';
export const auth = defineAuth(betterAuth({ /* db, providers, plugins */ }));
```
```ts
// src/middleware.ts — resolve the session once per request → locals.auth
import { defineMiddleware } from '@fluixi/start';
import { authMiddleware } from '@fluixi/auth/server';
export default defineMiddleware([ authMiddleware() ]);
```
```ts
// src/api/auth/[...all].ts — mount Better Auth
import { mountAuthRoutes } from '@fluixi/auth/server';
export const ALL = mountAuthRoutes(); // (request) => auth.handler(request)
```
```ts
// loaders / server functions — no token parsing, reads request-scoped locals
const user  = await requireUser();            // throws AuthError(401, '/login')
const admin = await requireRole('admin');     // throws AuthError(403)
await requirePermission(() => can(user, 'edit', post));
const maybe = await optionalUser();           // U | null
```
```ts
// API route contracts (@fluixi/api) take a guard instead: it runs before the input is read
// and types `auth` in the handler.
import { route } from '@fluixi/api';
import { member, signedIn } from '@fluixi/auth/server';

export const GET = route({ guard: signedIn(), handler: ({ auth }) => auth.user });
export const DELETE = route({
  guard: member({ roles: ['owner', 'admin'] }), // 403 no_active_organization, not_a_member, forbidden
  handler: ({ auth }) => projects.remove(auth.member.organizationId),
});
```
> The app entry must forward the request so middleware locals reach the render:
> `export const render = (url, request) => renderRequestAsync(App, { url, request })`.

## Client (`@fluixi/auth/client`)

```ts
import { createAuthClient } from 'better-auth/client';
import { createAuthHooks } from '@fluixi/auth/client';

const authClient = createAuthClient({ baseURL: '/api/auth' });
export const { useUser, useSession, useAuth, useSignIn, useSignOut, protectedRoute } =
  createAuthHooks({ client: authClient });
```
```ts
const user = useUser();                 // reactive accessor, SEEDED from SSR (no flash/refetch)
const signIn = useSignIn();
export default protectedRoute(() => <Dashboard/>);          // authed only
export default protectedRoute(Login, { guestOnly: true });  // redirect authed away
export default protectedRoute(Admin, { role: 'admin' });    // role-gated
```

The session is a `createIsomorphicStore` — resolved on the server from `locals.auth`,
serialized into the page, and seeded synchronously on the client. No auth flash, no
post-hydration refetch. `@fluixi/auth/client` never imports the server engine or Node.
