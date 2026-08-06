---
"@fluixi/core": major
---

Stop re-exporting `@fluixi/utils` from the main entry

`export * from '@fluixi/utils'` in `core.ts` put the whole utility library into every
app's module graph. Measured on the counter example:

| | raw | gzip |
| --- | --- | --- |
| before | 100.27 kB | 31.86 kB |
| after | 23.50 kB | **8.19 kB** |

`@fluixi/utils` was **56% of a minimal app's source bytes**, and a counter was also
shipping the router. A barrel re-exporting another barrel is not shakeable in practice —
`sideEffects: false` on core does not help, and would in any case be wrong, since
`index.ts` calls `ensureIntegration()` at module scope.

**Migration.** Import the helpers directly:

```ts
import { get } from '@fluixi/utils/object';   // preferred — finest grained
import { get } from '@fluixi/core/utils';     // same surface, one import away
```

`@fluixi/core/utils` is a new entry point carrying the full surface, so the change is one
import rewrite rather than a rewrite per helper. Core's own internals already used the
`@fluixi/utils/*` subpaths and are unaffected.
