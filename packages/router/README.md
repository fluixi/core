# @fluixi/router

Framework-agnostic router **core**: URL → a resolved match tree + navigation.
No reactivity, no DOM, no view framework — just pure state and a `subscribe` API.
View adapters (fluixi, react, …) render the match tree **top-down**, which makes
deeply nested layout/outlet rendering work by construction. See [DESIGN.md](./DESIGN.md).

```ts
import { createRouter, createMemoryHistory } from '@fluixi/router';

const routes = [
  { path: '/app', component: AppLayout, children: [
    { path: '/app/home', component: HomePage },
    { path: '/app/user/:id', component: UserPage },
  ]},
];

const router = createRouter({ routes, history: createMemoryHistory('/app/home') });

router.state().match;        // { matched: [AppLayout, HomePage], params, pathname }
router.subscribe((s) => render(s.match));
router.navigate('/app/user/42');
router.state().match.params; // { id: '42' }
```

## API

- `matchRoutes(routes, pathname)` — pure matcher → `RouteMatch | null`.
- `createRouter({ routes, history, base? })` → `Router` with `state()`,
  `subscribe()`, `navigate()`, `match()`, `destroy()`.
- `createMemoryHistory(initial?)` / `createBrowserHistory()` — pluggable history.

## Rendering contract

`match.matched` is parent → child. An adapter folds from the deepest child upward,
passing each rendered child to its parent as the parent's outlet — all concrete
values, never a deferred build. That inverts the old fluixi router's lazy,
re-entrant outlet cascade (the source of the "nested `<Outlet/>` renders empty"
bug) into a straightforward top-down composition.

Status: core only. Fluixijs adapter + store-admin migration are later steps.
