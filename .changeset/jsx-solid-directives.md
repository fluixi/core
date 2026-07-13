---
"@fluixi/compiler": minor
"@fluixi/jsx": minor
---

JSX now supports the Solid-style directives `use:` and `oncapture:`, closing the gap
with the html`` template surface.

- `use:name` / `use:name={opts}` → normalized to a single `use` prop (`[dir, () => opts]`
  pairs) the runtime applies; the directive identifier is kept referenced so its import
  isn't dropped.
- `oncapture:event={h}` → a native capture-phase listener.
- `on:event` handlers pass through to the native-listener dispatch and are no longer wired
  reactively (a `props.onX` handler could previously be reactive-wrapped).
- `use:${string}` / `oncapture:${string}` added to the JSX attribute types.

Also fixes a latent bug in both lowerers: `use:x={{…}}` object options were parsed as an
arrow block body (returning `undefined`) instead of an object — the accessor body is now
parenthesized.
