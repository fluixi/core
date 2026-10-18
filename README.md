<div align="center">
  <a href="https://fluixi.dev" target="_blank" rel="noreferrer">
    <img src="https://raw.githubusercontent.com/fluixi/assets/main/logos/512x512.png" alt="Fluixi" width="128" height="128" />
  </a>

  <h1>Fluixi Core</h1>

  <p><strong>A compiler-native reactive framework: the compiler knows what's reactive, so you write ordinary TypeScript.</strong></p>

  <p>
    <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-22c55e.svg" /></a>
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white" />
    <img alt="Registry" src="https://img.shields.io/badge/registry-npm-cb3837?logo=npm&logoColor=white" />
    <img alt="Monorepo" src="https://img.shields.io/badge/monorepo-Nx%20%2B%20pnpm-blue" />
    <img alt="Reactivity" src="https://img.shields.io/badge/reactivity-fine--grained-ec4899" />
  </p>
</div>

---

## ✨ Overview

**Fluixi Core** is the engine behind **Fluixi**. Its compiler understands reactive values
as values, resolved by the binding they came from, not by how the name reads, and
carries that through JSX and `` html`` `` templates, the DOM it generates, SSR, hydration
and routing as one model. Everything is split into small, independently-publishable
packages, so you can take the reactivity core alone or the whole framework.

```ts
import { signal, effect } from '@fluixi/reactive/signal';

const count = signal(0);
effect(() => console.log('count is', count())); // re-runs on every change
count.set((c) => c + 1);                        // → "count is 1"
```

Inside a compiled app, `$signal` is the same primitive without the import.

## 🧩 Packages

**Foundation & rendering**

| Package | Description |
| --- | --- |
| [`@fluixi/utils`](packages/utils) | Zero-dependency, strongly-typed utilities: primitives, objects, maths, arrays, color, DOM. |
| [`@fluixi/reactive`](packages/reactive) | Fine-grained reactivity: signals, memos, effects, stores, and an RxJS-style observable layer. |
| [`@fluixi/dom`](packages/dom) | Reactive DOM runtime: control-flow, hydration, and the universal SSR string renderer. |
| [`@fluixi/template-parser`](packages/template-parser) | The `` html`` `` template parser, standalone. |

**JSX & compiler**

| Package | Description |
| --- | --- |
| [`@fluixi/jsx`](packages/jsx) | JSX runtime (`jsx` / `jsxs` / `Fragment`) + the `jsxImportSource` for Fluixi JSX. |
| [`@fluixi/babel-plugin-jsx`](packages/babel) | Babel plugin that compiles JSX into fine-grained reactive DOM calls. |
| [`@fluixi/compiler`](packages/compiler) | The JSX compiler: host-agnostic IR, codegen backends, and the `"use server"` transform. |
| [`@fluixi/vite-plugin`](packages/vite-plugin) | The Vite plugin: JSX transform + codegen backend selection. |

**Framework**

| Package | Description |
| --- | --- |
| [`@fluixi/core`](packages/core) | The framework: components, lifecycle, control flow, context, router (`router`), client/server entries. |
| [`@fluixi/router`](packages/router) | Framework-agnostic router core: URL → match tree + navigation (no DOM/reactivity). |
| [`@fluixi/server`](packages/server) | Server-side rendering: request-scoped, streaming, hydration transport. |

**Meta-framework & tooling**

| Package | Description |
| --- | --- |
| [`@fluixi/start`](packages/start) | The meta-framework: zero-config dev/build/start with SSR, file routing, middleware, server functions. |
| [`@fluixi/cli`](packages/cli) | The `fluixi` CLI: dev/build/start + `fluixi generate`. |
| [`create-fluixi`](packages/create) | App scaffolder: `npm create fluixi <dir>` (SSR or SPA). |
| [`@fluixi/ts-plugin`](packages/ts-plugin) | Editor support for `` html`` `` templates: hover, completion, type-checking. |
| [`@fluixi/head`](packages/head) | Document head and SEO. |
| [`@fluixi/auth`](packages/auth) · [`@fluixi/session`](packages/session) | Auth bindings and sessions. |
| [`@fluixi/testing`](packages/testing) · [`@fluixi/devtools`](packages/devtools) | Test helpers and the reactive-graph devtools. |

> The component library lives in the separate
> [**fluixi-ui**](https://github.com/fluixi/ui) repo, published as `@fluixi-ui/*`.

### Architecture

```
@fluixi/utils ─► @fluixi/reactive ─► @fluixi/dom
                                          │
@fluixi/template-parser ─► @fluixi/compiler ◄──┐      @fluixi/router
                                 ▲             │           │
        @fluixi/jsx ─────────────┴ @fluixi/vite-plugin      ▼
              └──────────────────────────────► fluixi ─► @fluixi/server
                                                     │              │
                                                     └──► @fluixi/start ─► @fluixi/cli ─► create-fluixi
```

## 🚀 Quick start

All `@fluixi/*` packages are on **public npm**: no registry configuration, no token.

```sh
pnpm add @fluixi/core    # the full framework
# …or just the reactivity core
pnpm add @fluixi/reactive
```

### Or scaffold a full-stack app

```sh
npm create fluixi my-app   # SSR (file routing + hydration) or SPA — prompted
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

On merge, CI opens a **Version Packages** PR. Merging that PR builds and publishes the affected packages to npm.

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
