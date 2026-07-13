# Quick start

The fastest way to a running app is the `create-fluixi` scaffolder:

```bash
npm create fluixi@latest my-app
# or: pnpm create fluixi my-app · yarn create fluixi my-app
```

It asks two questions:

- **App mode** — **SSR** (server-rendered via `@fluixi/start`) or **SPA** (client-only via Vite).
- **Template syntax** — **JSX** (default) or **html``** (no JSX, plain `.ts` files).

Then:

```bash
cd my-app
npm install
npm run dev
```

You can also skip the prompts:

```bash
npm create fluixi@latest my-app -- --ssr --jsx    # or --spa / --html
```

## JSX or html``?

Fluixi compiles **both** JSX and tagged `` html`` `` templates to the same fine-grained DOM
calls — pick whichever you prefer, or mix them in one file.

```tsx
// JSX — needs `jsx` configured in tsconfig
function Counter() {
  const [n, setN] = createSignal(0);
  return <button onClick={() => setN(n() + 1)}>{n()}</button>;
}
```

```ts
// html`` — plain .ts, no jsx in tsconfig
import { html } from '@fluixi/core';

function Counter() {
  const [n, setN] = createSignal(0);
  return html`<button @click=${() => setN(n() + 1)}>${n()}</button>`;
}
```

Choose **html``** when you don't want to configure JSX (for example a library, a script, or a
plain-TypeScript codebase). See **[html`` templates](/v1/en/html-templates)** for the full syntax.

Every scaffolded app includes **[@fluixi/ts-plugin](/v1/en/html-templates)**, which gives `` html`` ``
templates real TypeScript support in your editor — hover, completion and type-checking inside the
template.

## Add a component or route

The CLI scaffolds pieces into an existing app, matching your project's syntax automatically:

```bash
npx fluixi generate component Button    # → src/components/Button.tsx (or .ts for html``)
npx fluixi generate route about         # → src/routes/about.tsx
```

## Starting from scratch

If you'd rather wire it up yourself, install the runtime and the Vite plugin:

```bash
npm install @fluixi/core
npm install -D @fluixi/vite-plugin vite
```

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { fluixi } from '@fluixi/vite-plugin';

export default defineConfig({ plugins: [fluixi()] });
```

```ts
// src/main.ts
import { render, html } from '@fluixi/core';
import { App } from './app';

render(() => html`<${App} />`, document.getElementById('app')!);
```

Continue to **[Signals](/v1/en/signals)** for the reactive core, or jump to
**[html`` templates](/v1/en/html-templates)**.
