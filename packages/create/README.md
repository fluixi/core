<p align="center">
  <img src="https://raw.githubusercontent.com/fluixi/assets/main/logos/128x128.png" alt="Fluixi" width="120" height="120" />
</p>

# @fluixi/create

**Scaffold a new Fluixi app — `npm create @fluixi <dir>`.**

[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](./LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![Registry](https://img.shields.io/badge/registry-GitHub%20Packages-181717?logo=github)

---

## ✨ Overview

Run via your package manager's `create` shortcut — no install needed:

```bash
npm create @fluixi my-app
# or
pnpm create @fluixi my-app
# or
yarn create @fluixi my-app
```

It prompts for a project name and a **mode**, or take them on the command line:

```bash
create-fluixi my-app --ssr   # SSR app (@fluixi/start: file routing + SSR + hydration)
create-fluixi my-app --spa   # SPA (vite + @fluixi/vite-plugin)
```

Then:

```bash
cd my-app
pnpm install
pnpm dev
```

## 🗂️ Templates

| Mode | Stack | Entry |
| --- | --- | --- |
| **SSR** | [`@fluixi/start`](../start) + [`@fluixi/cli`](../cli) | `src/entry-{server,client}`, `src/routes/`, `fluixi.config.ts` |
| **SPA** | `vite` + [`@fluixi/vite-plugin`](../vite-plugin) | `src/main.tsx` → `render(() => <App/>)` |

Both pin `@fluixi/*` to the `next` dist-tag and set `jsxImportSource: "@fluixi/jsx"`.

## 🧱 Scaffolding pieces

To add components, routes, or middleware **inside** an existing app, use `fluixi generate`
from [`@fluixi/cli`](../cli):

```bash
fluixi g component Button
fluixi g route about
```

## 📄 License

[MIT](./LICENSE) © [Fluixi](https://fluixi.dev)
