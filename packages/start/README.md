<p align="center">
  <img src="https://raw.githubusercontent.com/fluixi/assets/main/logos/128x128.png" alt="Fluixi" width="120" height="120" />
</p>

# @fluixi/start

**The Fluixi meta-framework — zero-config dev/build/start with SSR, file routing, and hydration.**

[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](./LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
[![npm](https://img.shields.io/npm/v/@fluixi/start?logo=npm)](https://www.npmjs.com/package/@fluixi/start)
![Vite](https://img.shields.io/badge/built%20on-Vite-646cff?logo=vite&logoColor=white)

---

## ✨ Overview

`@fluixi/start` is `dev`, `build`, and production `start` over [`@fluixi/server`](../server)
+ Vite, so apps stop hand-rolling a `server.mjs`. This package is the **runtime**
(programmatic commands + config); the `fluixi` CLI lives in [`@fluixi/cli`](../cli), and
you scaffold a new app with [`create-fluixi`](../create) (`npm create fluixi`).

```bash
fluixi dev      # SSR dev server (Vite middleware + HMR)
fluixi build    # client + server bundles → dist/client, dist/server
fluixi start    # production SSR server (after build)
```

## 📦 Installation

```sh
pnpm add @fluixi/start @fluixi/cli
```

## 🗂️ Conventions

| Default | Config key |
| --- | --- |
| `src/entry-server.ts` exporting `render(url)` (and optionally `renderStream(url)`) | `serverEntry` |
| `src/entry-client.ts` (hydration) | `clientEntry` |
| `src/routes/` (file-based routes → `virtual:fluixi-routes`) | `routesDir` |
| `src/middleware.ts` (optional request middleware) | `middleware` |
| `index.html` with `<div id="root"></div>` | `template` / `mountId` |
| port `3000` | `port` |

## ⚙️ Config

`fluixi.config.{ts,mts,mjs,js}` — TypeScript configs are bundled on the fly:

```ts
import { defineConfig } from '@fluixi/start/config';

export default defineConfig({
  port: 3010,
  ssrNoExternal: ['@medusajs/js-sdk'], // SSR deps Vite must bundle
});
```

## 🚀 Features

- **Streaming SSR** — export `renderStream(url)` (via `@fluixi/server`'s
  `renderToBodyStream`) and the `index.html` head is flushed first, then the app body is
  streamed into the mount point.
- **Middleware / guards** — `src/middleware.ts` default-exports `defineMiddleware([...])`,
  a `(request, next) => Response` chain run before SSR (auth redirects, headers, …).
- **Server functions** — a `"use server"` function runs only on the server and is callable
  from the client over RPC (`/_server`, same-origin CSRF); `getRequestEvent()` works inside
  it.
- **Routing** — `@fluixi/start/router` re-exports [`@fluixi/core/router-next`](../core):
  `Router`, `Outlet`, `Link`, `Form`, the hooks, `createMemoryHistory`.
- **Deploy adapters** — `createProdHandler` builds a runtime-neutral fetch handler;
  `nodeAdapter` (Node http + static files) and `webAdapter` (`export { fetch }` for
  edge/worker) serve it. The same handler runs on Node, Bun, Deno, and edge runtimes.

## 🧰 Programmatic

```js
import { dev, build, start, createProdHandler } from '@fluixi/start';

await dev({ port: 3010 });                 // or build() / start()
const handler = await createProdHandler();  // a (Request) => Promise<Response>
```

## 🔌 Subpaths

| Import | What |
| --- | --- |
| `@fluixi/start` | `dev`/`build`/`start`, the fetch-handler layer, adapters, middleware helpers |
| `@fluixi/start/config` | `defineConfig`, `loadConfig`, `resolveConfig` |
| `@fluixi/start/router` | the routing surface (re-export of `@fluixi/core/router-next`) |
| `@fluixi/start/server-fn` | server-function runtime (`isServerFnRequest`, `handleServerFn`) |

## 📄 License

[MIT](./LICENSE) © [Fluixi](https://fluixi.dev)
