---
"@fluixi/compiler": patch
---

Write literal attributes directly instead of through `spread`

An element with only compile-time-constant attributes emitted
`spread({ element, props: { className: "card" } })`. `spread` is a generic helper that
walks every prop checking for reactivity, events, refs, class/style objects and
namespaces — none of which a constant needs. It now emits
`el.setAttribute("class", "card")`.

This applies to elements that cannot be cloned whole because a *child* is dynamic, which
is the common shape: a card wrapper with one reactive value inside. Fully static subtrees
already bake their attributes into the template.

Uses the same predicate as the template serializer, so both agree on what counts as a
plain attribute: no namespaced names (`prop:`, `attr:`, `bool:`, `on:`), no property-only
names (`innerHTML`, `value`, …), and SVG stays on the `spread` path where the namespace
handling lives.
