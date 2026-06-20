# Fluixi app

Scaffolded with `npm create @fluixi`. SSR + file-based routing + hydration via
[`@fluixi/start`](https://www.npmjs.com/package/@fluixi/start).

```bash
pnpm install
pnpm dev      # dev server (SSR + HMR)
pnpm build    # production build
pnpm start    # serve the production build
```

- Routes live in `src/routes/` (file-based).
- `src/app.tsx` is the shell layout; `src/entry-{server,client}.{ts,tsx}` are the SSR/hydration entries.
- Config in `fluixi.config.ts`.
