<p align="center">
  <img src="https://raw.githubusercontent.com/fluixi/assets/main/logos/128x128.png" alt="Fluixi" width="120" height="120" />
</p>

# @fluixi/compiler

**The Fluixi compiler — host-agnostic IR + pluggable codegen backends.**

[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](./LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
[![npm](https://img.shields.io/npm/v/@fluixi/compiler?logo=npm)](https://www.npmjs.com/package/@fluixi/compiler)

---

## ✨ Overview

`@fluixi/compiler` turns Fluixi source into fine-grained reactive output. Both authoring
syntaxes — JSX and `` html`...` `` templates — lower to the **same host-agnostic IR**, and
the **imperative backend** compiles that straight into [`@fluixi/dom`](../dom) runtime
calls (`createNativeElement`/`spread`/`insert`/`createComponent`/…). No VDOM, and no
`jsx()` dispatch at runtime.

Only the front-end knows about Babel. The IR, the resolve and optimize passes, and codegen
import none of it — importing `@fluixi/compiler` loads no Babel code. The `@fluixi/jsx`
automatic runtime is still what esbuild and TypeScript's `jsxImportSource` point at; this
compiler simply never emits a call into it.

It also provides the **`"use server"`** transform (server functions): the client build
gets an RPC stub, the server build keeps and registers the body.

Most apps don't use this package directly — [`@fluixi/vite-plugin`](../vite-plugin) (and
[`@fluixi/start`](../start)) wrap it.

## 📦 Installation

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
    createVitePlugin(),
  ],
});
```

There is no string-in/string-out entry point yet: compilation runs as a Babel plugin, via
one of the integrations above or `@fluixi/compiler/babel` directly. A native `compile()`
that skips the host round-trip is the next step — the IR and codegen it would call are
already in place and Babel-free.

## 🔌 Subpaths

| Import | What | Loads Babel |
| --- | --- | --- |
| `@fluixi/compiler` | IR, codegen backends, resolve/optimize passes, options | no |
| `@fluixi/compiler/builtins` | the control-flow / router component names | no |
| `@fluixi/compiler/integrations` | `createVitePlugin`, `serverFunctionsVitePlugin`, webpack/rollup/esbuild adapters | yes |
| `@fluixi/compiler/babel` | the Babel plugin front-end | yes |

## 📄 License

[MIT](./LICENSE) © [Fluixi](https://fluixi.dev)
