# @fluixi/auth

## 1.0.0-alpha.32

### Patch Changes

- Updated dependencies [de45743]
- Updated dependencies [d7a38ba]
- Updated dependencies [d7a38ba]
- Updated dependencies [d7a38ba]
  - @fluixi/server@1.0.0-alpha.32
  - @fluixi/start@0.1.0-alpha.22
  - @fluixi/core@1.0.0-alpha.32
  - @fluixi/reactive@1.0.0-alpha.32
  - @fluixi/dom@1.0.0-alpha.32

## 1.0.0-alpha.31

### Patch Changes

- Updated dependencies [90ae430]
  - @fluixi/dom@1.0.0-alpha.31
  - @fluixi/core@1.0.0-alpha.31
  - @fluixi/server@1.0.0-alpha.31
  - @fluixi/start@0.1.0-alpha.21
  - @fluixi/reactive@1.0.0-alpha.31

## 1.0.0-alpha.30

### Patch Changes

- Updated dependencies [8cb37e5]
- Updated dependencies [2822fc8]
- Updated dependencies [da3aace]
  - @fluixi/core@1.0.0-alpha.30
  - @fluixi/start@0.1.0-alpha.20
  - @fluixi/reactive@1.0.0-alpha.30
  - @fluixi/dom@1.0.0-alpha.30
  - @fluixi/server@1.0.0-alpha.30

## 1.0.0-alpha.29

### Patch Changes

- Updated dependencies [efcf341]
  - @fluixi/start@0.1.0-alpha.19
  - @fluixi/reactive@1.0.0-alpha.29
  - @fluixi/dom@1.0.0-alpha.29
  - @fluixi/core@1.0.0-alpha.29
  - @fluixi/server@1.0.0-alpha.29

## 1.0.0-alpha.28

### Patch Changes

- Updated dependencies [663f0b4]
  - @fluixi/start@0.1.0-alpha.18
  - @fluixi/core@1.0.0-alpha.28
  - @fluixi/reactive@1.0.0-alpha.28
  - @fluixi/dom@1.0.0-alpha.28
  - @fluixi/server@1.0.0-alpha.28

## 1.0.0-alpha.27

### Minor Changes

- d0ca0c2: Standardized client auth: RBAC + session-expiry as framework primitives, so apps stop hand-rolling them.

  `@fluixi/session` `createSession`:

  - `access` — role → permission map OR a resolver `(user) => permissions` (derive straight from user fields, no matrix). Adds `roles()`, `permissions()`, `can(query)`. Generic over your permission shape; multi-role merge supported. Pluggable `match` matcher so `can()` takes a predicate by default, or a declarative query (`can('products:edit')`, an object, a CASL ability, or a user-field check) — `match` receives the permission set, the query, and the user.
  - `unauthorized` — react to a server 401 (expired session). `createFetchGuard` wraps a fetch you pass to your SDK (no global mutation); `installGlobalFetchGuard` is the explicit opt-in for SDKs that only use the global fetch (e.g. Medusa). Default on-expiry is logout.
  - `status()` state machine: idle | authenticating | authenticated | expired | error.

  `@fluixi/auth/client` `createAuthHooks`:

  - `usePermissions()`, `useCan()`, and `<Can perform>` / `<Protect>` components, driven by the session's access config.
  - `protectedRoute` now gates on `roles[]` and a `permission` predicate, not just a single `role` string.

  Note: client roles/permissions are a UI affordance only — the server enforces authz.

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.27
- @fluixi/dom@1.0.0-alpha.27
- @fluixi/core@1.0.0-alpha.27
- @fluixi/server@1.0.0-alpha.27
- @fluixi/start@0.1.0-alpha.17

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
