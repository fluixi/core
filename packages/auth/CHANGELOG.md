# @fluixi/auth

## 1.0.0-alpha.26

### Minor Changes

- 7616a36: Less auth boilerplate + proper cookies + a CLI generator.

  - **`createAuthHooks({ session })`** — drive the hooks from an existing reactive session
    (e.g. `@fluixi/session`) instead of a Better Auth client. The framework owns the reactive
    sync, so apps stop hand-writing a `createEffect` to mirror their store into the auth hooks
    (`useUser`/`protectedRoute`/`useSignIn` derive from `session.user`/`login`/`logout`).
  - **Cookie API** (from `@fluixi/auth/server`) — `parseCookies`, `serializeCookie`
    (secure-by-default: HttpOnly, Secure, SameSite=Lax, Path=/), `deleteCookie`, and
    request-scoped `getCookie`/`getCookies`.
  - **`fluixi generate auth`** — scaffolds `auth.config.ts`, `auth.client.ts`, `src/middleware.ts`,
    and the `/api/auth/[...all]` route in one command.

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.26
- @fluixi/dom@1.0.0-alpha.26
- @fluixi/core@1.0.0-alpha.26
- @fluixi/server@1.0.0-alpha.26
- @fluixi/start@0.1.0-alpha.16

## 1.0.0-alpha.25

### Minor Changes

- 712aedd: New `@fluixi/auth` package — server-first auth as **native bindings over Better Auth**
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

### Patch Changes

- Updated dependencies [042d86a]
  - @fluixi/dom@1.0.0-alpha.25
  - @fluixi/start@0.1.0-alpha.15
  - @fluixi/core@1.0.0-alpha.25
  - @fluixi/server@1.0.0-alpha.25
  - @fluixi/reactive@1.0.0-alpha.25
