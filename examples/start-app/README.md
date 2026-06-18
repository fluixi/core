# @fluixi/example-start

Smallest end-to-end app on the **`@fluixi/start`** meta-framework + the **`fluixi`**
CLI. No hand-rolled `server.mjs`, no kettlejs plugins in `vite.config` — `@fluixi/start`
provides file routing + JSX/SSR.

```bash
pnpm dev      # → http://localhost:3100  (SSR dev server + HMR)
pnpm build    # → dist/client + dist/server
pnpm start    # production SSR server
```

Layout:

```
index.html              <div id="root">  +  entry-client
fluixi.config.mjs       { port: 3100 }
vite.config.ts          resolve.conditions only (workspace source) — NO plugins
src/
  app.tsx               <Router> + <Suspense><Outlet/></Suspense> shell
  entry-server.ts       export render(url) = renderRequestAsync(App, { url })
  entry-client.tsx      startClient(App)
  routes/
    index.tsx           "/"  (data-gated → tests async SSR)
    about.tsx           "/about"
```
