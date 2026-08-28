---
"@fluixi/dom": patch
"fluixi": patch
---

Stamp the version attributes on every render path, not just core's

`fluixi`/`fx-dom`/`fx-reactive` were stamped by `@fluixi/core`'s `render`, which an
SSR app never calls: `startClient` hydrates through the DOM runtime's own `render`, so
those apps — the docs site among them — carried no version attributes at all. Exactly
the case where a bug report needs them.

The stamping now lives in `@fluixi/dom`, which both paths pass through. `@fluixi/core`
cannot be imported from there without a dependency cycle, so core registers its version
on load instead and whichever render runs stamps what it has been given.
