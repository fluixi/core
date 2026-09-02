# @fluixi/template-runtime

## 0.1.0-alpha.1

### Patch Changes

- Updated dependencies [231a169]
  - @fluixi/compiler@1.0.0-alpha.81
  - @fluixi/reactive@1.0.0-alpha.81
  - @fluixi/dom@1.0.0-alpha.81

## 0.1.0-alpha.0

### Minor Changes

- c698a5c: The new `@fluixi/template-runtime` package compiles `html` and `svg` templates in the browser, with no build step, and `@fluixi/compiler` now includes a `./compile` subpath that excludes node-specific dependencies.

### Patch Changes

- fa19974: A list no longer rebuilds every node when it changes, as the runtime now creates components itself instead of waiting for `@fluixi/core` to provide a way to create them.
- Updated dependencies [fa19974]
- Updated dependencies [4a30116]
- Updated dependencies [fa19974]
- Updated dependencies [c698a5c]
  - @fluixi/dom@1.0.0-alpha.80
  - @fluixi/compiler@1.0.0-alpha.80
  - @fluixi/reactive@1.0.0-alpha.80
