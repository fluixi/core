# @fluixi/session

## 1.0.0-alpha.90

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.90
- @fluixi/core@1.0.0-alpha.90

## 1.0.0-alpha.89

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.89
- @fluixi/core@1.0.0-alpha.89

## 1.0.0-alpha.88

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.88
- @fluixi/core@1.0.0-alpha.88

## 1.0.0-alpha.87

### Minor Changes

- 73bf352: `@fluixi/session/server` holds a session the browser cannot read: `createSessionCookie` seals a value into an httpOnly cookie with AES-GCM through Web Crypto, and reads it back. It is not an auth system and does not know what a user is, which is what lets an app with its own database seal a user id, and `@fluixi/oauth2` seal tokens, over the same piece.

  `@fluixi/oauth2/server` now uses it rather than carrying its own copy of the cookie and crypto handling.

### Patch Changes

- Updated dependencies [190493a]
  - @fluixi/core@1.0.0-alpha.87
  - @fluixi/reactive@1.0.0-alpha.87

## 1.0.0-alpha.86

### Patch Changes

- Updated dependencies [5b18653]
  - @fluixi/reactive@1.0.0-alpha.86
  - @fluixi/core@1.0.0-alpha.86

## 1.0.0-alpha.85

### Patch Changes

- Updated dependencies [39a87cd]
- Updated dependencies [ea498ef]
  - @fluixi/core@1.0.0-alpha.85
  - @fluixi/reactive@1.0.0-alpha.85

## 1.0.0-alpha.84

### Patch Changes

- 9565405: The published entry files now include a copyright banner, and `@fluixi/dom`, `@fluixi/jsx`, `@fluixi/template-parser` and `@fluixi/template-runtime` ship unminified, which their build configs had always asked for.
- Updated dependencies [9565405]
- Updated dependencies [aa17d01]
- Updated dependencies [76e286a]
- Updated dependencies [bef4cb6]
- Updated dependencies [c3d5026]
- Updated dependencies [c3d5026]
- Updated dependencies [4bd2bf1]
  - @fluixi/reactive@1.0.0-alpha.84
  - @fluixi/core@1.0.0-alpha.84

## 1.0.0-alpha.83

### Patch Changes

- Updated dependencies [f5b4031]
- Updated dependencies [e005759]
- Updated dependencies [ae9784f]
- Updated dependencies [f1d153c]
- Updated dependencies [f5b4031]
- Updated dependencies [5f6a72f]
  - @fluixi/reactive@1.0.0-alpha.83
  - @fluixi/core@1.0.0-alpha.83

## 1.0.0-alpha.82

### Patch Changes

- Updated dependencies [2d8ea95]
  - @fluixi/core@1.0.0-alpha.82
  - @fluixi/reactive@1.0.0-alpha.82

## 1.0.0-alpha.81

### Patch Changes

- @fluixi/core@1.0.0-alpha.81
- @fluixi/reactive@1.0.0-alpha.81

## 1.0.0-alpha.80

### Patch Changes

- 4a30116: The package name remains `@fluixi/core`, and the router subpath is now `@fluixi/core/router` — if you previously tried using `fluixi` or `@fluixi/core/router-next`, update your imports accordingly.
- Updated dependencies [fa19974]
- Updated dependencies [4a30116]
- Updated dependencies [fa19974]
  - @fluixi/core@1.0.0-alpha.80
  - @fluixi/reactive@1.0.0-alpha.80

## 1.0.0-alpha.79

### Minor Changes

- 21a13fd: The package is now named `fluixi` instead of `@fluixi/core`, with the same contents and subpaths; all other `@fluixi/*` packages retain their names.
  Replace `@fluixi/core` with `fluixi` in `package.json` and all import statements, and update subpaths like `@fluixi/core/server` to `fluixi/server`.

### Patch Changes

- Updated dependencies [21a13fd]
- Updated dependencies [21a13fd]
- Updated dependencies [21a13fd]
  - fluixi@1.0.0-alpha.79
  - @fluixi/reactive@1.0.0-alpha.79

## 1.0.0-alpha.78

### Patch Changes

- Updated dependencies [f121072]
  - @fluixi/core@1.0.0-alpha.78
  - @fluixi/reactive@1.0.0-alpha.78

## 1.0.0-alpha.77

### Patch Changes

- Updated dependencies [017317d]
  - @fluixi/reactive@1.0.0-alpha.77
  - @fluixi/core@1.0.0-alpha.77

## 1.0.0-alpha.76

### Patch Changes

- Updated dependencies [122e8f5]
- Updated dependencies [2fc0df5]
- Updated dependencies [3b7c1c7]
  - @fluixi/reactive@1.0.0-alpha.76
  - @fluixi/core@1.0.0-alpha.76

## 1.0.0-alpha.75

### Patch Changes

- Updated dependencies [087a8d3]
- Updated dependencies [7547cd4]
- Updated dependencies [c3affda]
  - @fluixi/core@1.0.0-alpha.75
  - @fluixi/reactive@1.0.0-alpha.75

## 1.0.0-alpha.74

### Patch Changes

- Updated dependencies [93421e8]
- Updated dependencies [a2cf48c]
- Updated dependencies [bb5aea1]
- Updated dependencies [21df035]
- Updated dependencies [3903be0]
  - @fluixi/core@1.0.0-alpha.74
  - @fluixi/reactive@1.0.0-alpha.74

## 1.0.0-alpha.73

### Patch Changes

- @fluixi/core@1.0.0-alpha.73
- @fluixi/reactive@1.0.0-alpha.73

## 1.0.0-alpha.72

### Patch Changes

- @fluixi/core@1.0.0-alpha.72
- @fluixi/reactive@1.0.0-alpha.72

## 1.0.0-alpha.71

### Patch Changes

- Updated dependencies [e46e9c0]
  - @fluixi/core@1.0.0-alpha.71
  - @fluixi/reactive@1.0.0-alpha.71

## 1.0.0-alpha.70

### Patch Changes

- Updated dependencies [c87db9a]
- Updated dependencies [4f4895a]
- Updated dependencies [84b1821]
  - @fluixi/core@1.0.0-alpha.70
  - @fluixi/reactive@1.0.0-alpha.70

## 1.0.0-alpha.69

### Patch Changes

- @fluixi/core@1.0.0-alpha.69
- @fluixi/reactive@1.0.0-alpha.69

## 1.0.0-alpha.68

### Patch Changes

- Updated dependencies [03acf33]
  - @fluixi/reactive@1.0.0-alpha.68
  - @fluixi/core@1.0.0-alpha.68

## 1.0.0-alpha.67

### Patch Changes

- Updated dependencies [09a321e]
  - @fluixi/core@1.0.0-alpha.67
  - @fluixi/reactive@1.0.0-alpha.67

## 1.0.0-alpha.66

### Patch Changes

- Updated dependencies [8a53f68]
  - @fluixi/core@1.0.0-alpha.66
  - @fluixi/reactive@1.0.0-alpha.66

## 1.0.0-alpha.65

### Patch Changes

- @fluixi/core@1.0.0-alpha.65
- @fluixi/reactive@1.0.0-alpha.65

## 1.0.0-alpha.64

### Patch Changes

- Updated dependencies [d075630]
  - @fluixi/reactive@1.0.0-alpha.64
  - @fluixi/core@1.0.0-alpha.64

## 1.0.0-alpha.63

### Patch Changes

- Updated dependencies [96c211e]
  - @fluixi/core@1.0.0-alpha.63
  - @fluixi/reactive@1.0.0-alpha.63

## 1.0.0-alpha.62

### Patch Changes

- @fluixi/core@1.0.0-alpha.62
- @fluixi/reactive@1.0.0-alpha.62

## 1.0.0-alpha.61

### Patch Changes

- @fluixi/core@1.0.0-alpha.61
- @fluixi/reactive@1.0.0-alpha.61

## 1.0.0-alpha.60

### Patch Changes

- @fluixi/core@1.0.0-alpha.60
- @fluixi/reactive@1.0.0-alpha.60

## 1.0.0-alpha.59

### Patch Changes

- @fluixi/core@1.0.0-alpha.59
- @fluixi/reactive@1.0.0-alpha.59

## 1.0.0-alpha.58

### Patch Changes

- Updated dependencies [3fd0660]
  - @fluixi/core@1.0.0-alpha.58
  - @fluixi/reactive@1.0.0-alpha.58

## 1.0.0-alpha.57

### Patch Changes

- Updated dependencies [5d92daa]
  - @fluixi/reactive@1.0.0-alpha.57
  - @fluixi/core@1.0.0-alpha.57

## 1.0.0-alpha.56

### Patch Changes

- 59ddb69: Drop the unused `tslib` dependency. `importHelpers` is on in tsconfig, but these packages ship esbuild-bundled output that inlines the TS helpers — nothing in the published code imports `tslib`, so it was dead weight in `dependencies`.
- Updated dependencies [59ddb69]
- Updated dependencies [59ddb69]
- Updated dependencies [e183e9a]
  - @fluixi/core@1.0.0-alpha.56
  - @fluixi/reactive@1.0.0-alpha.56

## 1.0.0-alpha.55

### Patch Changes

- Updated dependencies [5cfb7a6]
- Updated dependencies [daa7af2]
  - @fluixi/reactive@1.0.0-alpha.55
  - @fluixi/core@1.0.0-alpha.55

## 1.0.0-alpha.54

### Patch Changes

- e005c4c: Add the `license` field (MIT) and bundle a `LICENSE` file in every package, so npm shows the license and ships it in the tarball.
- Updated dependencies [e005c4c]
  - @fluixi/core@1.0.0-alpha.54
  - @fluixi/reactive@1.0.0-alpha.54

## 1.0.0-alpha.53

### Patch Changes

- Updated dependencies [370feff]
- Updated dependencies [9b06063]
  - @fluixi/core@1.0.0-alpha.53
  - @fluixi/reactive@1.0.0-alpha.53

## 1.0.0-alpha.52

### Patch Changes

- @fluixi/core@1.0.0-alpha.52
- @fluixi/reactive@1.0.0-alpha.52

## 1.0.0-alpha.51

### Patch Changes

- @fluixi/core@1.0.0-alpha.51
- @fluixi/reactive@1.0.0-alpha.51

## 1.0.0-alpha.50

### Patch Changes

- Updated dependencies [f93989f]
  - @fluixi/core@1.0.0-alpha.50
  - @fluixi/reactive@1.0.0-alpha.50

## 1.0.0-alpha.49

### Patch Changes

- @fluixi/core@1.0.0-alpha.49
- @fluixi/reactive@1.0.0-alpha.49

## 1.0.0-alpha.48

### Patch Changes

- @fluixi/core@1.0.0-alpha.48
- @fluixi/reactive@1.0.0-alpha.48

## 1.0.0-alpha.47

### Patch Changes

- @fluixi/core@1.0.0-alpha.47
- @fluixi/reactive@1.0.0-alpha.47

## 1.0.0-alpha.46

### Patch Changes

- @fluixi/core@1.0.0-alpha.46
- @fluixi/reactive@1.0.0-alpha.46

## 1.0.0-alpha.45

### Patch Changes

- @fluixi/core@1.0.0-alpha.45
- @fluixi/reactive@1.0.0-alpha.45

## 1.0.0-alpha.44

### Patch Changes

- @fluixi/core@1.0.0-alpha.44
- @fluixi/reactive@1.0.0-alpha.44

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
