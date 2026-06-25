---
"@fluixi/session": minor
"@fluixi/auth": minor
---

Standardized client auth: RBAC + session-expiry as framework primitives, so apps stop hand-rolling them.

`@fluixi/session` `createSession`:
- `access` — role → permission map OR a resolver `(user) => permissions` (derive straight from user fields, no matrix). Adds `roles()`, `permissions()`, `can(query)`. Generic over your permission shape; multi-role merge supported. Pluggable `match` matcher so `can()` takes a predicate by default, or a declarative query (`can('products:edit')`, an object, a CASL ability, or a user-field check) — `match` receives the permission set, the query, and the user.
- `unauthorized` — react to a server 401 (expired session). `createFetchGuard` wraps a fetch you pass to your SDK (no global mutation); `installGlobalFetchGuard` is the explicit opt-in for SDKs that only use the global fetch (e.g. Medusa). Default on-expiry is logout.
- `status()` state machine: idle | authenticating | authenticated | expired | error.

`@fluixi/auth/client` `createAuthHooks`:
- `usePermissions()`, `useCan()`, and `<Can perform>` / `<Protect>` components, driven by the session's access config.
- `protectedRoute` now gates on `roles[]` and a `permission` predicate, not just a single `role` string.

Note: client roles/permissions are a UI affordance only — the server enforces authz.
