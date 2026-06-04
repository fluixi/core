<div align="center">
  <img src="https://raw.githubusercontent.com/fluixi/assets/main/logos/512x512.png" alt="Fluixi" width="120" height="120" />

  <h1>@fluixi/webui</h1>

  <p><strong>A ready-made, themeable web-component UI library built on KettleJS.</strong></p>

  <p>
    <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-22c55e.svg" /></a>
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white" />
    <img alt="Registry" src="https://img.shields.io/badge/registry-GitHub%20Packages-181717?logo=github" />
    <img alt="Web Components" src="https://img.shields.io/badge/Web%20Components-framework--agnostic-29abe2" />
  </p>
</div>

---

## ✨ Overview

`@fluixi/webui` is a library of production-ready **custom elements** powered by Fluixi's fine-grained reactivity. Because they are standard Web Components, the same elements work in any framework — React, Vue, Angular, Svelte — or with no framework at all.

## 🧱 Components

`button` · `card` · `checkbox` · `dialog` · `draggable` · `drawer` · `dropdown` · `icon` · `input` · `list` · `popover` · `radio` · `select` · `sidenav` · `switch`

## 📦 Installation

```ini
# .npmrc
@fluixi:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```sh
pnpm add @fluixi/webui
```

## 🚀 Usage

Import once to register the elements, then use them as plain HTML tags:

```ts
import '@fluixi/webui';
```

```html
<flx-button variant="primary">Save</flx-button>

<flx-dialog open>
  <h2 slot="header">Confirm</h2>
  <p>Are you sure?</p>
  <flx-button slot="footer">Cancel</flx-button>
</flx-dialog>
```

They are framework-agnostic — for example in React:

```tsx
export const Page = () => (
  <flx-button variant="primary" onClick={save}>Save</flx-button>
);
```

## 🎨 Theming

Components expose CSS custom properties (`--flx-*`) and honour `prefers-color-scheme`, so you can theme them globally with a single stylesheet.

## 📋 Requirements

- A bundler or runtime that supports ES modules and custom elements (all evergreen browsers).

## 📄 License

[MIT](./LICENSE) © [Fluixi](https://fluixi.dev)
