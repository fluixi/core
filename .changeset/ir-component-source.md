---
"@fluixi/compiler": minor
---

Record where each component reference comes from in the IR

`IRComponent` gains `source` — `{ module, export, origin }` — set by a resolve pass that
runs between the frontends and codegen:

```ts
import { resolveComponentSources } from '@fluixi/compiler';

const { resolved, unresolved } = resolveComponentSources(ir, { resolver, isBound });
```

`origin` separates `rule` from `builtin` because they are not interchangeable: a rule is
configuration and can be re-targeted, while a control-flow name also selects a lowering
and cannot. Precedence is encoded once, so import injection and later passes read one
answer instead of agreeing by coincidence.

`unresolved` lists capitalised tags nothing supplies and nothing binds. Those compile to a
reference to an identifier that does not exist — the build succeeds and the page throws —
so reporting them is the point of the pass having a return value.

Emitted output is unchanged.
