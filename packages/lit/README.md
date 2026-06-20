<p align="center">
  <img src="https://raw.githubusercontent.com/fluixi/assets/main/logos/128x128.png" alt="Fluixi" width="120" height="120" />
</p>

# @fluixi/lit

**The lit-html renderer for Fluixi — templates, directives, and lit-based control flow.**

[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](./LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![Registry](https://img.shields.io/badge/registry-GitHub%20Packages-181717?logo=github)
![Built on lit-html](https://img.shields.io/badge/built%20on-lit--html-324fff)

---

## ✨ Overview

`@fluixi/lit` is the **optional** lit-html authoring layer, built on [`@fluixi/dom`](../dom).
Fluixi's default path is JSX (compiled to fine-grained DOM calls); `@fluixi/lit` is for
apps that prefer `html` tagged-template syntax. It lives in its own package so lit (which
extends `HTMLElement` at module init) stays out of the core/SSR graph — import lit symbols
from here, never from `@fluixi/core`.

## 📦 Installation

```ini
# .npmrc
@fluixi:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```sh
pnpm add @fluixi/lit
```

## 🚀 Usage

```ts
import { createSignal } from '@fluixi/reactive/signal';
import { html, litrx, render } from '@fluixi/lit';

function Counter() {
  const [count, setCount] = createSignal(0);
  return html`
    <button @click=${() => setCount(count() + 1)}>
      count: ${litrx(count)}
    </button>
  `;
}

render(Counter(), document.getElementById('app')!);
```

## 🧩 Exports

- **Templates** — `html`, `svg`, `nothing`, `render`, `litrx` (reactive interpolation).
- **Directives** — `$classMap`, `$styleMap`, and the lit directive set.
- **Control flow** — `$show`, `$for`, `$switch`, `$portal`, `$if`, `$each`.

For framework-agnostic control flow / class+style maps that don't pull lit, use
[`@fluixi/dom`](../dom)'s `Show`/`For`/`classMap`/`styleMap` instead.

## 📄 License

[MIT](./LICENSE) © [Fluixi](https://fluixi.dev)
