---
"@fluixi/dom": patch
"@fluixi/jsx": patch
---

Slim the client runtime: keep SSR code out of client bundles.

The package barrel `export *`-ed the server string renderer (`renderToString`, serialization, request context) alongside the client runtime, so every client build shipped the SSR renderer. The runtime barrel now re-exports only the server node classes/guards it actually references; the renderer is re-exported as tree-shakeable named bindings from the entry (still importable as `import { renderToString } from '@fluixi/dom'`) and lives on the `@fluixi/dom/server` subpath. Added a `sideEffects` field so bundlers can drop what a client app doesn't use.

Also removed dead code: the unused `ReactiveDOM` export/module and the unused `autoInitialize` export.
