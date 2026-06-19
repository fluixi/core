---
"@fluixi/core": patch
---

Reduce lit coupling in the core. Drop the unused `lit` option from router-next's `<Link>` (and its top-level `import { html } from '@fluixi/lit'`), and remove the dead `@lit-labs/ssr` + `@lit-labs/ssr-client` dependencies (declared but never imported — Fluixi SSR uses its own ServerNode renderer, not lit's). First step toward "all lit lives in @fluixi/lit"; the remaining main-entry re-exports are decoupled with the old-router retirement.
