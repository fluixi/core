---
"@fluixi/jsx": patch
---

Make intrinsic `ref` bivariant, and widen SVG attributes to reactive.

- **ref**: the intrinsic `ref` now uses a bivariant callback plus a base-element
  (`HTMLElement`/`SVGElement`) object form. This lets a component whose props
  extend `HTMLAttributes<HTMLElement>` (the generic wrapper pattern) AND one whose
  props extend the specific element (e.g. `HTMLAttributes<HTMLUListElement>`) both
  spread `{...others}` onto the same intrinsic. Previously only one convention
  worked per tag because the `{ current: T | null }` object form is invariant —
  keeping the specific `ul`/`p`/`h1`–`h6`/`pre`/`dl` typings from the prior release
  broke consumers using the generic pattern. Both now compile.
- **SVGAttributes**: every presentation/geometry/text/filter attribute
  (`cx`, `cy`, `r`, `d`, `transform`, `fill`, `stroke-width`, …) is widened to
  `Reactive<>` so SVG geometry can bind reactive accessors, matching
  `HTMLAttributes`/`AriaAttributes`. (Supersedes the earlier
  `jsx-specific-list-text-refs` changeset — the specificity stays, the ref
  variance is what's fixed.)
