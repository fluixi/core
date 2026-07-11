<p align="center">
  <img src="https://raw.githubusercontent.com/fluixi/assets/main/logos/128x128.png" alt="Fluixi" width="120" height="120" />
</p>

# @fluixi/lit

**Write Fluixi UIs with `` html`` `` templates instead of JSX — compiled to `@fluixi/dom` runtime calls. No lit runtime ships.**

[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](./LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
[![npm](https://img.shields.io/npm/v/@fluixi/lit?logo=npm)](https://www.npmjs.com/package/@fluixi/lit)

---

## Overview

`@fluixi/lit` is the **no-JSX authoring layer** for Fluixi. You write `` html`...` ``
tagged templates; the `@fluixi/compiler` (via `format: 'lit'`) turns them into the
**same fine-grained `@fluixi/dom` calls JSX compiles to** — `createNativeElement` /
`spread` / `insert` / `createComponent`. The template is compiled away: **no lit-html
runtime, no virtual DOM, no re-render**. A `` html`` `` template and its JSX twin emit
byte-identical code.

The tag itself (`html`/`svg`) is a compile-time marker — it never executes.

## Installation

```sh
pnpm add @fluixi/lit
```

## Setup

```ts
// vite.config.ts
import { fluixi } from '@fluixi/vite-plugin';

export default {
  plugins: [fluixi({ format: 'lit' })], // 'lit' | 'both' (JSX + html``)
};
```

```ts
import { createSignal } from '@fluixi/core';
import { html, Show } from '@fluixi/lit';

function Counter() {
  const [n, set] = createSignal(0);
  return html`
    <div class="counter ${n() < 0 ? 'neg' : 'pos'}">
      <button @click=${() => set(n() - 1)}>-</button>
      <span>${n()}</span>
      <button @click=${() => set(n() + 1)}>+</button>
      <Show when=${n() < 0}><p>below zero</p></Show>
    </div>
  `;
}
```

## Supported syntax

| feature | example | compiles to |
| --- | --- | --- |
| child interpolation | `<h1>${title()}</h1>` | reactive `insert` |
| attribute | `id=${id}` / `value="${x()}"` | attr, reactive when the hole is |
| mixed attr value | `class="a ${x()}"` | reactive template-literal |
| event | `@click=${fn}` | delegated (or direct) listener |
| property | `.value=${v}` | `setProperty` |
| boolean | `?disabled=${cond}` | attribute toggle |
| spread | `<div ${props}>` | `spread` / `mergeProps` |
| `ref` | `ref=${el => …}` | `handleRef` |
| class object | `class=${classMap({...})}` | `classList` |
| style object | `style=${styleMap({...})}` | `setStyle` |
| control flow | `<Show when=${c}>…</Show>` | `createComponent(Show, …)` (auto-imported) |
| nested templates | `${list().map(x => html`<li>${x}</li>`)}` | compiled child list |
| `svg` | `` svg`<circle r=${r} />` `` | SVG-namespaced elements |

Control flow (`Show`, `For`, `Index`, `Switch`, `Match`, `Dynamic`, `Portal`,
`ErrorBoundary`) and `classMap`/`styleMap` are re-exported here for convenience — the
compiler also auto-imports any control-flow tag you use in a template. Mount with
`@fluixi/core`'s `render` / `startClient`, like any Fluixi app.

## Not lit

This is **lit-inspired syntax, Fluixi semantics** — not a lit-html reimplementation:

- **No custom `Directive` classes.** A lit directive is runtime code that drives lit's
  `Part` lifecycle; there is no Part here. Use the props above (`ref`, `classList`,
  `style`, `innerHTML`) and control-flow components instead.
- **No `guard` / `cache` / `live`.** They exist to bail lit out of whole-template
  re-renders. Fine-grained reactivity updates only what changed, so they're unnecessary.
- **No `unsafeHTML` directive.** Set raw markup with the `innerHTML` prop.
- **No `render()` / `TemplateResult`.** Templates compile to DOM nodes.

See `examples/lit-counter` for a full app.

## License

[MIT](./LICENSE) © [Fluixi](https://fluixi.dev)
