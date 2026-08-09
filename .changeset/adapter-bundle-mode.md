---
"@fluixi/start": minor
---

Adapters now decide how the server is bundled, not just how it is served.

`dist/server` was always one self-contained file: every `@fluixi/*` package was
copied into it. That is right for edge and serverless, where there is nothing to
resolve against at runtime, and wasteful for a Node server, which runs from the
app directory with the dependencies already installed next to it.

`Adapter` gains a `bundle` mode — `'external'` on `nodeAdapter`, `'inline'` on
`webAdapter` — and `fluixi build` follows the adapter named in
`fluixi.config.ts`:

```ts
import { defineConfig } from '@fluixi/start/config';
import { nodeAdapter } from '@fluixi/start/adapter';

export default defineConfig({ adapter: nodeAdapter });
```

On `examples/start-app` that is `entry-server.js` at 4.6 KB instead of 76 KB — the
app's own code and nothing else — and a build of 0.8 s instead of 1.9 s, for
byte-identical HTML. `fluixi start` serves with the configured adapter too; one
that returns `{ fetch }` has no process to run and now says so rather than
exiting as if it had started.

Nothing changes for an app that names no adapter — Vite's own heuristic still
applies. `'external'` externalizes only the `@fluixi/*` packages the app itself
declares as dependencies: under a strict `node_modules` layout an undeclared
package is not resolvable from the app root, so externalizing a merely transitive
one would emit an import Node cannot follow. Each package is listed with every
subpath its `exports` map publishes, because Vite only honours an exact id in
`ssr.external` — a bare package name leaves deep imports bundled, and
`@fluixi/core` external next to `@fluixi/core/router-next` inlined is two routers
with two sets of module state in one server. `ssrNoExternal` still wins.

Adapters are also importable from `@fluixi/start/adapter`, so a config file can
name one without pulling in the CLI commands.
