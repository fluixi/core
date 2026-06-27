# Introduction

Fluixi is a **fine-grained reactive** framework. Instead of re-rendering components and diffing a
virtual DOM, it builds a graph of **signals**, **derived values**, and **effects**, and updates
exactly the parts of your app that depend on the data that changed.

The reactive core — `@fluixi/reactive` — is a small, standalone library. It implements the
**TC39 Signals** model: a glitch-free, lazy, push-pull dependency graph you can use in the browser,
on the server, or entirely on its own.

## The three primitives

Almost everything is built from three primitives:

```ts
import { createSignal, createMemo, createEffect } from '@fluixi/reactive/signal';

const [count, setCount] = createSignal(0);       // state
const doubled = createMemo(() => count() * 2);   // derived
createEffect(() => console.log(doubled()));      // side effect
```

- A **signal** holds a value and tracks who reads it.
- A **memo** derives a value from other reactive sources and recomputes only when they change.
- An **effect** runs a side effect and re-runs when its reactive reads change.

## Why fine-grained?

When `setCount(1)` runs, Fluixi does not re-run your component. It walks the dependency graph,
recomputes `doubled`, and re-runs the single effect that read it — nothing else. No virtual DOM,
no diffing, no wasted work.

> See it live: the [Playground](https://playground.fluixi.com) visualizes the dependency graph as it
> propagates — watch signals, memos and effects light up.

Continue to **[Signals](/v1/en/signals)**, the core primitive.
