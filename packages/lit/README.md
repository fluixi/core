# @fluixi/lit

The lit-html renderer for KettleJS: reactive `html`/`svg` template tags, the lit
directives (`litrx`, `classMap`/`styleMap`, `repeat`, `ref`, `ifDefined`,
`unsafeHTML`, …) and the lit-based control flow (`$show`/`$for`/`$switch`/
`$portal`/…).

It builds on `@fluixi/dom` (the core imperative runtime) — it imports the runtime
primitives it needs from `@fluixi/dom/runtime` and `@fluixi/dom/utils`, and shares
the same reactive integration. The dependency is one-directional: `@fluixi/dom`
does not depend on `@fluixi/lit`, so the imperative runtime stays usable without
pulling in lit (which requires a DOM via `@lit/reactive-element`).

## Entry points

- `@fluixi/lit` — everything (templates + directives + control flow).
- `@fluixi/lit/templates` — `html`, `svg`, `rx`, `nothing`.
- `@fluixi/lit/directives` — the reactive lit directives.
- `@fluixi/lit/control-flow` — `$show`/`$for`/`$switch`/… (the lit control flow;
  the imperative Solid-style `Show`/`For`/… live in `@fluixi/dom`).

This package was extracted from `@fluixi/dom` so the core runtime and the lit
renderer are separately consumable.
