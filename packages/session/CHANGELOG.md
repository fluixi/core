# @fluixi/session

## 1.0.0-alpha.43

### Patch Changes

- @fluixi/core@1.0.0-alpha.43
- @fluixi/reactive@1.0.0-alpha.43

## 1.0.0-alpha.42

### Patch Changes

- 3f0e665: Fix control flow `Show` types to support JSX.Element because before it was required to use `<Show>{()=><Component />}</Show>` the fix now directly allow `<Show><Component /></Show>`
- Updated dependencies [3f0e665]
  - @fluixi/reactive@1.0.0-alpha.42
  - @fluixi/core@1.0.0-alpha.42

## 1.0.0-alpha.41

### Patch Changes

- Updated dependencies [82606b9]
  - @fluixi/reactive@1.0.0-alpha.41
  - @fluixi/core@1.0.0-alpha.41

## 1.0.0-alpha.40

### Patch Changes

- @fluixi/core@1.0.0-alpha.40
- @fluixi/reactive@1.0.0-alpha.40

## 1.0.0-alpha.39

### Patch Changes

- @fluixi/core@1.0.0-alpha.39
- @fluixi/reactive@1.0.0-alpha.39

## 1.0.0-alpha.38

### Patch Changes

- @fluixi/core@1.0.0-alpha.38
- @fluixi/reactive@1.0.0-alpha.38

## 1.0.0-alpha.37

### Patch Changes

- Updated dependencies [fd5a896]
- Updated dependencies [63976b7]
  - @fluixi/core@1.0.0-alpha.37
  - @fluixi/reactive@1.0.0-alpha.37

## 1.0.0-alpha.36

### Patch Changes

- @fluixi/core@1.0.0-alpha.36
- @fluixi/reactive@1.0.0-alpha.36

## 1.0.0-alpha.35

### Patch Changes

- Updated dependencies [f3122c2]
- Updated dependencies [bdcc4a5]
  - @fluixi/core@1.0.0-alpha.35
  - @fluixi/reactive@1.0.0-alpha.35

## 1.0.0-alpha.34

### Patch Changes

- Updated dependencies [6f8a9d4]
- Updated dependencies [0c2ecb7]
  - @fluixi/core@1.0.0-alpha.34
  - @fluixi/reactive@1.0.0-alpha.34

## 1.0.0-alpha.33

### Patch Changes

- @fluixi/core@1.0.0-alpha.33
- @fluixi/reactive@1.0.0-alpha.33

## 1.0.0-alpha.32

### Patch Changes

- @fluixi/core@1.0.0-alpha.32
- @fluixi/reactive@1.0.0-alpha.32

## 1.0.0-alpha.31

### Patch Changes

- Updated dependencies [90ae430]
  - @fluixi/core@1.0.0-alpha.31
  - @fluixi/reactive@1.0.0-alpha.31

## 1.0.0-alpha.30

### Patch Changes

- Updated dependencies [8cb37e5]
- Updated dependencies [da3aace]
  - @fluixi/core@1.0.0-alpha.30
  - @fluixi/reactive@1.0.0-alpha.30

## 1.0.0-alpha.29

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.29
- @fluixi/core@1.0.0-alpha.29

## 1.0.0-alpha.28

### Patch Changes

- @fluixi/core@1.0.0-alpha.28
- @fluixi/reactive@1.0.0-alpha.28

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
- @fluixi/core@1.0.0-alpha.27

## 1.0.0-alpha.26

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.26
- @fluixi/core@1.0.0-alpha.26

## 1.0.0-alpha.25

### Patch Changes

- @fluixi/core@1.0.0-alpha.25
- @fluixi/reactive@1.0.0-alpha.25

## 1.0.0-alpha.24

### Minor Changes

- aaad625: Add `createTheme` (@fluixi/core) and the new `@fluixi/session` package (`createSession`).

  **`createTheme`** — the theme workflow as a primitive so apps stop rewriting it:
  detect (stored value or `prefers-color-scheme`) → persist → apply a `data-*` attribute
  → `toggle()` across an arbitrary theme list. Optional async `load` per theme drives
  `isLoading()`, with `onChange`/`onLoading`/`onLoaded` hooks, and `headScript()` returns
  an inline `<head>` script that sets the attribute before first paint (no theme flash on
  SSR). Built on the universal `storage`/`env`, so it's SSR-safe.

  **`@fluixi/session` — `createSession`** — the client-side session lifecycle. You provide
  a small backend adapter (`login`, `fetchUser`, optional `logout`/`register`/`refresh`/`getExpiry`);
  the framework owns token/user signals, `isAuthenticated`, `isLoading`/`error`, SSR-safe
  persistence, the hydrate-on-load flow, and automatic token refresh before expiry
  (client-only). Replaces the ~100 lines of hand-rolled session glue every app repeats.
  (The full server-first auth engine — OAuth/MFA/orgs/RBAC — will be the separate
  `@fluixi/auth` package.)

### Patch Changes

- Updated dependencies [aaad625]
  - @fluixi/core@1.0.0-alpha.24
  - @fluixi/reactive@1.0.0-alpha.24
