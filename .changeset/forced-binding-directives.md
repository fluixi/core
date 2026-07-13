---
"@fluixi/dom": minor
"@fluixi/jsx": minor
---

Forced binding directives `prop:`, `attr:` and `bool:` (Solid parity), on both JSX and
html`` surfaces.

- `prop:name` always assigns the DOM property (`element[name] = value`), bypassing the
  property-vs-attribute heuristic.
- `attr:name` always sets the attribute via `setAttribute`.
- `bool:name` toggles a boolean attribute by truthiness — a truthy value renders the empty
  string, a falsy value removes it.

All three accept static or reactive values and are handled in the runtime `spread` /
`applyProps` dispatch, so JSX (namespaced attribute) and html`` (plain-attribute fallback)
both route through the same branches. Added `prop:${string}` / `attr:${string}` /
`bool:${string}` to the JSX attribute types.
