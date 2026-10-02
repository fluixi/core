<p align="center">
  <img src="https://raw.githubusercontent.com/fluixi/assets/main/logos/128x128.png" alt="Fluixi" width="120" height="120" />
</p>

# @fluixi/utils

**Zero-dependency, strongly-typed utilities for everyday TypeScript.**

[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](./LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
[![npm](https://img.shields.io/npm/v/@fluixi/utils?logo=npm)](https://www.npmjs.com/package/@fluixi/utils)
![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)

---

## ✨ Overview

`@fluixi/utils` is the foundational layer of Fluixi Core: a collection of small, tree-shakeable, **fully-typed** helpers with **no runtime dependencies**. Every module is exported under its own subpath so you only ship what you import.

## 🧩 Modules

| Import | What it provides |
| --- | --- |
| `@fluixi/utils/primitive` | String, number, boolean, and date helpers. |
| `@fluixi/utils/object` | Deep get/set, clone, diff, merge, immutable path updates. |
| `@fluixi/utils/array` | Array transforms, grouping, and set operations. |
| `@fluixi/utils/maths` | Vectors, interpolation, clamping, constants, and guards. |
| `@fluixi/utils/color` | Color parsing and conversion. |
| `@fluixi/utils/dom` | Lightweight DOM helpers. |
| `@fluixi/utils/functions` | Composition, debounce/throttle, memoization. |
| `@fluixi/utils/cookie` | `parseCookies`, `serializeCookie` (HttpOnly, Secure, SameSite=Lax by default), `deleteCookie`, `isValidCookieName`. |
| `@fluixi/utils/compare` | Deep equality and comparison utilities. |

## 📦 Installation

```sh
pnpm add @fluixi/utils
```

## 🚀 Usage

```ts
import { set, get } from '@fluixi/utils/object';

const state = { users: [{ name: 'Alice' }] };

// Immutable update — returns a new object, leaves `state` untouched
const next = set(state, 'users', 0, 'name', 'Alice Updated');

get(next, 'users[0].name'); // → 'Alice Updated'
get(state, 'users[0].name'); // → 'Alice'  (original is unchanged)
```

```ts
import { lerp, clamp } from '@fluixi/utils/maths/fn';

lerp(0, 100, 0.25); // → 25
clamp(150, 0, 100); // → 100
```

## 📋 Requirements

- **TypeScript** ≥ 5.8 (ships its own `.d.ts` declarations)
- **Node.js** ≥ 20 / any modern bundler (ESM + CJS builds included)

## 📄 License

[MIT](./LICENSE) © [Fluixi](https://fluixi.dev)
