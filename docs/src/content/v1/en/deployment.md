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

`fluixi start` serves with that adapter too — with `webAdapter` it has nothing to run, and
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
installed — copying the framework into the bundle only makes the build slower. On the
`examples/start-app` app that is `dist/server/entry-server.js` at **4.6 KB instead of
76 KB** — the app's own code and nothing else — with the whole build dropping from 1.9 s to
0.8 s. The rendered HTML is byte-identical either way.

An edge or serverless runtime is the opposite case: you upload a file, not an install, so
nothing may be left to resolve — `'inline'` puts everything in the bundle.

`'external'` externalizes the `@fluixi/*` packages **your app declares as dependencies**,
and nothing else. Under a strict `node_modules` layout (pnpm) a package you never declared
is not resolvable from your app root, so externalizing one would produce a bundle importing
something Node cannot find. Each package is listed with every subpath it exports, because
half-externalizing one — `@fluixi/core` an import, `@fluixi/core/router-next` copied into the
bundle — would put two routers with two sets of module state in the same server.
`ssrNoExternal` still wins over all of this — it is the app saying "bundle this one anyway".

> Only the build reads `bundle`. Dev never externalizes: `fluixi dev` loads server modules
> through Vite so that editing them still triggers HMR.

## Writing an adapter

An adapter is a name, a serve function, and optionally the bundle mode its platform needs:

```ts
import type { Adapter } from '@fluixi/start';

export const myAdapter: Adapter = {
  name: 'my-platform',
  bundle: 'inline',
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

> Adapters cover **serving** and how the server is bundled. Emitting platform artifacts — a
> worker entry, a function manifest, a platform config file — is not implemented yet, so
> targeting a platform that requires a specific output layout still means arranging that
> yourself.

## What to deploy

| Path | What it is | Needed at runtime |
| --- | --- | --- |
| `dist/client` | assets, prerendered HTML | yes — by the server or a CDN |
| `dist/server` | the fetch handler | only for SSR |

A fully prerendered site needs `dist/client` alone. With an `'external'` build, `dist/server`
is not enough on its own — ship `package.json` and install dependencies where it runs.

## Before you deploy

- **`prerender` requires `ssr: true`.** Prerendering is server rendering moved to build
  time; with SSR off there is nothing to render with.
- **Middleware does not run for prerendered pages.** They are files. A per-request check —
  auth, geolocation — has to live somewhere that actually runs per request.
- **Check the version stamps.** The mount element carries `fluixi`, `fx-dom` and
  `fx-reactive`, and `window.Fluixi` reports the same. If they disagree in a deployed
  build, the install resolved two copies — worth catching before it becomes a bug report.

Next: **[Dependency injection](/v1/en/dependency-injection)**.
