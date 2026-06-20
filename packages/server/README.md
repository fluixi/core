<p align="center">
  <img src="https://raw.githubusercontent.com/fluixi/assets/main/logos/128x128.png" alt="Fluixi" width="120" height="120" />
</p>

# @fluixi/server

**Server-side rendering for Fluixi — request-scoped, streaming, framework-agnostic.**

[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](./LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![Registry](https://img.shields.io/badge/registry-GitHub%20Packages-181717?logo=github)
![SSR](https://img.shields.io/badge/SSR-streaming%20%2B%20hydration-2c4f7c)

---

## ✨ Overview

The universal string renderer lives in [`@fluixi/dom`](../dom) (`renderToString` +
request-scoping); `@fluixi/server` is the **Node-side home** that makes it
concurrency-safe and ergonomic:

- injects an `AsyncLocalStorage` into `@fluixi/dom`'s request store so concurrent SSR
  requests are isolated (`@fluixi/dom` stays browser-safe by never importing
  `node:async_hooks` itself);
- re-exports the SSR surface (`renderToString`, `renderToStringAsync`, `getRequestEvent`,
  the request-context primitives);
- adds request helpers (`renderRequest`, `renderRequestAsync`, `renderRequestToPage`,
  `renderToBodyStream`, `startServer`, `createHtmlDocument`).

No meta-framework coupling — SSR is a plain function you call from any server (Express,
Hono, a worker, or [`@fluixi/start`](../start)).

## 📦 Installation

```ini
# .npmrc
@fluixi:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```sh
pnpm add @fluixi/server
```

## 🚀 Usage

```ts
import { startServer } from '@fluixi/server';
import App from './app';

const { render, page, renderAsync, stream } = startServer(App);
// express: res.send(page(req.url))
```

### Async data (Suspense / resources)

`renderRequestAsync` (and `startServer().renderAsync`) await data loaders before
serializing, then emit a `window.__FX_DATA__` script so the client seeds resources
without refetching:

```ts
import { renderRequestAsync } from '@fluixi/server';
const html = await renderRequestAsync(App, { url });
```

### Streaming

```ts
import { renderToBodyStream } from '@fluixi/server';
// a web ReadableStream of the app body — the host owns the surrounding document
export const renderStream = (url) => renderToBodyStream(App, { url });
```

### Request-scoped data + redaction

```ts
import { getRequestEvent, setDataRedactor } from '@fluixi/server';

// inside a component / loader:
getRequestEvent()?.request; // the web Request (headers, cookies, …)

// strip server-only fields from __FX_DATA__ before they reach the page:
setDataRedactor((v) => (v?.passwordHash ? { ...v, passwordHash: undefined } : v));
```

## 📄 License

[MIT](./LICENSE) © [Fluixi](https://fluixi.dev)
