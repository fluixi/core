<p align="center">
  <img src="https://raw.githubusercontent.com/fluixi/assets/main/logos/128x128.png" alt="Fluixi" width="120" height="120" />
</p>

# @fluixi/cli

**The `fluixi` command-line tool — dev / build / start + code generators.**

[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](./LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
[![npm](https://img.shields.io/npm/v/@fluixi/cli?logo=npm)](https://www.npmjs.com/package/@fluixi/cli)

---

## ✨ Overview

`@fluixi/cli` provides the `fluixi` binary — a thin dispatcher over
[`@fluixi/start`](../start) (the framework runtime) plus generators. A scaffolded app
already includes it.

```bash
fluixi dev                    # SSR dev server (Vite middleware + HMR)
fluixi build                  # client + server bundles → dist/client, dist/server
fluixi start                  # production SSR server (after build)
fluixi generate <kind> <name> # scaffold into the current app (alias: g)
```

## 📦 Installation

```sh
pnpm add -D @fluixi/cli
```

## 🧱 generate

```bash
fluixi g component Button       # → src/components/Button.tsx
fluixi g route about            # → src/routes/about.tsx        (file route)
fluixi g route "blog/[id]"      # → src/routes/blog/[id].tsx    (dynamic segment)
fluixi g middleware             # → src/middleware.ts
fluixi g auth                   # → auth.config + auth.client + middleware + /api/auth route
```

It only ever creates files. Nothing existing is edited, and a name that already exists
stops with an error instead of overwriting.

### JSX or html``

The extension follows the project: an app whose `tsconfig.json` configures `jsx` gets
`.tsx`, one authored with `` html`` `` templates gets `.ts`. Override with `--jsx` or
`--html`.

```bash
fluixi g component Button --html   # → src/components/Button.ts
```

### Using a component without importing it

After generating a component, the CLI prints how to make the tag resolve with no import,
if the project has no rule for it yet:

```
✓ created src/components/Card.tsx
to use <Card /> without importing it, add to vite.config.ts:
  resolve: [{ match: /^([A-Z]\w+)$/, module: '/src/components/$1.tsx' }]
```

One pattern covers the whole folder, so you paste it once and every component after that
works. Apps scaffolded with `npm create fluixi` already have it.

The CLI reads your config to decide whether to say this, and never writes to it. A config
is ordinary TypeScript — it can spread a shared object or call a resolver function — so
editing it would mean reprinting your file, and I'd rather print a line you paste than
risk mangling it.

Importing the component works too, including with a `load:` directive:

```tsx
import { Card } from './components/Card';

<Card load:visible="200px" />   // still splits into its own chunk
```

## 🆕 New project

Scaffolding a whole app is [`create-fluixi`](../create), not the CLI:

```bash
npm create fluixi my-app      # or: pnpm create fluixi my-app
```

The dev/build/start logic + config live in [`@fluixi/start`](../start) — see its README
for conventions (`src/entry-server.ts`, `src/routes/`, `index.html`, `fluixi.config.ts`).

## 📄 License

[MIT](./LICENSE) © [Fluixi](https://fluixi.dev)
