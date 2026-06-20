<div align="center">
  <a href="https://fluixi.dev" target="_blank" rel="noreferrer">
    <img src="https://raw.githubusercontent.com/fluixi/assets/main/logos/512x512.png" alt="Fluixi" width="128" height="128" />
  </a>

  <h1>Fluixi Core</h1>

  <p><strong>A Solid-compatible, fine-grained reactive UI framework — signals, JSX, web components, and SSR.</strong></p>

  <p>
    <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-22c55e.svg" /></a>
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white" />
    <img alt="Registry" src="https://img.shields.io/badge/registry-GitHub%20Packages-181717?logo=github" />
    <img alt="Monorepo" src="https://img.shields.io/badge/monorepo-Nx%20%2B%20pnpm-blue" />
    <img alt="Reactivity" src="https://img.shields.io/badge/reactivity-fine--grained-ec4899" />
  </p>
</div>

---

## ✨ Overview

**Fluixi Core** is the engine behind **Fluixi** — a fine-grained reactive UI framework with a Solid-compatible signal model. It is split into small, focused, independently-publishable packages so you can adopt only what you need: the reactivity core, the DOM renderer, the JSX runtime, web-component bindings, or the full framework with routing and SSR.

```ts
import { createSignal, createEffect } from '@fluixi/reactive/signal';

const [count, setCount] = createSignal(0);
createEffect(() => console.log('count is', count())); // re-runs on every change
setCount((c) => c + 1);                                // → "count is 1"
```

## 🧩 Packages

**Foundation & rendering**

| Package | Description |
| --- | --- |
| [`@fluixi/utils`](packages/utils) | Zero-dependency, strongly-typed utilities — primitives, objects, maths, arrays, color, DOM. |
| [`@fluixi/reactive`](packages/reactive) | Fine-grained reactivity — signals, memos, effects, stores, and an RxJS-style observable layer. |
| [`@fluixi/dom`](packages/dom) | Reactive DOM runtime — control-flow, hydration, and the universal SSR string renderer. |
| [`@fluixi/lit`](packages/lit) | Optional lit-html renderer — `html` templates, directives, lit control flow. |

**JSX & compiler**

| Package | Description |
| --- | --- |
| [`@fluixi/jsx`](packages/jsx) | JSX runtime (`jsx` / `jsxs` / `Fragment`) + the `jsxImportSource` for Fluixi JSX. |
| [`@fluixi/babel-plugin-jsx`](packages/babel) | Babel plugin that compiles JSX into fine-grained reactive DOM calls. |
| [`@fluixi/compiler`](packages/compiler) | The JSX compiler — host-agnostic IR, codegen backends, and the `"use server"` transform. |
| [`@fluixi/vite-plugin`](packages/vite-plugin) | The Vite plugin — JSX transform + codegen backend selection. |

**Framework**

| Package | Description |
| --- | --- |
| [`@fluixi/core`](packages/core) | The framework — components, lifecycle, control flow, context, router (`router-next`), client/server entries. |
| [`@fluixi/router`](packages/router) | Framework-agnostic router core — URL → match tree + navigation (no DOM/reactivity). |
| [`@fluixi/server`](packages/server) | Server-side rendering — request-scoped, streaming, hydration transport. |

**Meta-framework & tooling**

| Package | Description |
| --- | --- |
| [`@fluixi/start`](packages/start) | The meta-framework — zero-config dev/build/start with SSR, file routing, middleware, server functions. |
| [`@fluixi/cli`](packages/cli) | The `fluixi` CLI — dev/build/start + `fluixi generate`. |
| [`@fluixi/create`](packages/create) | App scaffolder — `npm create @fluixi <dir>` (SSR or SPA). |

> Web components (`@fluixi/element`) and the `@fluixi/ui-*` component library live in the
> separate [**wc-element**](https://github.com/fluixi/wc-element) repo.

### Architecture

```
@fluixi/utils ─► @fluixi/reactive ─► @fluixi/dom ─┬─► @fluixi/lit
                                                  │
@fluixi/babel-plugin-jsx ─► @fluixi/compiler ◄────┤   @fluixi/router
              │                    ▲              │        │
              └─► @fluixi/jsx      └ @fluixi/vite-plugin    ▼
                       └──────────────────────────► @fluixi/core ─► @fluixi/server
                                                          │              │
                                                          └──► @fluixi/start ─► @fluixi/cli ─► @fluixi/create
```

## 🚀 Quick start

> All `@fluixi/*` packages are published to **GitHub Packages**, which requires authentication even for public packages.

**1.** Add the registry to your project's `.npmrc` (or `~/.npmrc`):

```ini
@fluixi:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

**2.** Export a GitHub token with the `read:packages` scope:

```sh
export NODE_AUTH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

**3.** Install what you need:

```sh
pnpm add @fluixi/core    # the full framework
# …or just the reactivity core
pnpm add @fluixi/reactive
```

### Or scaffold a full-stack app

```sh
npm create @fluixi my-app   # SSR (file routing + hydration) or SPA — prompted
cd my-app && pnpm install && pnpm dev
```

## 🛠️ Local development

This is an [Nx](https://nx.dev) + [pnpm](https://pnpm.io) workspace.

```sh
pnpm install                     # install dependencies
pnpm nx run-many -t build        # build every package (dependency-ordered)
pnpm nx run-many -t test         # run unit tests (Vitest)
pnpm nx run-many -t typecheck    # type-check every package
```

Scope to a single package with `pnpm nx <target> @fluixi/<name>`, or to changed code only with `pnpm nx affected -t <target>`.

## 📦 Releasing

Versioning and publishing are automated with [Changesets](https://github.com/changesets/changesets):

```sh
pnpm changeset                   # describe your change (patch / minor / major)
git commit -am "feat: …" && git push
```

On merge to `main`, CI opens a **Version Packages** PR. Merging that PR builds and publishes the affected packages to GitHub Packages.

## 📋 Requirements

| Tool | Version |
| --- | --- |
| **Node.js** | ≥ 20 (CI uses 22) |
| **pnpm** | ≥ 10 |
| **TypeScript** | ≥ 5.8 |

## 🤝 Contributing

1. Fork & clone, then run `pnpm install`.
2. Create a branch and make your change **with tests**.
3. Run `pnpm nx affected -t build test typecheck`.
4. Add a changeset: `pnpm changeset`.
5. Open a pull request.

## 📄 License

[MIT](./LICENSE) © [Fluixi](https://fluixi.dev)
