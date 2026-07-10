<p align="center">
  <img src="https://raw.githubusercontent.com/fluixi/assets/main/logos/128x128.png" alt="Fluixi" width="120" height="120" />
</p>

# @fluixi/vite-plugin

**The Vite plugin for Fluixi — JSX transform + codegen backend selection.**

[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](./LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
[![npm](https://img.shields.io/npm/v/@fluixi/vite-plugin?logo=npm)](https://www.npmjs.com/package/@fluixi/vite-plugin)
![Vite](https://img.shields.io/badge/built%20on-Vite-646cff?logo=vite&logoColor=white)

---

## ✨ Overview

`@fluixi/vite-plugin` sets the esbuild `jsxImportSource` and runs the Fluixi JSX transform
(via [`@fluixi/compiler`](../compiler)), with a choice of codegen backend. `@fluixi/core`
re-exports `fluixi`/`createVitePlugin` from here, and [`@fluixi/start`](../start) wires it
in automatically — use this plugin directly for a plain (non-meta-framework) Vite app.

## 📦 Installation

```sh
pnpm add -D @fluixi/vite-plugin
```

## 🚀 Usage

```ts
import { defineConfig } from 'vite';
import { fluixi } from '@fluixi/vite-plugin';

export default defineConfig({
  plugins: [
    fluixi({
      // 'imperative' (default) compiles straight into @fluixi/dom runtime calls
      // (createNativeElement/spread/insert/…); 'jsx' emits jsx()/jsxs().
      backend: 'imperative',
    }),
  ],
});
```

## ⚙️ Options

Options are [`@fluixi/compiler`](../compiler)'s `CompilerOptions`:

| Option | Default | What |
| --- | --- | --- |
| `importSource` | `@fluixi/jsx` | JSX runtime import source |
| `backend` | `imperative` | `imperative` or `jsx` codegen |
| `signalModule` / `controlFlowModule` | `@fluixi/dom` | where imperative runtime symbols come from |
| `delegateEvents` | `true` | event delegation |
| `sourceMaps` | `true` | emit source maps |

## 📄 License

[MIT](./LICENSE) © [Fluixi](https://fluixi.dev)
