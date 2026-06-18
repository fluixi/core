# @fluixi/start

The Fluixi meta-framework — `dev`, `build`, and production `start` over
[`@fluixi/server`](../server) + Vite, so apps stop hand-rolling a `server.mjs`.

> Status: **walking skeleton.** All three commands are wired end-to-end but thin;
> each will be fleshed out (streaming, deploy adapters, TS config loading, asset
> hashing, …) in later increments.

This package is the **runtime** (programmatic `dev`/`build`/`start` + config). The
`fluixi` command-line tool lives in **[@fluixi/cli](../cli)** and delegates here:

```bash
fluixi dev      # SSR dev server (Vite middleware + HMR)
fluixi build    # client + server bundles → dist/client, dist/server
fluixi start    # production SSR server (after build)
```

## Conventions

| Default | Config key |
| --- | --- |
| `src/entry-server.ts` exporting `render(url): string \| Promise<string>` | `serverEntry` |
| `src/entry-client.ts` (hydration) | `clientEntry` |
| `index.html` with `<div id="root"></div>` | `template` / `mountId` |
| port `3000` | `port` |

## Config

`fluixi.config.mjs` (TS config loading is a follow-up):

```js
import { defineConfig } from '@fluixi/start/config';

export default defineConfig({
  port: 3010,
  ssrNoExternal: ['@medusajs/js-sdk'],
});
```

## Programmatic

```js
import { dev, build, start } from '@fluixi/start';
await dev({ port: 3010 });
```
