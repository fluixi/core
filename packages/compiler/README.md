<p align="center">
  <img src="https://raw.githubusercontent.com/fluixi/assets/main/logos/128x128.png" alt="Fluixi" width="120" height="120" />
</p>

# @fluixi/compiler

**The Fluixi JSX compiler — host-agnostic IR + pluggable codegen backends.**

[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](./LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![Registry](https://img.shields.io/badge/registry-GitHub%20Packages-181717?logo=github)

---

## ✨ Overview

`@fluixi/compiler` turns Fluixi JSX into fine-grained reactive output. A **Babel
front-end** parses source into a host-agnostic IR; a **codegen backend** emits the result:

- **`imperative`** (default) — compiles straight into [`@fluixi/dom`](../dom) runtime
  calls (`createNativeElement`/`spread`/`insert`/`createComponent`/…). No VDOM.
- **`jsx`** — emits the automatic runtime `jsx()`/`jsxs()` (the [`@fluixi/jsx`](../jsx)
  runtime).

It also provides the **`"use server"`** transform (server functions): the client build
gets an RPC stub, the server build keeps and registers the body.

Most apps don't use this package directly — [`@fluixi/vite-plugin`](../vite-plugin) (and
[`@fluixi/start`](../start)) wrap it.

## 📦 Installation

```ini
# .npmrc
@fluixi:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```sh
pnpm add -D @fluixi/compiler
```

## 🚀 Usage

Via the Vite integration (the common path):

```ts
import { defineConfig } from 'vite';
import { createVitePlugin, serverFunctionsVitePlugin } from '@fluixi/compiler/integrations';

export default defineConfig({
  plugins: [
    serverFunctionsVitePlugin(),          // "use server" transform
    createVitePlugin({ backend: 'imperative' }),
  ],
});
```

Or transform a string directly:

```ts
import { transform } from '@fluixi/compiler';
const { code } = transform(source, { backend: 'imperative' });
```

## 🔌 Subpaths

| Import | What |
| --- | --- |
| `@fluixi/compiler` | `transform()` + the compile pipeline |
| `@fluixi/compiler/integrations` | `createVitePlugin`, `serverFunctionsVitePlugin`, webpack/rollup/esbuild adapters |
| `@fluixi/compiler/babel` | the Babel plugin front-end |

## 📄 License

[MIT](./LICENSE) © [Fluixi](https://fluixi.dev)
