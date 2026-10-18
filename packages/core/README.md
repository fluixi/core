<p align="center">
  <img src="https://raw.githubusercontent.com/fluixi/assets/main/logos/128x128.png" alt="Fluixi" width="120" height="120" />
</p>

# fluixi

**A compiler-native reactive framework. The compiler knows what's reactive, so you write ordinary TypeScript.**

[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](./LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
[![npm](https://img.shields.io/npm/v/fluixi?logo=npm)](https://www.npmjs.com/package/fluixi)

---

Most reactive frameworks ask you to keep a model in your head that the language doesn't share: which reads are tracked, what you may not destructure, where a value has to stay a function. The compiler can't help, because it doesn't know what your values are: so the burden is yours, and the failures are quiet ones.

Fluixi's compiler knows. It resolves a reactive primitive by the binding it came from, not by how the name reads, and carries that through JSX and `` html`` `` templates, the DOM it generates, SSR, hydration and routing as one model.

## Features

- 🧠 **The compiler understands reactivity** - resolves primitives by binding, not by name; an alias is recognised, a same-named local function is not
- ✂️ **Destructure your props** - `function Card({ title })` keeps updating; `...rest` becomes the `splitProps` call you'd have written
- ✍️ **Two syntaxes, one model** - JSX and `` html`` `` templates compile to the same reactive representation
- 🚀 **Direct DOM** - a change runs the binding that depends on it; no component re-render, no diff, no virtual tree
- ⏳ **Load strategies** - `load:visible`, `load:idle`, `load:interaction`, `load:media` split a component into its own chunk
- 🛣️ **Router, SSR and hydration** - the same reactive graph end to end, not agreed at the edges
- 📡 **Resources + Suspense** - async data with loading/error state, awaited and seeded during SSR
- 🏗️ **TypeScript first** - full types, and a language-service plugin for `` html`` `` templates

## Installation

```bash
npm install @fluixi/core @fluixi/reactive
# or
pnpm add @fluixi/core @fluixi/reactive
# or
yarn add @fluixi/core @fluixi/reactive
```

## Quick Start

### Creating a New Project

```bash
npm create fluixi my-app
# or: pnpm create fluixi my-app
```

### Basic Example

```tsx
import { render } from '@fluixi/core';

const Counter = () => {
  const count = $signal(0);

  return (
    <div>
      <h1>Count: {count()}</h1>
      <button onClick={() => count.set(count() + 1)}>Increment</button>
      <button onClick={() => count.set(count() - 1)}>Decrement</button>
      <button onClick={() => count.set(0)}>Reset</button>
    </div>
  );
};

render(() => <Counter />, document.getElementById('app')!);
```

`$signal` needs no import: the compiler resolves it and adds what it needs. `signal(0)` from `@fluixi/reactive/signal` is the same primitive when you'd rather import it, and works in a package that never runs this compiler.

> JSX is compiled by `@fluixi/vite-plugin`. Scaffold a ready-to-run app with `npm create fluixi`.

## Core Concepts

### Signals

Signals are reactive state. Reading one inside an effect or JSX subscribes to it; setting it updates only what depends on it.

```tsx
const count = $signal(0);
const name = $signal('Alice');

$effect(() => {
  console.log(`${name()} counted to ${count()}`);
});

count.set(5);      // "Alice counted to 5"
name.set('Bob');   // "Bob counted to 5"
```

Call it to read, `.set()` to write. `$memo` derives, `$store` holds an object you read
properties off, `$resource` wraps async data. Each has an importable twin: `signal`,
`memo`, `effect`, `store`, `resource` from `@fluixi/reactive/signal`: and they are the
same primitives, so the two spellings mix freely in one file.

`createSignal` and its `[read, write]` pair are unchanged, and plenty of code is written
against them.

### Components

Components are plain functions that return JSX. A component runs **once**; props are live
reads rather than values handed over at call time.

```tsx
function Greeting(props: { name: string }) {
  return <h1>Hello, {props.name}!</h1>;
}
```

Destructuring them is fine: the compiler rewrites the bindings into reads, so they keep
updating, and `...rest` becomes the `splitProps` call you would have written:

```tsx
function Card({ title, tone = 'calm', ...rest }) {
  return <article data-tone={tone} {...rest}><h2>{title}</h2></article>;
}
```

Where it can't prove a rewrite is safe: a reassigned binding, a computed key, a default
it would have to re-run on every read: it leaves your code exactly as written and says
why at build time.

### Control Flow

Use control-flow components instead of ternaries and `.map()` so updates stay fine-grained.

```tsx
import { Show, For, Switch, Match } from '@fluixi/core';

// Show — conditional rendering (child callback receives the narrowed value)
<Show when={() => user()} fallback={<p>Please log in</p>}>
  {(u) => <p>Welcome, {u.name}!</p>}
</Show>

// For — keyed list rendering (index is an accessor)
<For each={todos()}>
  {(todo, i) => <li>{i() + 1}. {todo.text}</li>}
</For>

// Switch / Match — multi-branch
<Switch fallback={<p>Idle</p>}>
  <Match when={() => status() === 'loading'}><p>Loading…</p></Match>
  <Match when={() => status() === 'success'}><p>Done!</p></Match>
  <Match when={() => status() === 'error'}><p>Error</p></Match>
</Switch>
```

`Portal`, `Dynamic`, `Index`, and `ErrorBoundary` are also exported.

### Load strategies

A `load:` directive decides *when* a component's module is fetched, and moves it into its
own chunk:

```tsx
import { RevenueChart } from './RevenueChart';

<RevenueChart load:visible="200px" />   // when it scrolls near the viewport
<ExportDialog load:interaction />       // on first pointer, focus or key
<AuditLog load:media="(min-width: 1024px)" />
<Panel load:idle />
```

Deferring replaces your static import with a dynamic one, so it applies when the name is
used only as a tag. Reference it as a value too and the import stays: the build says so
rather than silently shipping the chunk eagerly.

### `` html`` `` templates

The same reactive model without configuring JSX: useful in a library, a script, or a
plain-TypeScript codebase:

```ts
import { html } from '@fluixi/core';

function Counter() {
  const n = $signal(0);
  return html`<button @click=${() => n.set(n() + 1)}>${n()}</button>`;
}
```

Both syntaxes compile to the same representation; `@fluixi/ts-plugin` gives templates
hover, completion and type-checking in the editor.

### Resources & Suspense

`createResource` fetches async data and tracks loading/error. `<Suspense>` shows a fallback while it's pending (works on the client and during SSR).

```tsx
import { Suspense } from '@fluixi/core';

function UserCard() {
  const id = $signal(1);
  const user = $resource(id, (id) =>
    fetch(`/api/users/${id}`).then((r) => r.json())
  );

  return (
    <Suspense fallback={<p>Loading…</p>}>
      <p>{user()?.name}</p>
    </Suspense>
  );
}
```

### Context

Share state down the tree without prop drilling.

```tsx
import { createContext, useContext } from '@fluixi/core';

const ThemeContext = createContext<'light' | 'dark'>('light');

function App() {
  return (
    <ThemeContext.Provider value="dark">
      <Toolbar />
    </ThemeContext.Provider>
  );
}

function Toolbar() {
  const theme = useContext(ThemeContext);
  return <div class={theme}>…</div>;
}
```

### Router

The router takes a `routes` config; nested routes render through `<Outlet />`, and `lazy()` code-splits.

```tsx
import { render } from '@fluixi/core';
import { Router, Outlet, lazy } from '@fluixi/core/router';

const routes = [
  {
    path: '/',
    component: () => (
      <div class="app">
        <nav>…</nav>
        <Outlet />
      </div>
    ),
    children: [
      { path: '', component: () => <h1>Home</h1> },
      { path: 'about', component: lazy(() => import('./About')) },
    ],
  },
];

render(() => <Router routes={routes} />, document.getElementById('app')!);
```

## Lifecycle Hooks

```tsx
import { onMount, onCleanup } from '@fluixi/core';

function Clock() {
  const now = $signal(Date.now());

  onMount(() => {
    const id = setInterval(() => now.set(Date.now()), 1000);
    onCleanup(() => clearInterval(id));
  });

  return <time>{new Date(now()).toLocaleTimeString()}</time>;
}
```

## Derived State & Batching

```tsx
import { batch } from '@fluixi/core';

const first = $signal('Ada');
const last = $signal('Lovelace');

// Memo — cached, recomputes only when a dependency changes
const fullName = $memo(() => `${first()} ${last()}`);

// Batch — coalesce multiple writes into one update
batch(() => {
  first.set('Grace');
  last.set('Hopper');
});
```

## SSR

Server rendering, hydration, file-based routing and the dev/build tooling live in [`@fluixi/start`](https://www.npmjs.com/package/@fluixi/start). Scaffold an SSR app with `npm create fluixi` and pick the SSR template.

## TypeScript

Fluixi is written in TypeScript and ships full types. Configure JSX in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "@fluixi/jsx"
  }
}
```

## Ecosystem

| Package | Purpose |
| --- | --- |
| `@fluixi/core` | Framework façade: components, control flow, router, render |
| `@fluixi/reactive` | Signals, memos, effects, store: usable on its own |
| `@fluixi/dom` | The DOM rendering runtime |
| `@fluixi/compiler` | JSX and `` html`` `` → IR → direct DOM calls |
| `@fluixi/vite-plugin` | The compiler as a Vite plugin (rollup, esbuild and webpack adapters too) |
| `@fluixi/start` | SSR, streaming, SSG, file routing, server functions, deploy adapters |
| `@fluixi/router` | The routing core |
| `@fluixi/server` | Server rendering |
| `@fluixi/head` | Document head and SEO |
| `@fluixi/ts-plugin` | Editor support for `` html`` `` templates |
| `@fluixi/template-parser` | The `` html`` `` parser, standalone |
| `@fluixi/auth` · `@fluixi/session` | Auth bindings and sessions |
| `@fluixi/testing` · `@fluixi/devtools` | Test helpers, reactive-graph devtools |
| `@fluixi/cli` · `create-fluixi` | Generators and the app scaffolder |

## License

MIT

## Links

- [npm](https://www.npmjs.com/package/fluixi)
