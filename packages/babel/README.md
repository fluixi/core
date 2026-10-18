<p align="center">
  <img src="https://raw.githubusercontent.com/fluixi/assets/main/logos/128x128.png" alt="Fluixi" width="120" height="120" />
</p>

# @fluixi/babel-plugin-jsx

**Compiles JSX into fine-grained reactive DOM calls for Fluixi: no virtual DOM.**

[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](./LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
[![npm](https://img.shields.io/npm/v/@fluixi/babel-plugin-jsx?logo=npm)](https://www.npmjs.com/package/@fluixi/babel-plugin-jsx)
![Babel](https://img.shields.io/badge/Babel-plugin-f9dc3e?logo=babel&logoColor=black)

---

## ✨ Overview

`@fluixi/babel-plugin-jsx` transforms JSX at build time into direct, surgical DOM operations wired to signals: so updates touch only the nodes that actually change, with no diffing and no virtual DOM. It pairs with the runtime in [`@fluixi/jsx`](../jsx).

> **You probably want [`@fluixi/vite-plugin`](../vite-plugin) instead.** Fluixi compiles
> through [`@fluixi/compiler`](../compiler), which has no babel dependency, handles
> `` html`` `` templates as well as JSX, and is where component resolution, `load:`
> strategies and the `$` intrinsics live. This plugin exists for a build that has to run
> through babel: an existing babel pipeline whose own plugins need to see the output, or a
> toolchain with no Vite in it. It compiles JSX and nothing else.

## 📦 Installation

```sh
pnpm add -D @fluixi/babel-plugin-jsx
```

## 🚀 Usage

**`babel.config.js`**

```js
module.exports = {
  plugins: ['@fluixi/babel-plugin-jsx'],
};
```

Or via the automatic JSX runtime in `tsconfig.json`:

```jsonc
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@fluixi/jsx"
  }
}
```

The plugin rewrites JSX such as:

```jsx
<button onClick={() => setCount(c => c + 1)}>Count: {count()}</button>
```

into fine-grained DOM instructions that update only the text node bound to `count()`.

## 📋 Requirements

- **@babel/core** ≥ 7.27
- Use together with [`@fluixi/jsx`](../jsx) at runtime.

## 📄 License

[MIT](./LICENSE) © [Fluixi](https://fluixi.dev)
