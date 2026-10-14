# Fluixi app

Scaffolded with `npm create fluixi`. Client-rendered with file-based routing, via
[`@fluixi/start`](https://www.npmjs.com/package/@fluixi/start) (`ssr: false` in `fluixi.config.ts`).

```bash
pnpm install
pnpm dev      # dev server (HMR)
pnpm build    # production build
pnpm start    # serve the production build
```

- Routes live in `src/routes/` (file-based).
- `src/app.tsx` is the shell layout; `src/entry-client.tsx` renders it in the browser. `src/entry-server.ts`
  serves the page shell and runs server functions and middleware.
- Config in `fluixi.config.ts`; `ssr: true` there renders on the server instead.
