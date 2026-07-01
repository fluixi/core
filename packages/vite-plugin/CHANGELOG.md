# @fluixi/vite-plugin

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
