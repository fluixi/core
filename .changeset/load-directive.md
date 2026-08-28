---
"@fluixi/compiler": minor
"@fluixi/template-parser": minor
"fluixi": minor
---

Add the `load:` directive — decide when a component's code is fetched

Resolution says *where* a component comes from; `load:` says *when* it loads. They are
separate because they vary independently: a component's location is the same everywhere
and belongs in config, while whether a particular usage should wait for the viewport is
a property of that usage.

```tsx
<Summary />                                    // eager — entry chunk
<ExportDialog load:interaction />              // own chunk, on first interaction
<AuditLog load:media="(min-width: 1024px)" />  // own chunk, desktop only
<RevenueChart load:visible="200px" />          // own chunk, on approach
```

Six strategies: `eager`, `idle`, `visible`, `interaction`, `media`, `never`. A deferred
component compiles to `deferred(() => import('…'), { strategy })` instead of a static
import, so chunking, hashing and tree-shaking stay ordinary bundler behaviour rather
than an integration. `deferred()` is new in `@fluixi/core`, built on `lazy()` — it adds
only the scheduling, reusing Suspense integration and the synchronous-when-preloaded
hydration path unchanged.

`load:` joins the existing `use:`/`prop:`/`attr:`/`bool:` namespace, so it cannot
collide with a real prop. Both syntaxes share one parser: `load:visible` is already a
valid `JSXNamespacedName`, and the html`` parser gains a `LoadDirective` node, but each
funnels through the same helper — a test pins the two to identical output.

**Strategy collapsing is included, and it is not optional.** If a module is referenced
eagerly anywhere in the file, deferred references to it are demoted to eager: it is in
the chunk already, so a lazy boundary would add a wrapper, a promise and a re-render in
order to fetch nothing — and emitting both forms would redeclare the binding.

The strategy must be a literal. It decides how the module is emitted, so a runtime value
cannot supply it, and `load:visible={margin}` is an error rather than a silent fallback.

See `examples/load-strategies`, whose test runs the real build and asserts which chunk
each component landed in.
