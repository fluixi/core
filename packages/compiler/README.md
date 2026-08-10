<p align="center">
  <img src="https://raw.githubusercontent.com/fluixi/assets/main/logos/128x128.png" alt="Fluixi" width="120" height="120" />
</p>

# @fluixi/compiler

**The Fluixi compiler — parses, lowers and emits. Not a Babel plugin.**

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

It owns the transform rather than running inside someone else's: parse once, splice the
emitted code over the spans it replaces. Nothing is reprinted, so a hole keeps the text the
author wrote and every edit carries a source map; types are left in place for the bundler
to strip.

`@babel/parser` is the only package it takes from that namespace, used as a parser — the
same position Vue's compiler is in. `@babel/core` and the plugin machinery are optional
peers, needed only by `babel: true`.

The `@fluixi/jsx` automatic runtime is still what esbuild and TypeScript's
`jsxImportSource` point at; this compiler simply never emits a call into it.

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

Or compile a module directly:

```ts
import { transformTemplates } from '@fluixi/compiler/transform';

const { code, map } = transformTemplates(source, 'App.tsx', {})!;
```

`transformTemplates` returns `null` when a module has no JSX and no templates, so a
bundler can leave the file untouched.

### Compiling through Babel

`fluixi({ babel: true })` routes through the Babel front-end instead. It exists for a
project whose own Babel plugins have to see the compiled output; it needs `@babel/core`
and friends installed, and says so rather than degrading. Everything else — the IR, the
passes, the backend — is the same code either way.

## 🔌 Subpaths

| Import | What | Babel |
| --- | --- | --- |
| `@fluixi/compiler` | IR, codegen backends, resolve/optimize passes, options | none |
| `@fluixi/compiler/builtins` | the control-flow / router component names | none |
| `@fluixi/compiler/transform` | `transformTemplates`, `transformServerFns` | parser only |
| `@fluixi/compiler/integrations` | vite, webpack, rollup and esbuild adapters | parser only |
| `@fluixi/compiler/babel` | the Babel plugin front-end | `@babel/core` |

`no-babel-in-core.spec.ts` fails the build if that column stops being true.

## 📄 License

[MIT](./LICENSE) © [Fluixi](https://fluixi.dev)
