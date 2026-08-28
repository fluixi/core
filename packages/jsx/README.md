<p align="center">
  <img src="https://raw.githubusercontent.com/fluixi/assets/main/logos/128x128.png" alt="Fluixi" width="120" height="120" />
</p>

# @fluixi/jsx

**The JSX runtime and types Fluixi compiles against.**

[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](./LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
[![npm](https://img.shields.io/npm/v/@fluixi/jsx?logo=npm)](https://www.npmjs.com/package/@fluixi/jsx)
![JSX](https://img.shields.io/badge/JSX-runtime-f7df1e?logo=javascript&logoColor=black)

---

This is the `jsxImportSource` for Fluixi: the `jsx`/`jsxs`/`Fragment` factories, the element
helpers, and the JSX type definitions that give intrinsic elements and their attributes real
types.

It is a small package with a narrow job. **Most Fluixi code never imports it** — the compiler
turns JSX into direct DOM calls, so the factories are a fallback for anything it did not
compile. Components, control flow, rendering and reactivity live elsewhere; see
[Where things actually live](#where-things-actually-live).

## Installation

```bash
pnpm add @fluixi/jsx @fluixi/dom
```

## Setup

Point TypeScript at this package and let the Vite plugin compile:

```json
{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "@fluixi/jsx"
  }
}
```

```ts
// vite.config.ts
import { fluixi } from '@fluixi/vite-plugin';

export default { plugins: [fluixi()] };
```

`npm create fluixi` wires both for you.

## What it exports

| Export | Purpose |
| --- | --- |
| `jsx`, `jsxs`, `Fragment` | The automatic-runtime factories |
| `jsxDEV` | The development factory |
| `createElement`, `cloneElement`, `isValidElement` | Classic element helpers |
| `createRef`, `forwardRef` | Refs |
| `renderToString` | String rendering |
| `mergeProps` | Merge prop objects, keeping getters live |
| `delegateEvents` | Register delegated event types |
| `createReactiveJSX`, `jsxComponent`, `defineComponent`, `memo`, `hydrate` | Lower-level integration seams |

Types: `JSXElement`, `JSXComponent`, `JSXProps`, `RefCallback`, `RefObject`, plus the global
`JSX` namespace with intrinsic elements.

## Where things actually live

This package is a runtime, not a framework façade. Reaching for it directly is usually a sign
you want one of these instead:

| You want | Import from |
| --- | --- |
| `Show`, `For`, `Index`, `Switch`, `Match`, `Portal`, `Dynamic`, `ErrorBoundary` | `fluixi` or `@fluixi/dom` |
| `render`, `hydrate` (app entry) | `fluixi` |
| `signal`, `memo`, `effect`, `store` | `@fluixi/reactive` |
| Server rendering | `@fluixi/server`, or `@fluixi/start` for the whole thing |
| The JSX → DOM compile | `@fluixi/compiler`, `@fluixi/vite-plugin` |

## Typing an element

The `JSX` namespace types intrinsic elements and their attributes, so a misspelled attribute
or a wrong event handler is an error rather than a silent no-op:

```tsx
const el = <input type="text" onInput={(e) => console.log(e.currentTarget.value)} />;
//                            ^ typed as InputEvent on HTMLInputElement
```

Reactive attributes accept an accessor as well as a value, which is what lets the compiler
wire a binding without changing your types:

```tsx
const count = $signal(0);
<div title={() => `count: ${count()}`} data-count={count()} />;
```

## Refs

```tsx
import { createRef } from '@fluixi/jsx';

function Field() {
  const input = createRef<HTMLInputElement>();
  onMount(() => input.current?.focus());
  return <input ref={input} />;
}
```

A callback ref works too — `ref={(el) => …}` — and both forms are typed bivariantly, so a
component that takes `HTMLElement` accepts a more specific ref.

## License

MIT

## Links

- [Fluixi docs](https://docs.fluixi.com)
- [npm](https://www.npmjs.com/package/@fluixi/jsx)
- [Repository](https://github.com/fluixi/core)
