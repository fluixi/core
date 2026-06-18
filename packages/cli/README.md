# @fluixi/cli

The `fluixi` command-line tool. A thin dispatcher over [`@fluixi/start`](../start)
(the framework runtime); scaffolding (`fluixi create`) and generators land later.

```bash
fluixi dev      # SSR dev server (Vite middleware + HMR)
fluixi build    # client + server bundles → dist/client, dist/server
fluixi start    # production SSR server (after build)
```

Install it as a dev dependency of your app:

```bash
pnpm add -D @fluixi/cli
```

The actual dev/build/start logic + config live in **@fluixi/start** — see its README
for conventions (`src/entry-server.ts`, `index.html` with `<div id="root">`, etc.).
