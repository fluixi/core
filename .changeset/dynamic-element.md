---
"@fluixi/dom": minor
"@fluixi/jsx": patch
---

Export `createDynamicElement` from `@fluixi/dom`.

Building an element or component from a type known only at runtime is what a
polymorphic `as` prop needs, and what JSX syntax cannot express — you can write
`<div>` or `<Comp>`, but not `<{value}>`. That logic lived in the automatic JSX
runtime only because JSX happened to be its first caller.

It belongs in dom: both authoring modes compile to the same dom calls, so an
`as`-polymorphic component shouldn't have to depend on `@fluixi/jsx`. It did —
which made `@fluixi/jsx` a runtime dependency of every component library built on
`as`, including for apps that only ever write html`` templates.

`jsx()` now calls it rather than keeping its own copy, so the two paths can't
drift the way `spread` and `applyProps` did.
