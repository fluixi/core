---
"@fluixi/dom": minor
---

Islands — partial hydration. `<Island component={C} props={p} name="C" />` server-renders
a component inside a `<fluixi-island>` boundary (props serialized as a JSON attribute);
`hydrateIslands(registry)` — the client entry instead of `startClient(App)` — finds every
boundary, looks it up by name, and hydrates **only** that subtree in place. The rest of the
page stays inert static HTML (no client JS executed for it). Re-exported from `@fluixi/core`.

```tsx
// page (SSR): <Island name="Counter" component={Counter} props={{ start: 0 }} />
// client entry:
import { hydrateIslands } from '@fluixi/core';
hydrateIslands({ Counter });
```

(The `Index` SSR extra-node bug and dev hydration-mismatch warnings — also tracked under
hydration follow-ups — were already resolved.)
