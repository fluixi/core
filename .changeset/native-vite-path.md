---
"@fluixi/compiler": minor
---

`native: true` on the Vite plugin compiles without babel.

The plugin gains parity with the front-end it replaces: delegated events are
registered, components a `resolve` rule supplies are imported, lazy ones become
`deferred(() => import(…))` bindings with their strategy, and `@fluixi/core/rx`
is rewritten to `@fluixi/reactive`. Names already bound in the file win, as
before.

On `examples/start-app` the two paths serve **byte-identical HTML** — the only
difference in the built output is the client bundle's content hash, since the
emitted text is not the same bytes. On the compile step alone the native path is
**15-18x faster** (27 KB fixture, 100 components: ~156 ms → ~10 ms). Whole-build
time moves much less on a small app, where Vite and rollup dominate.

Types are left in place for esbuild to strip, which it does after this plugin
runs either way — so `@babel/preset-typescript` is not needed on this path.

Opt-in while the two are compared on real apps. TypeScript stripping, JSX,
`` html`` ``, nesting in either direction, and source maps are covered; the
`"use server"` transform still runs through babel.
