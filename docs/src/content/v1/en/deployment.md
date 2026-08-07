# Deployment

A built Fluixi app is a **runtime-neutral fetch handler**: `(Request) => Promise<Response>`.
Everything platform-specific is an adapter around that one function.

```
fluixi build     →  dist/client  (assets, prerendered pages)
                    dist/server  (the handler)
fluixi start     →  serves it with the node adapter
```

## The three shapes

**A static site.** With [`prerender`](/v1/en/static-generation) every route is written to
`dist/client` as HTML. Upload that directory anywhere — there is no server to run.

**A Node server.** `fluixi start` runs the node adapter: it listens on a port and serves
`dist/client` from disk, falling through to the handler for anything not found. This is the
default and needs no configuration.

**An edge or serverless runtime.** Those platforms do not want a listening process; they
want a module exporting `fetch`. That is what the web adapter returns:

```ts
import { createProdHandler, webAdapter } from '@fluixi/start';

const handler = await createProdHandler(/* … */);

export default webAdapter.serve({ handler, cfg, clientDir });
// → { fetch: (request) => Promise<Response> }
```

The platform serves the static assets itself, usually from its CDN, so the adapter only has
to hand over the handler.

## Writing an adapter

An adapter is two fields:

```ts
import type { Adapter } from '@fluixi/start';

export const myAdapter: Adapter = {
  name: 'my-platform',
  serve({ handler, cfg, clientDir }) {
    // Either take over the process — listen, block, never return —
    // or return { fetch } for the platform to invoke.
    return { fetch: handler };
  },
};
```

`serve` receives the handler, the resolved config and the built client directory. A
filesystem runtime uses `clientDir` to serve assets; an edge runtime ignores it because the
platform already does.

> Adapters currently cover **serving**. Build-time artifact emission — a worker bundle, a
> function manifest, a platform config file — is not implemented yet, so targeting a
> platform that requires a specific output layout still means arranging that yourself.

## What to deploy

| Path | What it is | Needed at runtime |
| --- | --- | --- |
| `dist/client` | assets, prerendered HTML | yes — by the server or a CDN |
| `dist/server` | the fetch handler | only for SSR |

A fully prerendered site needs `dist/client` alone.

## Before you deploy

- **`prerender` requires `ssr: true`.** Prerendering is server rendering moved to build
  time; with SSR off there is nothing to render with.
- **Middleware does not run for prerendered pages.** They are files. A per-request check —
  auth, geolocation — has to live somewhere that actually runs per request.
- **Check the version stamps.** The mount element carries `fluixi`, `fx-dom` and
  `fx-reactive`, and `window.Fluixi` reports the same. If they disagree in a deployed
  build, the install resolved two copies — worth catching before it becomes a bug report.

Next: **[Dependency injection](/v1/en/dependency-injection)**.
