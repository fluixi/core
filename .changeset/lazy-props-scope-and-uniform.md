---
"@fluixi/compiler": patch
---

Make lazy component props consistent and scope them to components. Every component prop is now emitted as a getter (`get prop() { return … }`) — including static props and the base object inside `mergeProps(...spreads, { … })` — so a component is created once and reactivity flows through the getter uniformly, across all codegen paths (inline jsx, inline imperative, IR). Native-element attributes are no longer getter-wrapped: they already carry their own reactivity as `() => expr` thunks that `spread` consumes, so wrapping them added a redundant `get x() { return () => expr }` layer.
