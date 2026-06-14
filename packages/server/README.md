# @fluixi/server

Server-side rendering for Fluixi. The universal string renderer lives in
`@fluixi/dom` (`renderToString` + request-scoping); this package is the Node-side
home that makes it concurrency-safe and ergonomic:

- injects an `AsyncLocalStorage` into `@fluixi/dom`'s request store so concurrent
  SSR requests are isolated (`@fluixi/dom` stays browser-safe by never importing
  `node:async_hooks` itself);
- re-exports the SSR surface (`renderToString`, `getRequestEvent`, the request
  context primitives);
- adds request helpers (`renderRequest`, `renderRequestToPage`, `startServer`,
  `createHtmlDocument`).

No meta-framework coupling — SSR is a plain function you call from any server
(Express, Hono, Nitro, a worker).

```ts
import { startServer } from '@fluixi/server';
import App from './app';

const { render, page } = startServer(App);
// express: res.send(page(req.url))
```

For request-scoped data (headers/cookies), render with an explicit event:

```ts
import { renderToString, getRequestEvent } from '@fluixi/server';

const html = renderToString(() => App(), { event: { url, headers } });
// inside the app: getRequestEvent()?.headers
```
