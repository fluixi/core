---
"@fluixi/compiler": minor
---

`compileTemplate()` — compile a template to runtime calls with no Babel in the path.

The template lowering moves out of the Babel front-end into `lower/template.ts`,
which imports nothing from a JavaScript toolchain. What a front-end still owns is
the holes, because reading `${…}` means reading JavaScript; it hands them over as
`TemplateHole` — source text, whether the expression is reactive, and the two
structural facts the lowering branches on (a single-expression arrow for `each`,
an object literal for `class`). Deliberately conclusions, never a syntax tree: if
the lowering could ask a parser a new question, the dependency grows back one
field at a time.

`compileTemplate(source, options)` then runs parse → lower → resolve → optimize →
emit and returns code, the runtime symbols to import, and the IR. It runs the same
passes in the same order as the Babel front-end, and a differential test compiles
ten templates both ways and compares the emitted code.

One difference worth knowing: this path passes hole source through verbatim where
the Babel path reprints it through `@babel/generator`, so output matches the
author's formatting rather than the printer's.

Not yet a module compiler. Finding templates inside a JavaScript file, and
describing each hole without a parser, is the remaining piece.
