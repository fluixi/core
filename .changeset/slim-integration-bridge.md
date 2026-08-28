---
"@fluixi/dom": patch
"fluixi": patch
---

Slim the `@fluixi/dom` integration bridge to framework glue only.

Reactive signal primitives are no longer wrapped by the integration bridge — they
are imported straight from `@fluixi/reactive/signal` and unified across separately
bundled packages via the graph's `globalThis` singleton. `dom/integration.ts` now
carries only the non-core glue (`createComponent` + bridge/store plumbing).

`@fluixi/dom` re-exports the reactive primitives from the core, so existing
`import { … } from '@fluixi/dom'` consumers keep working unchanged. `@fluixi/core`
(`context`, `router-next`, the reactive re-export barrel) now imports those
primitives directly from `@fluixi/reactive/signal`.
