# @fluixi/session

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
