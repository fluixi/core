---
"@fluixi/compiler": minor
---

Move component resolution into the IR

`IRComponent` gains a `source` field — `{ module, export, origin }` — set by a new
resolve pass that runs between the frontends and codegen. The decision used to live
only in the Babel plugin's state, so the IR could not see which components a template
referenced: no pass could vary a decision per usage, group references into chunks, or
drop a subtree it knows is server-only.

```ts
import { resolveComponentSources } from '@fluixi/compiler';

const { resolved, unresolved } = resolveComponentSources(ir, { resolver, isBound });
```

`origin` separates the two suppliers because they are not interchangeable. A `rule` is
configuration and can be re-targeted; a `builtin` control-flow name also selects a
lowering and cannot. The pass encodes the precedence once — control flow, then rules,
then the router group — so import injection and every later pass read one answer
instead of agreeing by coincidence.

`unresolved` names capitalised tags nothing supplies and nothing binds. Those compile
to a reference to an identifier that does not exist: the build succeeds and the page
throws. Reporting them is the point of the pass having a return value.

Emitted output is unchanged. A test pins `html``` and JSX to each other rather than to
a literal, since they now reach the decision by different routes.
