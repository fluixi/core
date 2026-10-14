# Fluixi app

Scaffolded with `npm create fluixi`. Client-rendered with file-based routing, via
[`@fluixi/start`](https://www.npmjs.com/package/@fluixi/start) (`ssr: false` in `fluixi.config.ts`).

This variant is authored with `` html`` `` templates (no JSX), so the sources are plain
`.ts` files and `tsconfig.json` doesn't configure `jsx`. `@fluixi/ts-plugin` gives the
templates full TypeScript support (hover, completion, type-checking) in your editor.

```bash
pnpm install
pnpm dev      # dev server (HMR)
pnpm build    # production build
pnpm start    # serve the production build
```

- Routes live in `src/routes/` (file-based).
- `src/app.ts` is the shell layout; `src/entry-{server,client}.ts` are the SSR/hydration entries.
- Config in `fluixi.config.ts`; `ssr: true` there renders on the server instead.
