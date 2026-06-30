---
"@fluixi/dom": minor
"@fluixi/core": minor
---

Solid-compatible prop helpers + component typing, and re-export them from `@fluixi/core`.

**`mergeProps` (dom):** a later source's `undefined` no longer clobbers an earlier defined value — it falls through to it (Solid's contract). Previously `mergeProps(defaults, props)` lost `defaults` whenever `props.x` was `undefined`, and since the compiler emits `mergeProps(...spreads, baseProps)` for JSX spreads, `<div {...a} {...b} />` with `b.x === undefined` wiped `a.x`. It's now a lazy Proxy (like `splitProps`): keys resolve last-defined-wins across the union of sources, reactively (getter/signal-backed props re-read on every access, never snapshotted).

```ts
mergeProps({ value: 1 }, { value: undefined }).value; // 1 (was undefined)
mergeProps({ value: 1 }, { value: 2 }).value;         // 2
```

**`Component` typing (dom):** `Component<P>` is now a proper function type — `(props: P) => …` — so you can annotate it and have `props` actually typed:

```ts
const Greeting: Component<{ name: string }> = (props) => <h1>{props.name}</h1>;
```

Previously `Component<P>` was `ComponentFn<P> | ComponentChild` (which includes `any`), erasing all prop checking. Fluixi-branded helper types: `FxComponent`/`FxC` (aliases of `Component`), `FxParent`/`FxParentProps` (optional children), `FxVoid`/`FxVoidProps` (no children), `FxFlow`/`FxFlowProps` (required children), and `ComponentOrElement` for the loose "function-or-rendered-node" shape some internals pass around.

**`@fluixi/core` re-exports:** `mergeProps`, `splitProps`, and the component/prop types (`Component`, `ComponentProps`, `ComponentFn`, `ComponentChild`, `ComponentOrElement`, `FxComponent`, `FxC`, `Fx{Parent,Void,Flow}` + their `*Props`) are now exported from `@fluixi/core` — no more reaching into `@fluixi/dom` for them.
