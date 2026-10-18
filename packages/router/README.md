<p align="center">
  <img src="https://raw.githubusercontent.com/fluixi/assets/main/logos/128x128.png" alt="Fluixi" width="120" height="120" />
</p>

# @fluixi/router

**Framework-agnostic router core: URL → a resolved match tree + navigation.**

[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](./LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
[![npm](https://img.shields.io/npm/v/@fluixi/router?logo=npm)](https://www.npmjs.com/package/@fluixi/router)
![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)

---

## ✨ Overview

`@fluixi/router` is the routing **core**: pure state and a `subscribe` API, with **no
reactivity, no DOM, no view framework**. View adapters (the Fluixi adapter lives in
[`@fluixi/core/router`](../core)) render the match tree **top-down**, which makes
deeply nested layout/outlet rendering work by construction. See [DESIGN.md](./DESIGN.md).

## 📦 Installation

```sh
pnpm add @fluixi/router
```

## 🚀 Usage

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

## 📖 API

| Export | What |
| --- | --- |
| `matchRoutes(routes, pathname)` | pure matcher → `RouteMatch \| null` |
| `createRouter({ routes, history, base? })` | `Router` with `state()`, `subscribe()`, `navigate()`, `match()`, `destroy()` |
| `createMemoryHistory(initial?)` / `createBrowserHistory()` | pluggable history adapters |

## 🧭 Rendering contract

`match.matched` is parent → child. An adapter folds from the deepest child upward,
passing each rendered child to its parent as that parent's outlet: all concrete values,
never a deferred build. That top-down composition is what makes deeply nested `<Outlet/>`
rendering work at any depth.

## 📄 License

[MIT](./LICENSE) © [Fluixi](https://fluixi.dev)
