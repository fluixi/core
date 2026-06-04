<div align="center">
  <img src="https://raw.githubusercontent.com/fluixi/assets/main/logos/512x512.png" alt="Fluixi" width="120" height="120" />

  <h1>@fluixi/element</h1>

  <p><strong>Web Component bindings for KettleJS — define custom elements with fine-grained reactivity.</strong></p>

  <p>
    <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-22c55e.svg" /></a>
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white" />
    <img alt="Registry" src="https://img.shields.io/badge/registry-GitHub%20Packages-181717?logo=github" />
    <img alt="Web Components" src="https://img.shields.io/badge/Web%20Components-native-29abe2" />
  </p>
</div>

---

## ✨ Overview

`@fluixi/element` brings Fluixi's fine-grained reactivity to native **Web Components**. Author custom elements as reactive components and let signals drive surgical DOM updates inside the shadow root — with first-class [Lit](https://lit.dev) interop.

## 🧩 What's included

| Export | Description |
| --- | --- |
| `defineElement` | Register a reactive function component as a custom element. |
| `KettleElement` | Base class for reactive custom elements. |
| `KettleLitElement` | `LitElement` subclass wired to Fluixi signals. |
| `KettleController` | Reactive controller for composing element behavior. |
| `@fluixi/element/jsx` | `createComponent` helper for using elements from JSX. |
| `@fluixi/element/plugin` | Build-time plugin glue. |

## 📦 Installation

```ini
# .npmrc
@fluixi:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```sh
pnpm add @fluixi/element lit
```

## 🚀 Usage

```ts
import { defineElement } from '@fluixi/element';
import { createSignal } from '@fluixi/reactive/signal';
import { html } from 'lit';

defineElement('counter-button', () => {
  const [count, setCount] = createSignal(0);
  return () => html`
    <button @click=${() => setCount((c) => c + 1)}>
      Count: ${count()}
    </button>
  `;
});
```

```html
<counter-button></counter-button>
```

## 📋 Requirements

- **lit** ≥ 3.3
- **@fluixi/reactive** and **@fluixi/dom** (peer of the framework)

## 📄 License

[MIT](./LICENSE) © [Fluixi](https://fluixi.dev)
