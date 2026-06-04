<div align="center">
  <img src="https://raw.githubusercontent.com/fluixi/assets/main/logos/512x512.png" alt="Fluixi" width="120" height="120" />

  <h1>@fluixi/babel-plugin-jsx</h1>

  <p><strong>Compiles JSX into fine-grained reactive DOM calls for KettleJS — no virtual DOM.</strong></p>

  <p>
    <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-22c55e.svg" /></a>
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white" />
    <img alt="Registry" src="https://img.shields.io/badge/registry-GitHub%20Packages-181717?logo=github" />
    <img alt="Babel" src="https://img.shields.io/badge/Babel-plugin-f9dc3e?logo=babel&logoColor=black" />
  </p>
</div>

---

## ✨ Overview

`@fluixi/babel-plugin-jsx` is the compile-time half of Fluixi's JSX support. It transforms JSX at build time into direct, surgical DOM operations wired to signals — so updates touch only the nodes that actually change, with no diffing and no virtual DOM. It pairs with the runtime in [`@fluixi/jsx-runtime`](../jsx-runtime).

## 📦 Installation

```ini
# .npmrc
@fluixi:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

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
    "jsxImportSource": "@fluixi/jsx-runtime"
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
- Use together with [`@fluixi/jsx-runtime`](../jsx-runtime) at runtime.

## 📄 License

[MIT](./LICENSE) © [Fluixi](https://fluixi.dev)
