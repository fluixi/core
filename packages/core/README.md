<p align="center">
  <img src="https://raw.githubusercontent.com/fluixi/assets/main/logos/128x128.png" alt="Fluixi" width="120" height="120" />
</p>

# @fluixi/core

**A modern, reactive UI framework with fine-grained reactivity, routing and SSR.**

[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](./LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
[![npm](https://img.shields.io/npm/v/@fluixi/core?logo=npm)](https://www.npmjs.com/package/@fluixi/core)

---

A modern, reactive UI framework with JSX, fine-grained reactivity, routing and SSR. Components compile to direct DOM operations — no virtual DOM, surgical updates.

## Features

- 🚀 **Fine-grained Reactivity** - Signals and memos drive surgical DOM updates, no virtual DOM
- 🧩 **JSX** - Compiled to direct DOM instructions via `@fluixi/vite-plugin`
- 🔄 **Control Flow Components** - Show, For, Switch, Portal, and Dynamic
- 🛣️ **Built-in Router** - Client-side routing with nested routes and lazy loading
- 📡 **Resource Management** - Async data fetching with automatic loading states + Suspense
- 🎭 **Context API** - Share state across component trees without prop drilling
- 🖥️ **SSR + Hydration** - Server rendering with flash-free hydration (via `@fluixi/start`)
- 🏗️ **TypeScript First** - Full type safety and excellent IDE support

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
import { createSignal, render } from '@fluixi/core';

const Counter = () => {
  const [count, setCount] = createSignal(0);

  return (
    <div>
      <h1>Count: {count()}</h1>
      <button onClick={() => setCount(count() + 1)}>Increment</button>
      <button onClick={() => setCount(count() - 1)}>Decrement</button>
      <button onClick={() => setCount(0)}>Reset</button>
    </div>
  );
};

render(() => <Counter />, document.getElementById('app')!);
```

> JSX is compiled by `@fluixi/vite-plugin`. Scaffold a ready-to-run app with `npm create fluixi`.

## Core Concepts

### Signals

Signals are reactive state. Reading one inside an effect or JSX subscribes to it; setting it updates only what depends on it.

```tsx
import { createSignal, createEffect } from '@fluixi/core';

const [count, setCount] = createSignal(0);
const [name, setName] = createSignal('Alice');

createEffect(() => {
  console.log(`${name()} counted to ${count()}`);
});

setCount(5);      // "Alice counted to 5"
setName('Bob');   // "Bob counted to 5"
```

### Components

Components are plain functions that return JSX. Props are reactive — read them where you use them.

```tsx
function Greeting(props: { name: string }) {
  return <h1>Hello, {props.name}!</h1>;
}

// <Greeting name="World" />
```

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

### Resources & Suspense

`createResource` fetches async data and tracks loading/error. `<Suspense>` shows a fallback while it's pending (works on the client and during SSR).

```tsx
import { createSignal, createResource, Suspense } from '@fluixi/core';

function UserCard() {
  const [id] = createSignal(1);
  const [user] = createResource(id, (id) =>
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
import { Router, Outlet, lazy } from '@fluixi/core/router-next';

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
  const [now, setNow] = createSignal(Date.now());

  onMount(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    onCleanup(() => clearInterval(id));
  });

  return <time>{new Date(now()).toLocaleTimeString()}</time>;
}
```

## Derived State & Batching

```tsx
import { createSignal, createMemo, batch } from '@fluixi/core';

const [first, setFirst] = createSignal('Ada');
const [last, setLast] = createSignal('Lovelace');

// Memo — cached, recomputes only when a dependency changes
const fullName = createMemo(() => `${first()} ${last()}`);

// Batch — coalesce multiple writes into one update
batch(() => {
  setFirst('Grace');
  setLast('Hopper');
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
| `@fluixi/core` | Framework façade — components, control flow, router, render |
| `@fluixi/reactive` | Signals, memos, effects, store |
| `@fluixi/dom` | The DOM rendering runtime |
| `@fluixi/start` | SSR, hydration, file routing, dev/build |
| `@fluixi/vite-plugin` | JSX compile (Vite) |
| `create-fluixi` | App scaffolder (`npm create fluixi`) |

## License

MIT

## Links

- [npm](https://www.npmjs.com/package/@fluixi/core)
