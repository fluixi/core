---
"@fluixi/compiler": patch
"@fluixi/dom": patch
---

Auto-import `<SuspenseList>`, and make a reactive `class` a render effect.

`SuspenseList` was listed in the compiler's core-only control-flow set but never
in the set that drives auto-import, so the core-only entry was dead and
`<SuspenseList>` in a template failed to compile unless imported by hand — while
`Suspense` and `Await`, which sit beside it in core, worked. Surfaced by building
the language-service map against these sets.

`setClassName` wrapped a function-valued class in `createEffect`, whereas `spread`
already wraps class in `createRenderEffect` and every other attribute binding uses
a render effect. A class forwarded through `applyProps` — which is what every
polymorphic wrapper does — was therefore scheduled a phase later than the same
binding written as a compiled attribute. Also removes a commented-out
`console.log` and a dead alternative implementation left in that function.
