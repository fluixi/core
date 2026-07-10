<p align="center">
  <img src="https://raw.githubusercontent.com/fluixi/assets/main/logos/128x128.png" alt="Fluixi" width="120" height="120" />
</p>

# @fluixi/cli

**The `fluixi` command-line tool — dev / build / start + code generators.**

[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](./LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![Registry](https://img.shields.io/badge/registry-GitHub%20Packages-181717?logo=github)

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

```ini
# .npmrc
@fluixi:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```sh
pnpm add -D @fluixi/cli
```

## 🧱 generate

```bash
fluixi g component Button       # → src/components/Button.tsx
fluixi g route about            # → src/routes/about.tsx        (file route)
fluixi g route "blog/[id]"      # → src/routes/blog/[id].tsx    (dynamic segment)
fluixi g middleware             # → src/middleware.ts
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
