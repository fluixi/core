# @fluixi/testing

## 1.0.0-alpha.11

### Patch Changes

- Updated dependencies [9ac3eaa]
- Updated dependencies [310b9d1]
  - @fluixi/dom@1.0.0-alpha.63
  - @fluixi/reactive@1.0.0-alpha.63

## 1.0.0-alpha.10

### Patch Changes

- Updated dependencies [2f99854]
  - @fluixi/dom@1.0.0-alpha.62
  - @fluixi/reactive@1.0.0-alpha.62

## 1.0.0-alpha.9

### Patch Changes

- Updated dependencies [ee9da1c]
  - @fluixi/dom@1.0.0-alpha.61
  - @fluixi/reactive@1.0.0-alpha.61

## 1.0.0-alpha.8

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.60
- @fluixi/dom@1.0.0-alpha.60

## 1.0.0-alpha.7

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.59
- @fluixi/dom@1.0.0-alpha.59

## 1.0.0-alpha.6

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.58
- @fluixi/dom@1.0.0-alpha.58

## 1.0.0-alpha.5

### Patch Changes

- Updated dependencies [5d92daa]
  - @fluixi/reactive@1.0.0-alpha.57
  - @fluixi/dom@1.0.0-alpha.57

## 1.0.0-alpha.4

### Patch Changes

- 59ddb69: Drop the unused `tslib` dependency. `importHelpers` is on in tsconfig, but these packages ship esbuild-bundled output that inlines the TS helpers — nothing in the published code imports `tslib`, so it was dead weight in `dependencies`.
- Updated dependencies [59ddb69]
- Updated dependencies [59ddb69]
- Updated dependencies [8b7f398]
- Updated dependencies [e183e9a]
- Updated dependencies [59ddb69]
  - @fluixi/dom@1.0.0-alpha.56
  - @fluixi/reactive@1.0.0-alpha.56

## 0.1.0-alpha.3

### Patch Changes

- Updated dependencies [5cfb7a6]
- Updated dependencies [daa7af2]
  - @fluixi/dom@1.0.0-alpha.55
  - @fluixi/reactive@1.0.0-alpha.55

## 0.1.0-alpha.2

### Patch Changes

- e005c4c: Add the `license` field (MIT) and bundle a `LICENSE` file in every package, so npm shows the license and ships it in the tarball.
- Updated dependencies [e005c4c]
  - @fluixi/dom@1.0.0-alpha.54
  - @fluixi/reactive@1.0.0-alpha.54

## 0.1.0-alpha.1

### Patch Changes

- 9b06063: Rewrite the reactive store to a proxy-write model — `createStore` drops from 13.8kb to ~3.7kb gzip (Solid parity), no cloning or diffing. Keep the store's path/array/produce helpers on the setter.

  Drop the legacy signal engine from the default `@fluixi/reactive/signal` entry: the unused operator modules move to `@fluixi/reactive/operators` and `@fluixi/reactive/cached-resource` subpaths, so `/signal` falls from 8.8kb to 4.7kb gzip and no longer bundles the old engine.

  Add `@fluixi/testing` — minimal helpers (`render`, `flush`, `fireEvent`) for testing components in jsdom.

- Updated dependencies [9b06063]
  - @fluixi/reactive@1.0.0-alpha.53
  - @fluixi/dom@1.0.0-alpha.53
