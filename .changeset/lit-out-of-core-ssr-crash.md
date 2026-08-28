---
"fluixi": minor
"@fluixi/jsx": minor
"@fluixi/dom": minor
---

Keep lit fully out of the core module graph — fixes `HTMLElement is not defined`
when SSR-rendering / prod-serving an app (e.g. via `@fluixi/start`).

The real culprit was the file-routing codegen: `fluixiRoutesPlugin` emitted
`import { lazy, runWithOwner } from '@fluixi/core/router'` (the old, lit-coupled
router) into `virtual:fluixi-routes`. That statically pulled `@fluixi/lit` → `lit`,
which `extends HTMLElement` at module init, so the server bundle threw on import —
and because lit was static in the graph, the lazy `import('lit')` elsewhere couldn't
be split out either. Codegen now imports `lazy` from `router-next` (lit-free); the
unused `runWithOwner` is dropped.

Also scrubbed the remaining lit pulls from the core entries so lit lives **only** in
`@fluixi/lit`:

- `@fluixi/core` main entry + `lib/index` barrel: removed the `html`/`svg`/
  `nothing`/`litRender`/`LitElement`/`$show`/`$for`/`$switch`/`$portal`/`$if`/`$each`/
  `$classMap`/`$styleMap`/`litrx`/`createReactiveJSX` re-exports; `Router`/`Link`/etc.
  now come from `router-next`; `render/index` lazily imports lit client-only.
- `@fluixi/jsx`: dropped the `$`/`$if`/`litrx` re-export and the unused
  `html`/`svg`/`nothing` value imports (→ `import type`); removed the dead
  `@fluixi/lit` + `@lit-labs/ssr` dependencies.
- `@fluixi/dom`: `TemplateResult` is now a type-only import.

BREAKING: import lit symbols (`html`, `svg`, `nothing`, `LitElement`, `$show`/`$for`/
`$switch`/`$portal`/`$if`/`$each`, `$classMap`/`$styleMap`, `litrx`) from `@fluixi/lit`
directly instead of from `@fluixi/core`.
