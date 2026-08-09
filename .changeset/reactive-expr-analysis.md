---
"@fluixi/compiler": minor
---

Move the reactivity rule out of the Babel front-end.

Whether `count()` is wired reactively while `count` is not, and whether
`props.children` counts as a value to track, is a Fluixi decision. It was written
against `@babel/types` inside `build-ir.ts`, which meant the rule could only be
read — and only be tested — through a parser.

It now lives in `@fluixi/compiler`'s `analyze/reactive-expr.ts` as
`isReactiveShape(shape)` over a four-case `ExprShape` (`call`, `member`,
`compound`, `opaque`). The Babel front-end keeps only the mapping from its AST to
those shapes, which is the part that genuinely belongs to a front-end; a second
front-end supplies its own mapping and inherits the semantics unchanged.

`ExprShape` is deliberately narrow and must not grow into a JavaScript AST: every
syntax the rule does not branch on collapses to `compound` (reactive when a part
is) or `opaque`. Which sub-expressions count stays with the front-end — a spread
element or a computed key contributes nothing, because the compiler cannot see
what it would introduce.

Behaviour is unchanged: `examples/start-app` compiles to a byte-identical bundle,
and the rule now has a 39-case table covering both the shapes and the syntax that
maps onto them.
