---
"@fluixi/compiler": patch
---

Write literal attributes directly instead of through `spread`

An element with only compile-time-constant attributes emitted
`spread({ element, props: { className: "card" } })`. `spread` walks every prop checking for
reactivity, events, refs, class/style objects and namespaces — none of which a constant
needs. It now emits `el.setAttribute("class", "card")`.

This covers elements that cannot be cloned whole because a child is dynamic, which is the
common shape. Fully static subtrees already bake their attributes into the template. SVG
stays on `spread`, where the namespace handling lives.
