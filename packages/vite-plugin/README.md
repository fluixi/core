<p align="center">
  <img src="https://raw.githubusercontent.com/fluixi/assets/main/logos/128x128.png" alt="Fluixi" width="120" height="120" />
</p>

# @fluixi/vite-plugin

**The Vite plugin for Fluixi — compiles JSX and `` html`` `` templates.**

[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](./LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
[![npm](https://img.shields.io/npm/v/@fluixi/vite-plugin?logo=npm)](https://www.npmjs.com/package/@fluixi/vite-plugin)
![Vite](https://img.shields.io/badge/built%20on-Vite-646cff?logo=vite&logoColor=white)

---

## ✨ Overview

`@fluixi/vite-plugin` sets the esbuild `jsxImportSource` and runs the Fluixi compile
(via [`@fluixi/compiler`](../compiler)) — JSX and `` html`...` `` both, straight into
`@fluixi/dom` runtime calls. It rewrites the source in place, so output carries a source
map and holes keep the text the author wrote. Nothing from babel is installed for it.
`@fluixi/core`
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
    // JSX and html`` templates both compile straight into @fluixi/dom runtime
    // calls (createNativeElement/spread/insert/…). No options required.
    fluixi(),
  ],
});
```

## ⚙️ Options

Options are [`@fluixi/compiler`](../compiler)'s `CompilerOptions`:

| Option | Default | What |
| --- | --- | --- |
| `importSource` | `@fluixi/jsx` | where the JSX *types* come from; also the `jsxImportSource` given to esbuild |
| `format` | `both` | which syntaxes to compile — `jsx`, `lit`, or `both` |
| `signalModule` / `controlFlowModule` | `@fluixi/dom` | where emitted runtime symbols come from |
| `resolve` | – | rules that supply a component import from a bare tag |
| `globals` | `fluixi.d.ts` | where to write the generated ambient types (the resolved components and the `$signal`-style intrinsics). `false` skips it |
| `propsDestructure` | `true` | rewrite a component's destructured props into property reads, so `function Card({ title })` keeps updating. A pattern it can't prove is left as written. Turn off for a package that ships its source |
| `templateClone` / `partialTemplates` | `true` | clone static subtrees instead of building them |
| `delegateEvents` | `true` | event delegation |
| `sourceMaps` | `true` | emit source maps |
| `babel` | `false` | compile through the babel front-end instead, for a project whose own babel plugins have to see the output. Needs `@babel/core`, which is an optional peer |
| `devtools` | on in dev | serve the running app's reactive graph, and mark where each node was created. `{ external: true }` marks dependencies too |

## 🕸️ Reactive graph

The plugin adds a small agent to the page in development mode, which reports the reactive graph at `GET /__fluixi/graph`. This graph is available as plain JSON, making it easy to read and use in tools like editor extensions or panels. The plugin requires `@fluixi/devtools` as a dev dependency. If it is not installed, the plugin will not add the agent and will not serve the graph.

Here is how you can configure the plugin:

```ts
// vite.config.ts
plugins: [fluixi()],                            // graph on in dev
plugins: [fluixi({ devtools: false })],         // off
plugins: [fluixi({ devtools: { external: true } })],  // dependencies too
```

Each node in the graph carries the file, line, and column it was created at, named relative to the project root. By default, nodes from dependencies are not marked, which keeps the graph focused on the code you are editing.

The `external` option is useful for working on the framework itself. It marks nodes from `node_modules` and outside the project root as `external`, allowing you to see which nodes were created by libraries and which by your application. The application's call site takes precedence over the wrapper that created the node, so `count` appears as the line you wrote it on, not the line inside `signal()`.

## 📄 License

[MIT](./LICENSE) © [Fluixi](https://fluixi.dev)
