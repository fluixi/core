---
"@fluixi/compiler": minor
"@fluixi/lit": minor
"@fluixi/vite-plugin": minor
"@fluixi/dom": minor
"@fluixi/jsx-runtime": minor
"@fluixi/kettlejs": minor
"@fluixi/babel-plugin-jsx": minor
---

KettleJS compiled fine-grained architecture.

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
