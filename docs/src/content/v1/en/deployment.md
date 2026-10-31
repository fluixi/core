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
`dist/client` as HTML. Upload that directory anywhere, there is no server to run.

**A Node server.** `fluixi start` runs the node adapter: it listens on a port and serves
`dist/client` from disk, falling through to the handler for anything not found. This is the
default and needs no configuration.

The port is the first of these that is set: `--port` (`fluixi start --port=8080`), the `PORT`
variable most hosts provide, `port` in `fluixi.config.ts`, then 3000. `fluixi dev` reads them
the same way.

**An edge or serverless runtime.** Those platforms do not want a listening process; they
want a module exporting `fetch`. That is what the web adapter returns:

```ts
import { createProdHandler, webAdapter } from '@fluixi/start';

const handler = await createProdHandler(/* ... */);

export default webAdapter.serve({ handler, cfg, clientDir });
// → { fetch: (request) => Promise<Response> }
```

The platform serves the static assets itself, usually from its CDN, so the adapter only has
to hand over the handler.

## Naming the target

Declaring the adapter in `fluixi.config.ts` is what tells the **build** where the app is
going:

```ts
import { defineConfig } from '@fluixi/start/config';
import { nodeAdapter } from '@fluixi/start/adapter';

export default defineConfig({
  adapter: nodeAdapter,
});
```

`fluixi start` serves with that adapter too, with `webAdapter` it has nothing to run, and
says so instead of pretending to have started.

## How the server gets bundled

The two targets want opposite things from `dist/server`, so the adapter carries a `bundle`
mode and `fluixi build` follows it:

| `bundle` | `dist/server` | needs `node_modules` at runtime |
| --- | --- | --- |
| `'external'` (node) | your app plus `import '@fluixi/core'` | yes |
| `'inline'` (web) | one self-contained file | no |
| unset (no adapter) | Vite's own heuristic | usually |

A long-running Node process runs from the app directory, where the dependencies are already
installed, copying the framework into the bundle only makes the build slower. On the
`examples/start-app` app that is `dist/server/entry-server.js` at **4.6 KB instead of
76 KB**, the app's own code and nothing else, with the whole build dropping from 1.9 s to
0.8 s. The rendered HTML is byte-identical either way.

An edge or serverless runtime is the opposite case: you upload a file, not an install, so
nothing may be left to resolve, `'inline'` puts everything in the bundle.

`'external'` externalizes the `@fluixi/*` packages **your app declares as dependencies**,
and nothing else. Under a strict `node_modules` layout (pnpm) a package you never declared
is not resolvable from your app root, so externalizing one would produce a bundle importing
something Node cannot find. Each package is listed with every subpath it exports, because
half-externalizing one, `@fluixi/core` an import, `@fluixi/core/router` copied into the
bundle, would put two routers with two sets of module state in the same server.
`ssrNoExternal` still wins over all of this, it is the app saying "bundle this one anyway".

> Only the build reads `bundle`. Dev never externalizes: `fluixi dev` loads server modules
> through Vite so that editing them still triggers HMR.

## When a request fails

An error thrown by a page, a server function or a middleware is logged on the server. The
visitor gets a 500 with a plain page, or a short text when the request was not for a page;
never the stack, which names files and hosts and can carry a secret. `fluixi dev` keeps showing
the stack.

To give the page your own look, put it at `public/error.html`: the build copies it with the
other public files and the Node server answers with it. A platform without a filesystem (a
worker) serves the plain page.

## One copy of a package

`fluixi dev` and `fluixi build` resolve the framework's own packages once, from the app's root,
so a library installed with its own copy of `@fluixi/core` still shares the app's. A library
of yours that holds a context needs the same, when an install can give it two copies (a linked
checkout, two versions of a peer under it): list it in `dedupe`.

```ts
export default defineConfig({
  dedupe: ['@fluixi-ui/theme'],
});
```

Two copies of a theme provider means a menu reading one while the page wrote the other: the
read fails as if the provider were missing.

## Code loaded at run time

A deployment may load code the app was not built with: plugins mounted into the container,
say. That code imports `@fluixi/core` by name, and it has to get the app's copy, or it drives
a second reactive runtime, a second injector and a second element registry. `share` lists the
modules the app hands it, each as the code imports it, a subpath on its own line:

```ts
export default defineConfig({
  adapter: nodeAdapter,
  share: ['@fluixi/core', '@fluixi/reactive/signal', '@fluixi/di', '@acme/sdk/view'],
});
```

- **In the browser**, each module becomes its own chunk with all its exports, and an import
  map names it: first in the document's `<head>`, and in `dist/client/share.json` for a page
  the app does not render itself.
- **On the server**, the packages stay external, so a file imported from inside the app
  directory resolves them from its `node_modules`, the same copies the app runs. That needs
  `'external'` bundling: `share` with the web adapter, or with no adapter, is refused at build.

A shared module is kept whole, since the app cannot know which exports the loaded code will
use. A plain Vite app gets the browser half from `share()` in `@fluixi/vite-plugin`.

## The hosted platforms

Three adapters emit the layout their platform reads. Each inlines the framework and
returns a `fetch` handler; what differs is where the entry goes and what declares the
routing.

```ts
import { cloudflareAdapter } from '@fluixi/start/adapter';
// or netlifyAdapter, vercelAdapter

export default defineConfig({ adapter: cloudflareAdapter });
```

| | what `fluixi build` writes | what you deploy |
| --- | --- | --- |
| `cloudflareAdapter` | `dist/client/_worker.js` + `_routes.json` | publish `dist/client` |
| `netlifyAdapter` | `.netlify/functions-internal/fluixi-server.mjs` | publish `dist/client` |
| `vercelAdapter` | `.vercel/output/` (Build Output API v3) | nothing, Vercel reads it directly |

Each one serves static files first and only reaches the server for a miss: Cloudflare
through the `ASSETS` binding, Netlify through `preferStatic`, Vercel through a
`filesystem` route ahead of the function. A prerendered page is a file, so it stays one.

The entry is generated and bundled into a single file, no chunks. On Cloudflare that
is not a size choice: the worker is written into the directory you publish, so a split
chunk would be a publicly downloadable piece of your server.

An app with no server entry (a fully prerendered SPA) gets the static output alone,
which is not a failure, there is nothing to wrap.

## Writing an adapter

An adapter is a name, a serve function, and optionally the bundle mode its platform needs:

```ts
import type { Adapter } from '@fluixi/start';

export const myAdapter: Adapter = {
  name: 'my-platform',
  bundle: 'inline',
  serve({ handler, cfg, clientDir }) {
    // Either take over the process, listen, block, never return,
    // or return { fetch } for the platform to invoke.
    return { fetch: handler };
  },
};
```

`serve` receives the handler, the resolved config and the built client directory. A
filesystem runtime uses `clientDir` to serve assets; an edge runtime ignores it because the
platform already does.

An adapter can also emit the platform's output layout, through an optional `build`
hook that runs after the client build, the server build and prerendering:

```ts
export const myAdapter: Adapter = {
  name: 'my-platform',
  bundle: 'inline',
  serve: ({ handler }) => ({ fetch: handler }),
  async build({ clientDir, bundleEntry }) {
    await bundleEntry(myEntrySource, `${clientDir}/_worker.js`);
  },
};
```

`bundleEntry` inlines the server bundle and the HTML template into one file. Both have
to be inlined rather than read: `createProdHandler` reads `index.html` off disk and
imports the server entry by path, which is exactly what a worker cannot do, so the
generated entry imports them statically and calls `createHandlerFrom` instead. Same
handler, same dispatch order, no filesystem.

## What to deploy

| Path | What it is | Needed at runtime |
| --- | --- | --- |
| `dist/client` | assets, prerendered HTML | yes, by the server or a CDN |
| `dist/server` | the fetch handler | only for SSR |

A fully prerendered site needs `dist/client` alone. With an `'external'` build, `dist/server`
is not enough on its own, ship `package.json` and install dependencies where it runs.

## An API next to a web app

An [API-only app](/v1/en/api-routes#an-api-only-app) builds and starts like any other:
`fluixi build`, then `fluixi start` (or the adapter's entry). It has no `dist/client` to serve.

Deploy the two as separate services and let the web app forward `/api` to the API with
`forward({ to: process.env.API_URL })`. The browser then talks to one origin: no CORS, and the
API's session cookie stays first-party. The API trusts one hop of `x-forwarded-for`, so its rate
limits count the visitor, not the web server. If the browser calls the API directly instead,
list the web app's origin in `apiSecurity({ origins })`.

## Before you deploy

- **`prerender` requires `ssr: true`.** Prerendering is server rendering moved to build
  time; with SSR off there is nothing to render with.
- **Middleware does not run for prerendered pages.** They are files. A per-request check,
  auth, geolocation, has to live somewhere that actually runs per request.
- **Check the version stamps.** The mount element carries `fluixi`, `fx-dom` and
  `fx-reactive`, and `window.Fluixi` reports the same. If they disagree in a deployed
  build, the install resolved two copies, worth catching before it becomes a bug report.
  `@fluixi/start` resolves the framework packages once, from the app's root, so a library
  that installs its own copy still runs on the app's.

Next: **[Dependency injection](/v1/en/dependency-injection)**.
