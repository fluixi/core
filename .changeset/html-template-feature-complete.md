---
"@fluixi/compiler": minor
"@fluixi/dom": minor
"fluixi": minor
---

html`` templates: full feature support, and @fluixi/lit folded into @fluixi/dom.

- `fluixi()` now compiles both JSX and html`` by default (no `format` option).
- Directives: if/else, each/key, bind:, class:, style: (+ class/style object
  syntax), ref, use/use:, html= raw, boolean/property bindings.
- Events: native `on:click` plus modifiers (.capture/.once/.passive/.prevent/
  .stop/.self); `@click`/`onClick` stay delegated.
- Components: dynamic `<${Comp}/>`, named slots (`slot="name"` → `props.name`),
  `<component is=${C}>` (→ Dynamic), and a new `Await` component.
- `html`/`svg` markers and their types now live in @fluixi/dom and are
  re-exported from @fluixi/core; the separate `@fluixi/lit` package is removed.
