# @fluixi/auth

## 1.0.0-alpha.99

### Patch Changes

- 3ed276b: Fluixi peer dependencies are published as ^ ranges (^1.0.0-alpha.N) instead of exact versions.
  - @fluixi/utils@1.0.0-alpha.99

## 1.0.0-alpha.98

### Patch Changes

- Updated dependencies [86e38e1]
  - @fluixi/dom@1.0.0-alpha.98
  - @fluixi/server@1.0.0-alpha.98
  - @fluixi/start@0.1.0-alpha.88
  - @fluixi/core@1.0.0-alpha.98
  - @fluixi/utils@1.0.0-alpha.98
  - @fluixi/reactive@1.0.0-alpha.98

## 1.0.0-alpha.97

### Patch Changes

- @fluixi/utils@1.0.0-alpha.97
- @fluixi/reactive@1.0.0-alpha.97
- @fluixi/dom@1.0.0-alpha.97
- @fluixi/core@1.0.0-alpha.97
- @fluixi/server@1.0.0-alpha.97
- @fluixi/start@0.1.0-alpha.87

## 1.0.0-alpha.96

### Patch Changes

- bc7e5f1: The `better-auth` peer range requires version 1.6.22 or later: earlier versions allow account takeover through magic-link sign-in.
- Updated dependencies [a4e5272]
  - @fluixi/core@1.0.0-alpha.96
  - @fluixi/start@0.1.0-alpha.86
  - @fluixi/utils@1.0.0-alpha.96
  - @fluixi/reactive@1.0.0-alpha.96
  - @fluixi/dom@1.0.0-alpha.96
  - @fluixi/server@1.0.0-alpha.96

## 1.0.0-alpha.95

### Patch Changes

- Updated dependencies [f2272f6]
- Updated dependencies [d1eea79]
- Updated dependencies [d9fb1c4]
- Updated dependencies [e4cf090]
- Updated dependencies [f4528b2]
- Updated dependencies [06a5af9]
  - @fluixi/dom@1.0.0-alpha.95
  - @fluixi/core@1.0.0-alpha.95
  - @fluixi/start@0.1.0-alpha.85
  - @fluixi/server@1.0.0-alpha.95
  - @fluixi/utils@1.0.0-alpha.95
  - @fluixi/reactive@1.0.0-alpha.95

## 1.0.0-alpha.94

### Patch Changes

- Updated dependencies [8362b9a]
- Updated dependencies [4cb16a6]
- Updated dependencies [82d75a7]
- Updated dependencies [20ef9f9]
  - @fluixi/dom@1.0.0-alpha.94
  - @fluixi/core@1.0.0-alpha.94
  - @fluixi/start@0.1.0-alpha.84
  - @fluixi/server@1.0.0-alpha.94
  - @fluixi/utils@1.0.0-alpha.94
  - @fluixi/reactive@1.0.0-alpha.94

## 1.0.0-alpha.93

### Minor Changes

- a8610c2: The `signedIn()` and `member({ roles, permissions })` guards are now available in `@fluixi/auth/server` for protecting `@fluixi/api` routes, with `member()` providing `auth.member.organizationId` and returning 403 errors `no_active_organization` or `not_a_member`, and `AuthError` now includes an optional `code`.
- 5dcdf9f: The cookie codec now resides at `@fluixi/utils/cookie` and `@fluixi/auth` re-exports it, so imports from `@fluixi/auth` continue to work. Update any code that writes cookies to avoid invalid names, paths, or domains containing `;` or whitespace (which now throw a `TypeError`). `SameSite=None` now always adds Secure, and `parseCookies` keeps a malformed escape as raw text instead of throwing.
- eabcfe0: `effect` and `createEffect` now accept an optional `{ name }` third argument, which appears in the devtools graph like signals and memos.
- 73665aa: New `remoteAuth({ url, basePath })` in `@fluixi/auth/server`, for `defineAuth` when Better Auth runs in another service, enabling authMiddleware, requireUser and client hooks to work in the web app with the session read from the API using the visitor cookie. Guards such as `member()` stay in the API.

### Patch Changes

- Updated dependencies [2fb0e05]
- Updated dependencies [722d8c8]
- Updated dependencies [46bf253]
- Updated dependencies [b324fbc]
- Updated dependencies [407217b]
- Updated dependencies [5dcdf9f]
- Updated dependencies [df021bf]
- Updated dependencies [8940d60]
- Updated dependencies [cc2a6f8]
- Updated dependencies [cced6d2]
- Updated dependencies [9136d35]
- Updated dependencies [de2135e]
- Updated dependencies [eab30a6]
- Updated dependencies [fda2262]
- Updated dependencies [e77734a]
- Updated dependencies [f2f2447]
- Updated dependencies [55a57dd]
- Updated dependencies [557896f]
- Updated dependencies [66502b7]
- Updated dependencies [bf42597]
- Updated dependencies [bbe4b8a]
- Updated dependencies [eabcfe0]
- Updated dependencies [4ac7bba]
- Updated dependencies [fcc75e2]
- Updated dependencies [dd39ca3]
- Updated dependencies [4bd61db]
- Updated dependencies [23c5f2b]
- Updated dependencies [9a05eb9]
- Updated dependencies [e325850]
- Updated dependencies [167f094]
- Updated dependencies [586c53a]
- Updated dependencies [b992f7e]
- Updated dependencies [9ef2827]
- Updated dependencies [2f6a83a]
- Updated dependencies [fa72d27]
- Updated dependencies [daae54a]
- Updated dependencies [dde7a4e]
- Updated dependencies [b3ea476]
- Updated dependencies [fb67321]
- Updated dependencies [bf0907f]
- Updated dependencies [de25d02]
- Updated dependencies [d1268d1]
- Updated dependencies [ae0e561]
- Updated dependencies [b0ea788]
- Updated dependencies [090e5c5]
- Updated dependencies [3026d67]
- Updated dependencies [705ff3a]
- Updated dependencies [cd49ddc]
- Updated dependencies [948b2be]
- Updated dependencies [92fe73b]
- Updated dependencies [9295123]
- Updated dependencies [6764f45]
- Updated dependencies [b2e1ff3]
- Updated dependencies [ceb7864]
- Updated dependencies [ffc1b08]
  - @fluixi/start@0.1.0-alpha.83
  - @fluixi/reactive@1.0.0-alpha.93
  - @fluixi/dom@1.0.0-alpha.93
  - @fluixi/utils@1.0.0-alpha.93
  - @fluixi/core@1.0.0-alpha.93
  - @fluixi/server@1.0.0-alpha.93

## 1.0.0-alpha.92

### Patch Changes

- Updated dependencies [7864fb6]
- Updated dependencies [9eb3e98]
- Updated dependencies [7a516d3]
- Updated dependencies [82c72c0]
  - @fluixi/start@0.1.0-alpha.82
  - @fluixi/dom@1.0.0-alpha.92
  - @fluixi/core@1.0.0-alpha.92
  - @fluixi/server@1.0.0-alpha.92
  - @fluixi/reactive@1.0.0-alpha.92

## 1.0.0-alpha.91

### Patch Changes

- Updated dependencies [6e98608]
  - @fluixi/start@0.1.0-alpha.81
  - @fluixi/reactive@1.0.0-alpha.91
  - @fluixi/dom@1.0.0-alpha.91
  - @fluixi/core@1.0.0-alpha.91
  - @fluixi/server@1.0.0-alpha.91

## 1.0.0-alpha.90

### Patch Changes

- Updated dependencies [9d334dc]
  - @fluixi/start@0.1.0-alpha.80
  - @fluixi/reactive@1.0.0-alpha.90
  - @fluixi/dom@1.0.0-alpha.90
  - @fluixi/core@1.0.0-alpha.90
  - @fluixi/server@1.0.0-alpha.90

## 1.0.0-alpha.89

### Patch Changes

- Updated dependencies [4ada5ee]
  - @fluixi/start@0.1.0-alpha.79
  - @fluixi/reactive@1.0.0-alpha.89
  - @fluixi/dom@1.0.0-alpha.89
  - @fluixi/core@1.0.0-alpha.89
  - @fluixi/server@1.0.0-alpha.89

## 1.0.0-alpha.88

### Patch Changes

- Updated dependencies [d5ebde7]
  - @fluixi/start@0.1.0-alpha.78
  - @fluixi/reactive@1.0.0-alpha.88
  - @fluixi/dom@1.0.0-alpha.88
  - @fluixi/core@1.0.0-alpha.88
  - @fluixi/server@1.0.0-alpha.88

## 1.0.0-alpha.87

### Patch Changes

- 567484f: `Can` and `Protect` can be used in a template. They declared `children: unknown` and returned `() => unknown`, which JSX refuses: a component that cannot go in a template is not one. They now take and return `ComponentChild`, the same shape the control flow components use, so both JSX and `html` accept them.

  With no `fallback`, a denied guard yields `null` rather than `undefined`, which renders as nothing in one path and as a word in the other.

- Updated dependencies [54b8466]
- Updated dependencies [190493a]
- Updated dependencies [807fb8a]
- Updated dependencies [655c5d2]
- Updated dependencies [79bd79f]
- Updated dependencies [734d7e0]
- Updated dependencies [9dc9e3c]
- Updated dependencies [7bc3e64]
- Updated dependencies [5a7e92a]
- Updated dependencies [f388d49]
- Updated dependencies [337a424]
- Updated dependencies [18d3696]
- Updated dependencies [a6cac6f]
- Updated dependencies [6f26bee]
- Updated dependencies [52388aa]
- Updated dependencies [29a639b]
- Updated dependencies [29a639b]
- Updated dependencies [d7d4089]
- Updated dependencies [d6c8562]
  - @fluixi/start@0.1.0-alpha.77
  - @fluixi/core@1.0.0-alpha.87
  - @fluixi/dom@1.0.0-alpha.87
  - @fluixi/server@1.0.0-alpha.87
  - @fluixi/reactive@1.0.0-alpha.87

## 1.0.0-alpha.86

### Patch Changes

- Updated dependencies [5b18653]
- Updated dependencies [128f233]
  - @fluixi/reactive@1.0.0-alpha.86
  - @fluixi/start@0.1.0-alpha.76
  - @fluixi/core@1.0.0-alpha.86
  - @fluixi/dom@1.0.0-alpha.86
  - @fluixi/server@1.0.0-alpha.86

## 1.0.0-alpha.85

### Patch Changes

- b902491: `protectedRoute` now accepts a `navigator` option, e.g., `protectedRoute(Admin, { role: 'admin', navigator: { handler: useNavigate } })`, and redirects via the app router instead of assigning `window.location`.
- Updated dependencies [39a87cd]
- Updated dependencies [a2f0eb8]
- Updated dependencies [5062033]
- Updated dependencies [ea498ef]
  - @fluixi/core@1.0.0-alpha.85
  - @fluixi/start@0.1.0-alpha.75
  - @fluixi/reactive@1.0.0-alpha.85
  - @fluixi/server@1.0.0-alpha.85
  - @fluixi/dom@1.0.0-alpha.85

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
  - @fluixi/dom@1.0.0-alpha.84
  - @fluixi/reactive@1.0.0-alpha.84
  - @fluixi/core@1.0.0-alpha.84
  - @fluixi/server@1.0.0-alpha.84
  - @fluixi/start@0.1.0-alpha.74

## 1.0.0-alpha.83

### Patch Changes

- Updated dependencies [f5b4031]
- Updated dependencies [e005759]
- Updated dependencies [e005759]
- Updated dependencies [f1d153c]
- Updated dependencies [ae9784f]
- Updated dependencies [f1d153c]
- Updated dependencies [f5b4031]
- Updated dependencies [5f6a72f]
- Updated dependencies [f1d153c]
  - @fluixi/reactive@1.0.0-alpha.83
  - @fluixi/core@1.0.0-alpha.83
  - @fluixi/dom@1.0.0-alpha.83
  - @fluixi/start@0.1.0-alpha.73
  - @fluixi/server@1.0.0-alpha.83

## 1.0.0-alpha.82

### Patch Changes

- Updated dependencies [2d8ea95]
  - @fluixi/core@1.0.0-alpha.82
  - @fluixi/start@0.1.0-alpha.72
  - @fluixi/reactive@1.0.0-alpha.82
  - @fluixi/dom@1.0.0-alpha.82
  - @fluixi/server@1.0.0-alpha.82

## 1.0.0-alpha.81

### Patch Changes

- @fluixi/core@1.0.0-alpha.81
- @fluixi/start@0.1.0-alpha.71
- @fluixi/reactive@1.0.0-alpha.81
- @fluixi/dom@1.0.0-alpha.81
- @fluixi/server@1.0.0-alpha.81

## 1.0.0-alpha.80

### Patch Changes

- 4a30116: The package name remains `@fluixi/core`, and the router subpath is now `@fluixi/core/router` — if you previously tried using `fluixi` or `@fluixi/core/router-next`, update your imports accordingly.
- Updated dependencies [fa19974]
- Updated dependencies [4a30116]
- Updated dependencies [fa19974]
  - @fluixi/dom@1.0.0-alpha.80
  - @fluixi/core@1.0.0-alpha.80
  - @fluixi/start@0.1.0-alpha.70
  - @fluixi/reactive@1.0.0-alpha.80
  - @fluixi/server@1.0.0-alpha.80

## 1.0.0-alpha.79

### Minor Changes

- 21a13fd: The package is now named `fluixi` instead of `@fluixi/core`, with the same contents and subpaths; all other `@fluixi/*` packages retain their names.
  Replace `@fluixi/core` with `fluixi` in `package.json` and all import statements, and update subpaths like `@fluixi/core/server` to `fluixi/server`.

### Patch Changes

- Updated dependencies [21a13fd]
- Updated dependencies [21a13fd]
- Updated dependencies [21a13fd]
  - fluixi@1.0.0-alpha.79
  - @fluixi/start@0.1.0-alpha.69
  - @fluixi/reactive@1.0.0-alpha.79
  - @fluixi/dom@1.0.0-alpha.79
  - @fluixi/server@1.0.0-alpha.79

## 1.0.0-alpha.78

### Patch Changes

- Updated dependencies [f121072]
  - @fluixi/core@1.0.0-alpha.78
  - @fluixi/reactive@1.0.0-alpha.78
  - @fluixi/start@0.1.0-alpha.68
  - @fluixi/dom@1.0.0-alpha.78
  - @fluixi/server@1.0.0-alpha.78

## 1.0.0-alpha.77

### Patch Changes

- Updated dependencies [017317d]
- Updated dependencies [daa47d7]
- Updated dependencies [e837607]
  - @fluixi/dom@1.0.0-alpha.77
  - @fluixi/reactive@1.0.0-alpha.77
  - @fluixi/start@0.1.0-alpha.67
  - @fluixi/core@1.0.0-alpha.77
  - @fluixi/server@1.0.0-alpha.77

## 1.0.0-alpha.76

### Patch Changes

- Updated dependencies [8f77029]
- Updated dependencies [122e8f5]
- Updated dependencies [2fc0df5]
- Updated dependencies [3b7c1c7]
  - @fluixi/start@0.1.0-alpha.66
  - @fluixi/reactive@1.0.0-alpha.76
  - @fluixi/core@1.0.0-alpha.76
  - @fluixi/dom@1.0.0-alpha.76
  - @fluixi/server@1.0.0-alpha.76

## 1.0.0-alpha.75

### Patch Changes

- Updated dependencies [087a8d3]
- Updated dependencies [7547cd4]
- Updated dependencies [720c617]
- Updated dependencies [c3affda]
  - @fluixi/core@1.0.0-alpha.75
  - @fluixi/start@0.1.0-alpha.65
  - @fluixi/reactive@1.0.0-alpha.75
  - @fluixi/dom@1.0.0-alpha.75
  - @fluixi/server@1.0.0-alpha.75

## 1.0.0-alpha.74

### Patch Changes

- Updated dependencies [8838294]
- Updated dependencies [93421e8]
- Updated dependencies [6a41eb8]
- Updated dependencies [93421e8]
- Updated dependencies [a2cf48c]
- Updated dependencies [8b37811]
- Updated dependencies [6fba3ed]
- Updated dependencies [bb5aea1]
- Updated dependencies [21df035]
- Updated dependencies [08635bd]
- Updated dependencies [10b4b6f]
- Updated dependencies [3903be0]
- Updated dependencies [059b38b]
- Updated dependencies [f2cf2bb]
  - @fluixi/start@0.1.0-alpha.64
  - @fluixi/core@1.0.0-alpha.74
  - @fluixi/dom@1.0.0-alpha.74
  - @fluixi/reactive@1.0.0-alpha.74
  - @fluixi/server@1.0.0-alpha.74

## 1.0.0-alpha.73

### Patch Changes

- Updated dependencies [7e98158]
  - @fluixi/dom@1.0.0-alpha.73
  - @fluixi/core@1.0.0-alpha.73
  - @fluixi/start@0.1.0-alpha.63
  - @fluixi/server@1.0.0-alpha.73
  - @fluixi/reactive@1.0.0-alpha.73

## 1.0.0-alpha.72

### Patch Changes

- @fluixi/core@1.0.0-alpha.72
- @fluixi/start@0.1.0-alpha.62
- @fluixi/reactive@1.0.0-alpha.72
- @fluixi/dom@1.0.0-alpha.72
- @fluixi/server@1.0.0-alpha.72

## 1.0.0-alpha.71

### Patch Changes

- Updated dependencies [e46e9c0]
  - @fluixi/dom@1.0.0-alpha.71
  - @fluixi/core@1.0.0-alpha.71
  - @fluixi/start@0.1.0-alpha.61
  - @fluixi/server@1.0.0-alpha.71
  - @fluixi/reactive@1.0.0-alpha.71

## 1.0.0-alpha.70

### Patch Changes

- Updated dependencies [c87db9a]
- Updated dependencies [4f4895a]
- Updated dependencies [2a317dc]
- Updated dependencies [84b1821]
  - @fluixi/core@1.0.0-alpha.70
  - @fluixi/dom@1.0.0-alpha.70
  - @fluixi/reactive@1.0.0-alpha.70
  - @fluixi/start@0.1.0-alpha.60
  - @fluixi/server@1.0.0-alpha.70

## 1.0.0-alpha.69

### Patch Changes

- @fluixi/core@1.0.0-alpha.69
- @fluixi/start@0.1.0-alpha.59
- @fluixi/reactive@1.0.0-alpha.69
- @fluixi/dom@1.0.0-alpha.69
- @fluixi/server@1.0.0-alpha.69

## 1.0.0-alpha.68

### Patch Changes

- Updated dependencies [03acf33]
- Updated dependencies [7f25a39]
  - @fluixi/dom@1.0.0-alpha.68
  - @fluixi/reactive@1.0.0-alpha.68
  - @fluixi/core@1.0.0-alpha.68
  - @fluixi/server@1.0.0-alpha.68
  - @fluixi/start@0.1.0-alpha.58

## 1.0.0-alpha.67

### Patch Changes

- Updated dependencies [09a321e]
  - @fluixi/dom@1.0.0-alpha.67
  - @fluixi/core@1.0.0-alpha.67
  - @fluixi/server@1.0.0-alpha.67
  - @fluixi/start@0.1.0-alpha.57
  - @fluixi/reactive@1.0.0-alpha.67

## 1.0.0-alpha.66

### Patch Changes

- Updated dependencies [8a53f68]
  - @fluixi/dom@1.0.0-alpha.66
  - @fluixi/core@1.0.0-alpha.66
  - @fluixi/server@1.0.0-alpha.66
  - @fluixi/start@0.1.0-alpha.56
  - @fluixi/reactive@1.0.0-alpha.66

## 1.0.0-alpha.65

### Patch Changes

- Updated dependencies [cdc5af9]
- Updated dependencies [0db63d9]
  - @fluixi/dom@1.0.0-alpha.65
  - @fluixi/core@1.0.0-alpha.65
  - @fluixi/server@1.0.0-alpha.65
  - @fluixi/start@0.1.0-alpha.55
  - @fluixi/reactive@1.0.0-alpha.65

## 1.0.0-alpha.64

### Patch Changes

- Updated dependencies [d075630]
- Updated dependencies [fb298c7]
- Updated dependencies [13d488e]
  - @fluixi/reactive@1.0.0-alpha.64
  - @fluixi/core@1.0.0-alpha.64
  - @fluixi/dom@1.0.0-alpha.64
  - @fluixi/server@1.0.0-alpha.64
  - @fluixi/start@0.1.0-alpha.54

## 1.0.0-alpha.63

### Patch Changes

- Updated dependencies [9ac3eaa]
- Updated dependencies [310b9d1]
- Updated dependencies [96c211e]
  - @fluixi/dom@1.0.0-alpha.63
  - @fluixi/core@1.0.0-alpha.63
  - @fluixi/server@1.0.0-alpha.63
  - @fluixi/start@0.1.0-alpha.53
  - @fluixi/reactive@1.0.0-alpha.63

## 1.0.0-alpha.62

### Patch Changes

- Updated dependencies [2f99854]
  - @fluixi/dom@1.0.0-alpha.62
  - @fluixi/core@1.0.0-alpha.62
  - @fluixi/server@1.0.0-alpha.62
  - @fluixi/start@0.1.0-alpha.52
  - @fluixi/reactive@1.0.0-alpha.62

## 1.0.0-alpha.61

### Patch Changes

- Updated dependencies [ee9da1c]
  - @fluixi/dom@1.0.0-alpha.61
  - @fluixi/core@1.0.0-alpha.61
  - @fluixi/server@1.0.0-alpha.61
  - @fluixi/start@0.1.0-alpha.51
  - @fluixi/reactive@1.0.0-alpha.61

## 1.0.0-alpha.60

### Patch Changes

- @fluixi/core@1.0.0-alpha.60
- @fluixi/start@0.1.0-alpha.50
- @fluixi/reactive@1.0.0-alpha.60
- @fluixi/dom@1.0.0-alpha.60
- @fluixi/server@1.0.0-alpha.60

## 1.0.0-alpha.59

### Patch Changes

- Updated dependencies [725322e]
  - @fluixi/start@0.1.0-alpha.49
  - @fluixi/core@1.0.0-alpha.59
  - @fluixi/reactive@1.0.0-alpha.59
  - @fluixi/dom@1.0.0-alpha.59
  - @fluixi/server@1.0.0-alpha.59

## 1.0.0-alpha.58

### Patch Changes

- Updated dependencies [3fd0660]
  - @fluixi/core@1.0.0-alpha.58
  - @fluixi/start@0.1.0-alpha.48
  - @fluixi/reactive@1.0.0-alpha.58
  - @fluixi/dom@1.0.0-alpha.58
  - @fluixi/server@1.0.0-alpha.58

## 1.0.0-alpha.57

### Patch Changes

- Updated dependencies [5d92daa]
  - @fluixi/reactive@1.0.0-alpha.57
  - @fluixi/core@1.0.0-alpha.57
  - @fluixi/dom@1.0.0-alpha.57
  - @fluixi/server@1.0.0-alpha.57
  - @fluixi/start@0.1.0-alpha.47

## 1.0.0-alpha.56

### Patch Changes

- 59ddb69: Drop the unused `tslib` dependency. `importHelpers` is on in tsconfig, but these packages ship esbuild-bundled output that inlines the TS helpers — nothing in the published code imports `tslib`, so it was dead weight in `dependencies`.
- Updated dependencies [59ddb69]
- Updated dependencies [59ddb69]
- Updated dependencies [8b7f398]
- Updated dependencies [e183e9a]
- Updated dependencies [59ddb69]
- Updated dependencies [d9a5cc4]
  - @fluixi/core@1.0.0-alpha.56
  - @fluixi/dom@1.0.0-alpha.56
  - @fluixi/reactive@1.0.0-alpha.56
  - @fluixi/start@0.1.0-alpha.46
  - @fluixi/server@1.0.0-alpha.56

## 1.0.0-alpha.55

### Patch Changes

- Updated dependencies [5cfb7a6]
- Updated dependencies [daa7af2]
  - @fluixi/dom@1.0.0-alpha.55
  - @fluixi/reactive@1.0.0-alpha.55
  - @fluixi/server@1.0.0-alpha.55
  - @fluixi/start@0.1.0-alpha.45
  - @fluixi/core@1.0.0-alpha.55

## 1.0.0-alpha.54

### Patch Changes

- e005c4c: Add the `license` field (MIT) and bundle a `LICENSE` file in every package, so npm shows the license and ships it in the tarball.
- Updated dependencies [e005c4c]
  - @fluixi/core@1.0.0-alpha.54
  - @fluixi/dom@1.0.0-alpha.54
  - @fluixi/reactive@1.0.0-alpha.54
  - @fluixi/server@1.0.0-alpha.54
  - @fluixi/start@0.1.0-alpha.44

## 1.0.0-alpha.53

### Patch Changes

- Updated dependencies [370feff]
- Updated dependencies [9b06063]
  - @fluixi/core@1.0.0-alpha.53
  - @fluixi/reactive@1.0.0-alpha.53
  - @fluixi/start@0.1.0-alpha.43
  - @fluixi/dom@1.0.0-alpha.53
  - @fluixi/server@1.0.0-alpha.53

## 1.0.0-alpha.52

### Patch Changes

- Updated dependencies [0eecc3c]
  - @fluixi/dom@1.0.0-alpha.52
  - @fluixi/core@1.0.0-alpha.52
  - @fluixi/server@1.0.0-alpha.52
  - @fluixi/start@0.1.0-alpha.42
  - @fluixi/reactive@1.0.0-alpha.52

## 1.0.0-alpha.51

### Patch Changes

- Updated dependencies [8d66341]
  - @fluixi/dom@1.0.0-alpha.51
  - @fluixi/core@1.0.0-alpha.51
  - @fluixi/server@1.0.0-alpha.51
  - @fluixi/start@0.1.0-alpha.41
  - @fluixi/reactive@1.0.0-alpha.51

## 1.0.0-alpha.50

### Patch Changes

- Updated dependencies [f93989f]
  - @fluixi/start@0.1.0-alpha.40
  - @fluixi/core@1.0.0-alpha.50
  - @fluixi/server@1.0.0-alpha.50
  - @fluixi/reactive@1.0.0-alpha.50
  - @fluixi/dom@1.0.0-alpha.50

## 1.0.0-alpha.49

### Patch Changes

- @fluixi/core@1.0.0-alpha.49
- @fluixi/server@1.0.0-alpha.49
- @fluixi/start@0.1.0-alpha.39
- @fluixi/reactive@1.0.0-alpha.49
- @fluixi/dom@1.0.0-alpha.49

## 1.0.0-alpha.48

### Patch Changes

- Updated dependencies [7da8345]
  - @fluixi/dom@1.0.0-alpha.48
  - @fluixi/core@1.0.0-alpha.48
  - @fluixi/server@1.0.0-alpha.48
  - @fluixi/start@0.1.0-alpha.38
  - @fluixi/reactive@1.0.0-alpha.48

## 1.0.0-alpha.47

### Patch Changes

- @fluixi/core@1.0.0-alpha.47
- @fluixi/start@0.1.0-alpha.37
- @fluixi/reactive@1.0.0-alpha.47
- @fluixi/dom@1.0.0-alpha.47
- @fluixi/server@1.0.0-alpha.47

## 1.0.0-alpha.46

### Patch Changes

- @fluixi/core@1.0.0-alpha.46
- @fluixi/start@0.1.0-alpha.36
- @fluixi/reactive@1.0.0-alpha.46
- @fluixi/dom@1.0.0-alpha.46
- @fluixi/server@1.0.0-alpha.46

## 1.0.0-alpha.45

### Patch Changes

- @fluixi/core@1.0.0-alpha.45
- @fluixi/start@0.1.0-alpha.35
- @fluixi/reactive@1.0.0-alpha.45
- @fluixi/dom@1.0.0-alpha.45
- @fluixi/server@1.0.0-alpha.45

## 1.0.0-alpha.44

### Patch Changes

- Updated dependencies [aa82713]
  - @fluixi/dom@1.0.0-alpha.44
  - @fluixi/core@1.0.0-alpha.44
  - @fluixi/server@1.0.0-alpha.44
  - @fluixi/start@0.1.0-alpha.34
  - @fluixi/reactive@1.0.0-alpha.44

## 1.0.0-alpha.43

### Patch Changes

- Updated dependencies [71d770c]
  - @fluixi/dom@1.0.0-alpha.43
  - @fluixi/core@1.0.0-alpha.43
  - @fluixi/start@0.1.0-alpha.33
  - @fluixi/server@1.0.0-alpha.43
  - @fluixi/reactive@1.0.0-alpha.43

## 1.0.0-alpha.42

### Patch Changes

- 3f0e665: Fix control flow `Show` types to support JSX.Element because before it was required to use `<Show>{()=><Component />}</Show>` the fix now directly allow `<Show><Component /></Show>`
- Updated dependencies [3f0e665]
  - @fluixi/reactive@1.0.0-alpha.42
  - @fluixi/server@1.0.0-alpha.42
  - @fluixi/start@0.1.0-alpha.32
  - @fluixi/core@1.0.0-alpha.42
  - @fluixi/dom@1.0.0-alpha.42

## 1.0.0-alpha.41

### Patch Changes

- Updated dependencies [82606b9]
  - @fluixi/reactive@1.0.0-alpha.41
  - @fluixi/core@1.0.0-alpha.41
  - @fluixi/dom@1.0.0-alpha.41
  - @fluixi/server@1.0.0-alpha.41
  - @fluixi/start@0.1.0-alpha.31

## 1.0.0-alpha.40

### Patch Changes

- Updated dependencies [853c4bb]
  - @fluixi/dom@1.0.0-alpha.40
  - @fluixi/core@1.0.0-alpha.40
  - @fluixi/server@1.0.0-alpha.40
  - @fluixi/start@0.1.0-alpha.30
  - @fluixi/reactive@1.0.0-alpha.40

## 1.0.0-alpha.39

### Patch Changes

- Updated dependencies [0d139c4]
  - @fluixi/dom@1.0.0-alpha.39
  - @fluixi/core@1.0.0-alpha.39
  - @fluixi/server@1.0.0-alpha.39
  - @fluixi/start@0.1.0-alpha.29
  - @fluixi/reactive@1.0.0-alpha.39

## 1.0.0-alpha.38

### Patch Changes

- Updated dependencies [30e6ecc]
  - @fluixi/dom@1.0.0-alpha.38
  - @fluixi/core@1.0.0-alpha.38
  - @fluixi/server@1.0.0-alpha.38
  - @fluixi/start@0.1.0-alpha.28
  - @fluixi/reactive@1.0.0-alpha.38

## 1.0.0-alpha.37

### Patch Changes

- Updated dependencies [fd5a896]
- Updated dependencies [63976b7]
  - @fluixi/dom@1.0.0-alpha.37
  - @fluixi/core@1.0.0-alpha.37
  - @fluixi/server@1.0.0-alpha.37
  - @fluixi/start@0.1.0-alpha.27
  - @fluixi/reactive@1.0.0-alpha.37

## 1.0.0-alpha.36

### Patch Changes

- Updated dependencies [9b6215f]
  - @fluixi/dom@1.0.0-alpha.36
  - @fluixi/core@1.0.0-alpha.36
  - @fluixi/server@1.0.0-alpha.36
  - @fluixi/start@0.1.0-alpha.26
  - @fluixi/reactive@1.0.0-alpha.36

## 1.0.0-alpha.35

### Patch Changes

- Updated dependencies [f3122c2]
- Updated dependencies [bdcc4a5]
  - @fluixi/core@1.0.0-alpha.35
  - @fluixi/start@0.1.0-alpha.25
  - @fluixi/reactive@1.0.0-alpha.35
  - @fluixi/dom@1.0.0-alpha.35
  - @fluixi/server@1.0.0-alpha.35

## 1.0.0-alpha.34

### Patch Changes

- Updated dependencies [f0926b6]
- Updated dependencies [bec9d21]
- Updated dependencies [6f8a9d4]
- Updated dependencies [0c2ecb7]
  - @fluixi/dom@1.0.0-alpha.34
  - @fluixi/start@0.1.0-alpha.24
  - @fluixi/server@1.0.0-alpha.34
  - @fluixi/core@1.0.0-alpha.34
  - @fluixi/reactive@1.0.0-alpha.34

## 1.0.0-alpha.33

### Patch Changes

- Updated dependencies [6dfebcd]
  - @fluixi/server@1.0.0-alpha.33
  - @fluixi/core@1.0.0-alpha.33
  - @fluixi/start@0.1.0-alpha.23
  - @fluixi/reactive@1.0.0-alpha.33
  - @fluixi/dom@1.0.0-alpha.33

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
