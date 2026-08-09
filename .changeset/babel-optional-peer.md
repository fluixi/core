---
"@fluixi/compiler": minor
"@fluixi/vite-plugin": patch
"@fluixi/start": patch
"@fluixi/babel-plugin-jsx": patch
---

Babel is no longer a dependency of `@fluixi/compiler`.

The IR, the resolve and optimize passes, and codegen import no Babel — that has
been true for a while, and `dist/index.mjs` proves it — but the package still
listed five `@babel/*` packages under `dependencies`, so importing
`@fluixi/compiler` for the component-resolver map or the IR types installed a
whole compiler toolchain (52 MB in this workspace). `@fluixi/ts-plugin`, which
imports `@fluixi/compiler/builtins` and nothing else, was paying that.

`@babel/core`, `@babel/generator`, `@babel/helper-plugin-utils` and
`@babel/preset-typescript` are now **optional peer dependencies**. The packages
that always run a Babel compile — `@fluixi/vite-plugin`, `@fluixi/start` and
`@fluixi/babel-plugin-jsx` — depend on them for real, so no app config changes
and nothing new has to be installed. `@babel/types` was listed and never
imported; it is gone.

`no-babel-in-core.spec.ts` locks the invariant in by walking the import graph from
each Babel-free entry point (`.` and `./builtins`), following relative imports
transitively and catching `import 'x'`, `import … from 'x'`, `import('x')` and
`require('x')`. A stray Babel import in the core is not a style question: for a
consumer that never installed the optional peer, it is a module that fails to
resolve.
