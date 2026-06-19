---
"@fluixi/start": minor
---

Add the `@fluixi/start/router` subpath, re-exporting `@fluixi/core/router-next`
(Router, Outlet, Link, the hooks, `createMemoryHistory`/`createBrowserHistory`, the
data layer, types). Apps get routing from the meta-framework's own surface — a single,
stable dependency — instead of reaching into fluixi internals:

```ts
import { Router, Outlet, createMemoryHistory } from '@fluixi/start/router';
```

Framework primitives (Suspense, lazy, signals, components) still come from
`@fluixi/core`; only routing lives here.
