---
"@fluixi/lit": patch
---

Rebuild `@fluixi/lit` as the compiled, lit-free template layer — the no-JSX way to author Fluixi UIs. It no longer ships a lit-html renderer: the `html`/`svg` exports are typed compile-time marker tags (they throw if called uncompiled), and the `@fluixi/compiler` (`format: 'lit'`) turns every `` html`...` `` into the same `@fluixi/dom` runtime calls JSX produces.

Dropped the `lit` dependency and all lit-`Directive`/lit-based control-flow code; the package now re-exports control flow (`Show`/`For`/`Index`/`Switch`/`Match`/`Dynamic`/`Portal`/`ErrorBoundary`) and `classMap`/`styleMap` from `@fluixi/dom` so a template app has one import surface. Custom lit directives / `guard` / `cache` / `live` are intentionally out — use `ref`, `classList`/`style` objects, `innerHTML`, and control-flow components instead.
