---
"@fluixi/compiler": minor
---

JSX compiles through the transform, on the same builder as the plugin.

`buildJsxIR` moves to `lower/jsx.ts` and reads `node.type` instead of a parser's
helpers, asking the caller for an expression's source through `code()` — a
front-end that can slice the original text returns that, one that reprints
returns the printed form. Both paths get the same IR from one builder rather than
two that have to agree.

The two shape mappers collapse into one: `shapeOf` in `analyze/expr-shape.ts`
reads node types, so it serves the Babel AST and any ESTree-shaped one. The
32-case syntax table now covers it.

`moduleBindings` — which decides whether an injected import would collide — is
checked against `path.scope.hasBinding` over 22 cases, including array holes,
rest elements, nested destructuring and exported declarations. A missed binding
emits a duplicate declaration; a phantom one drops an import the code needs.

`transformTemplates` handles JSX, `` html`` ``, and either nested in the other.
Still not wired into the Vite plugin.
