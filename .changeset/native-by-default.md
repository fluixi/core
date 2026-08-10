---
"@fluixi/compiler": major
"@fluixi/vite-plugin": minor
"@fluixi/start": minor
---

The compiler no longer runs inside babel.

`fluixi()` and `serverFunctionsVitePlugin()` compile by rewriting the source
directly: parse once, splice the emitted code over the spans it replaces. Nothing
is reprinted, edits carry a source map, and types are left for esbuild to strip.
The `native` option is gone — that is simply what the plugin does.

Babel is kept for the case that needs it, the way Next keeps one: a
`babel.config.js` whose other plugins have to see the output. `fluixi({ babel:
true })` selects it, and `@babel/core` and friends are optional peers, installed
only by `@fluixi/babel-plugin-jsx`.

What an app installs from that namespace is now `@babel/parser`, used as a
parser. `@fluixi/vite-plugin` and `@fluixi/start` declare no babel packages at
all, and importing `@fluixi/compiler/integrations` loads none — pinned by
`no-babel-in-core.spec.ts`, which distinguishes a static import from the dynamic
one behind the opt-in.

Verified on `examples/start-app` (HTML identical to the babel build), the docs
site (53 prerendered pages identical), the `@fluixi-ui` playground, and 681 files
from `store-admin`, `storefront` and the component library.
