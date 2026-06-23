---
"@fluixi/auth": minor
---

New `@fluixi/auth` package — server-first auth as **native bindings over Better Auth**
(peer dependency; consumed structurally). Better Auth owns the audited security
primitives (hashing, sessions, CSRF, OAuth, 2FA, organizations, RBAC, DB adapters); this
package owns the Fluixi integration:

- **`/server`** — `defineAuth(betterAuth(...))`, `authMiddleware()` (resolves the session
  once per request into `locals.auth` via the request-locals bridge), `mountAuthRoutes()`,
  and request-context helpers `requireUser` / `optionalUser` / `requireRole` /
  `requirePermission` (no token parsing; work in loaders and server functions).
- **`/client`** — `createAuthHooks(client)` → `useUser` / `useSession` / `useAuth` /
  `useSignIn` / `useSignOut` and `protectedRoute` (authed / `guestOnly` / `role`). The
  session is a `createIsomorphicStore`: server-resolved from `locals.auth`, serialized,
  and seeded synchronously on the client — no auth flash, no post-hydration refetch. The
  client entry never imports the server engine or Node.
