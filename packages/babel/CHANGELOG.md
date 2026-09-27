# @fluixi/babel-plugin-jsx

## 1.0.0-alpha.90

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.90

## 1.0.0-alpha.89

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.89

## 1.0.0-alpha.88

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.88

## 1.0.0-alpha.87

### Patch Changes

- Updated dependencies [190493a]
- Updated dependencies [807fb8a]
  - @fluixi/compiler@1.0.0-alpha.87

## 1.0.0-alpha.86

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.86

## 1.0.0-alpha.85

### Patch Changes

- Updated dependencies [ea498ef]
  - @fluixi/compiler@1.0.0-alpha.85

## 1.0.0-alpha.84

### Patch Changes

- 9565405: The published entry files now include a copyright banner, and `@fluixi/dom`, `@fluixi/jsx`, `@fluixi/template-parser` and `@fluixi/template-runtime` ship unminified, which their build configs had always asked for.
- Updated dependencies [9565405]
- Updated dependencies [aa17d01]
- Updated dependencies [e077a97]
  - @fluixi/compiler@1.0.0-alpha.84

## 1.0.0-alpha.83

### Patch Changes

- Updated dependencies [e005759]
- Updated dependencies [f1d153c]
- Updated dependencies [e005759]
- Updated dependencies [ae9784f]
- Updated dependencies [f5b4031]
  - @fluixi/compiler@1.0.0-alpha.83

## 1.0.0-alpha.82

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.82

## 1.0.0-alpha.81

### Patch Changes

- Updated dependencies [231a169]
  - @fluixi/compiler@1.0.0-alpha.81

## 1.0.0-alpha.80

### Patch Changes

- Updated dependencies [4a30116]
- Updated dependencies [c698a5c]
  - @fluixi/compiler@1.0.0-alpha.80

## 1.0.0-alpha.79

### Patch Changes

- Updated dependencies [21a13fd]
- Updated dependencies [21a13fd]
- Updated dependencies [21a13fd]
  - @fluixi/compiler@1.0.0-alpha.79

## 1.0.0-alpha.78

### Patch Changes

- Updated dependencies [f121072]
  - @fluixi/compiler@1.0.0-alpha.78

## 1.0.0-alpha.77

### Patch Changes

- Updated dependencies [d93fdf3]
- Updated dependencies [56bb9b9]
- Updated dependencies [5691dc5]
  - @fluixi/compiler@1.0.0-alpha.77

## 1.0.0-alpha.76

### Patch Changes

- Updated dependencies [051fdeb]
- Updated dependencies [122e8f5]
  - @fluixi/compiler@1.0.0-alpha.76

## 1.0.0-alpha.75

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.75

## 1.0.0-alpha.74

### Patch Changes

- 93421e8: Babel is no longer a dependency of `@fluixi/compiler`.

  The IR, the resolve and optimize passes, and codegen import no Babel — that has
  been true for a while, and `dist/index.mjs` proves it — but the package still
  listed five `@babel/*` packages under `dependencies`, so importing
  `@fluixi/compiler` for the component-resolver map or the IR types installed a
  whole compiler toolchain (52 MB in this workspace). `@fluixi/ts-plugin`, which
  imports `@fluixi/compiler/builtins` and nothing else, was paying that.

  `@babel/core`, `@babel/generator`, `@babel/helper-plugin-utils` and
  `@babel/preset-typescript` are now **optional peer dependencies**. The packages
  that always run a Babel compile — `@fluixi/vite-plugin`, `@fluixi/start` and
  `@fluixi/babel-plugin-jsx` — depend on them for real, so no app config changes
  and nothing new has to be installed. `@babel/types` was listed and never
  imported; it is gone.

  `no-babel-in-core.spec.ts` locks the invariant in by walking the import graph from
  each Babel-free entry point (`.` and `./builtins`), following relative imports
  transitively and catching `import 'x'`, `import … from 'x'`, `import('x')` and
  `require('x')`. A stray Babel import in the core is not a style question: for a
  consumer that never installed the optional peer, it is a module that fails to
  resolve.

- b747b26: One lowering. The compiler had two implementations of every JSX semantic and
  compiled with only one of them.

  `plugin.ts` carried a full second lowering — the `codegen: 'inline'` path, plus
  the `backend: 'jsx'` factory emitter — alongside the IR pipeline that has been
  the default for some time. Nothing selected either one; the only references left
  in the repository were two tests written for them, and the option's own docstring
  still advertised `inline` as the default it had stopped being. Meanwhile the two
  implementations had to agree about `ref`, `use:`, spreads, control flow and
  template cloning, and when they disagreed it shipped: `codegen: 'ir'` went out as
  alpha.71 and broke three `@fluixi/ui` packages.

  Removed: 39 of the 46 functions in `plugin.ts:898-2555` (~1,400 lines) and the
  `backend`, `codegen`, `runtime`, `pragma`, `pragmaFrag`, `hoistStatics`,
  `useLitHTML`, `optimizeControlFlow`, `autoShowTransform`, `detectReactivity`,
  `delegatedEvents` and `optimize` options that only fed them. JSX and ` html` ``templates now take the same path they already took: build IR, run the imperative
backend, splice the emitted code back in. Compiled output for`examples/start-app`
  is byte-identical before and after.

  `backend: 'jsx'` is gone, but the `@fluixi/jsx` **runtime** is not: it is still
  what TypeScript's `jsxImportSource` resolves types through and what esbuild's
  automatic runtime targets. This compiler simply never emits a `jsx()` call.

  Also removed from `@fluixi/compiler/integrations`: a regex-based `transform()`
  that every adapter silently fell back to when `@babel/core` failed to load. It
  could not compile JSX, so it returned source whose templates had never become DOM
  calls — a build that reported success and failed when the page opened. Missing
  babel is now a hard error, and a compile error propagates instead of being
  swallowed and replaced with half-transformed source. The dead `generate:
'ssr' | 'hydrate'` option, which nothing has ever read, is gone too.

  Nothing that compiles today compiles differently. Configs passing a removed
  option get a type error naming it, rather than an option that silently does
  nothing.

- Updated dependencies [f995106]
- Updated dependencies [93421e8]
- Updated dependencies [8da12e6]
- Updated dependencies [b747b26]
- Updated dependencies [9817f51]
- Updated dependencies [08635bd]
- Updated dependencies [f0dd4e3]
- Updated dependencies [f2d3779]
- Updated dependencies [6e586c0]
- Updated dependencies [458f2e4]
- Updated dependencies [9817f51]
- Updated dependencies [e035c4e]
- Updated dependencies [3a9607b]
- Updated dependencies [8e1e0f4]
- Updated dependencies [0fdebdd]
- Updated dependencies [4022c74]
- Updated dependencies [33c3574]
  - @fluixi/compiler@1.0.0-alpha.74

## 1.0.0-alpha.73

### Patch Changes

- Updated dependencies [93e06ef]
- Updated dependencies [7e98158]
  - @fluixi/compiler@1.0.0-alpha.73

## 1.0.0-alpha.72

### Patch Changes

- Updated dependencies [15f7c3c]
  - @fluixi/compiler@1.0.0-alpha.72

## 1.0.0-alpha.71

### Patch Changes

- Updated dependencies [ef528ba]
- Updated dependencies [12ea3a5]
  - @fluixi/compiler@1.0.0-alpha.71

## 1.0.0-alpha.70

### Patch Changes

- Updated dependencies [d27056f]
- Updated dependencies [77ab4cb]
- Updated dependencies [509f3f2]
- Updated dependencies [b8ef7fc]
- Updated dependencies [4f4895a]
- Updated dependencies [569fe05]
- Updated dependencies [b820700]
- Updated dependencies [2a317dc]
  - @fluixi/compiler@1.0.0-alpha.70

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
