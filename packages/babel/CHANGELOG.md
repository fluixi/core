# @fluixi/babel-plugin-jsx

## 1.0.0-alpha.69

### Patch Changes

- Updated dependencies [d7bf256]
  - @fluixi/compiler@1.0.0-alpha.69

## 1.0.0-alpha.68

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.68

## 1.0.0-alpha.67

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.67

## 1.0.0-alpha.66

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.66

## 1.0.0-alpha.65

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.65

## 1.0.0-alpha.64

### Patch Changes

- Updated dependencies [ed14cd1]
- Updated dependencies [13d488e]
  - @fluixi/compiler@1.0.0-alpha.64

## 1.0.0-alpha.63

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.63

## 1.0.0-alpha.62

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.62

## 1.0.0-alpha.61

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.61

## 1.0.0-alpha.60

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.60

## 1.0.0-alpha.59

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.59

## 1.0.0-alpha.58

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.58

## 1.0.0-alpha.57

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.57

## 1.0.0-alpha.56

### Patch Changes

- 59ddb69: Drop the unused `tslib` dependency. `importHelpers` is on in tsconfig, but these packages ship esbuild-bundled output that inlines the TS helpers — nothing in the published code imports `tslib`, so it was dead weight in `dependencies`.
- Updated dependencies [59ddb69]
- Updated dependencies [e183e9a]
- Updated dependencies [4b911bc]
- Updated dependencies [59ddb69]
- Updated dependencies [e09bc16]
  - @fluixi/compiler@1.0.0-alpha.56

## 1.0.0-alpha.55

### Patch Changes

- 5cfb7a6: Add a `description` field to packages that were missing one. Without it, npm's profile/list view fell back to the first README line — the raw `<p align="center">` logo block — instead of a summary.
- daa7af2: Update READMEs for public npm: drop the GitHub Packages `.npmrc` install instructions (no auth needed on public npm) and replace the GitHub Packages registry badge with an npm version badge.
- Updated dependencies [daa7af2]
  - @fluixi/compiler@1.0.0-alpha.55

## 1.0.0-alpha.54

### Patch Changes

- e005c4c: Add the `license` field (MIT) and bundle a `LICENSE` file in every package, so npm shows the license and ships it in the tarball.
- Updated dependencies [e005c4c]
  - @fluixi/compiler@1.0.0-alpha.54

## 1.0.0-alpha.53

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.53

## 1.0.0-alpha.52

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.52

## 1.0.0-alpha.51

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.51

## 1.0.0-alpha.50

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.50

## 1.0.0-alpha.49

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.49

## 1.0.0-alpha.48

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.48

## 1.0.0-alpha.47

### Patch Changes

- Updated dependencies [3ec6f21]
  - @fluixi/compiler@1.0.0-alpha.47

## 1.0.0-alpha.46

### Patch Changes

- Updated dependencies [8ff7815]
  - @fluixi/compiler@1.0.0-alpha.46

## 1.0.0-alpha.45

### Patch Changes

- Updated dependencies [536a75e]
  - @fluixi/compiler@1.0.0-alpha.45

## 1.0.0-alpha.44

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.44

## 1.0.0-alpha.43

### Patch Changes

- Updated dependencies [71d770c]
  - @fluixi/compiler@1.0.0-alpha.43

## 1.0.0-alpha.42

### Patch Changes

- 3f0e665: Fix control flow `Show` types to support JSX.Element because before it was required to use `<Show>{()=><Component />}</Show>` the fix now directly allow `<Show><Component /></Show>`
- Updated dependencies [3f0e665]
  - @fluixi/compiler@1.0.0-alpha.42

## 1.0.0-alpha.41

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.41

## 1.0.0-alpha.40

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.40

## 1.0.0-alpha.39

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.39

## 1.0.0-alpha.38

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.38

## 1.0.0-alpha.37

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.37

## 1.0.0-alpha.36

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.36

## 1.0.0-alpha.35

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.35

## 1.0.0-alpha.34

### Patch Changes

- Updated dependencies [0c2ecb7]
  - @fluixi/compiler@1.0.0-alpha.34

## 1.0.0-alpha.33

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.33

## 1.0.0-alpha.32

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.32

## 1.0.0-alpha.31

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.31

## 1.0.0-alpha.30

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.30

## 1.0.0-alpha.29

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.29

## 1.0.0-alpha.28

### Patch Changes

- Updated dependencies [663f0b4]
  - @fluixi/compiler@1.0.0-alpha.28

## 1.0.0-alpha.27

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.27

## 1.0.0-alpha.26

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.26

## 1.0.0-alpha.25

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.25

## 1.0.0-alpha.24

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.24

## 1.0.0-alpha.23

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.23

## 1.0.0-alpha.22

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.22

## 1.0.0-alpha.21

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.21

## 1.0.0-alpha.20

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.20

## 1.0.0-alpha.19

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.19

## 1.0.0-alpha.18

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.18

## 1.0.0-next.17

### Patch Changes

- @fluixi/compiler@1.0.0-next.17

## 1.0.0-next.16

### Patch Changes

- Updated dependencies [43a36e2]
- Updated dependencies [f30d5e9]
  - @fluixi/compiler@1.0.0-next.16

## 1.0.0-next.15

### Patch Changes

- Updated dependencies [53ba1b0]
  - @fluixi/compiler@1.0.0-next.15

## 1.0.0-next.14

### Patch Changes

- @fluixi/compiler@1.0.0-next.14

## 0.4.0-next.13

### Patch Changes

- @fluixi/compiler@0.4.0-next.13

## 0.4.0-next.12

### Patch Changes

- @fluixi/compiler@0.4.0-next.12

## 0.4.0-next.11

### Patch Changes

- @fluixi/compiler@0.4.0-next.11

## 0.4.0-next.10

### Patch Changes

- @fluixi/compiler@0.4.0-next.10

## 0.4.0-next.9

### Patch Changes

- @fluixi/compiler@0.4.0-next.9

## 0.4.0-next.8

### Patch Changes

- @fluixi/compiler@0.4.0-next.8

## 0.4.0-next.7

### Patch Changes

- @fluixi/compiler@0.4.0-next.7

## 0.4.0-next.6

### Patch Changes

- @fluixi/compiler@0.4.0-next.6

## 0.4.0-next.5

### Patch Changes

- @fluixi/compiler@0.4.0-next.5

## 0.4.0-next.4

### Patch Changes

- 21d2c18: ---

  "@fluixi/kettlejs": patch

  ***

  Tidy kettlejs internals: remove the dead `dev-server/` and `builder/` stubs and
  ~4,500 lines of extensionless router scratch files (`actual`/`curr`/`known`/`lts`/
  `rs`/`rt`) — all unexported and unimportable. No public API change.

- Updated dependencies [21d2c18]
  - @fluixi/compiler@0.4.0-next.4

## 0.4.0-next.3

### Patch Changes

- @fluixi/compiler@0.4.0-next.3

## 0.4.0-next.2

### Patch Changes

- @fluixi/compiler@0.4.0-next.2

## 0.4.0-next.1

### Patch Changes

- @fluixi/compiler@0.4.0-next.1

## 0.4.0-next.0

### Patch Changes

- Updated dependencies [0769982]
- Updated dependencies [a6628d5]
- Updated dependencies [f18b9d9]
  - @fluixi/compiler@0.4.0-next.0

## 0.3.0

### Patch Changes

- @fluixi/compiler@0.3.0

## 0.2.1

### Patch Changes

- @fluixi/compiler@0.2.1

## 0.2.0

### Patch Changes

- @fluixi/compiler@0.2.0

## 0.1.0

### Minor Changes

- 78dd576: KettleJS compiled fine-grained architecture.

  - New `@fluixi/compiler` package: host-agnostic JSX compiler with an IR and
    pluggable codegen backends. Babel is the front-end adapter; the JSX transform
    moved here (`@fluixi/babel-plugin-jsx` is now a thin re-export).
  - Imperative codegen backend — compiles JSX straight into `@fluixi/dom` runtime
    calls (`createNativeElement`/`spread`/`insert`/`createComponent`) instead of the
    `jsx()` automatic runtime. Selectable via the plugin/vite-plugin options
    `backend: 'jsx' | 'imperative'` and `codegen: 'inline' | 'ir'` (jsx stays the
    default). The `ir` path recurses into JSX nested in expressions.
  - New `@fluixi/lit` package: the lit renderer extracted out of `@fluixi/dom`, so
    the core runtime is usable without lit. The `@fluixi/dom` barrel is now lit-free.
  - New `@fluixi/vite-plugin`: the canonical Vite integration (`fluixi()`).
  - `@fluixi/jsx-runtime` now instantiates components through the framework's
    registered `createComponent` (unifying the jsx and imperative paths).
  - Runtime fixes surfaced by hardening: per-child reactive `insert` for multi-child
    elements, `Switch`/`Match` with compiler-wrapped children, and `classList` support.

### Patch Changes

- Updated dependencies [78dd576]
  - @fluixi/compiler@0.1.0

## 0.0.1
