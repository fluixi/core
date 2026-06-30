---
"@fluixi/dom": patch
---

Fix `mergeProps` to match Solid's contract: a later source's `undefined` no longer clobbers an earlier defined value — it falls through to it.

Previously `mergeProps` copied descriptors last-source-wins unconditionally, so `mergeProps({ value: 1 }, { value: undefined }).value` was `undefined`. Since the compiler emits `mergeProps(...spreads, baseProps)` for JSX spreads, `<div {...a} {...b} />` with `b.x === undefined` wiped `a.x`. It's now a lazy Proxy (like `splitProps`): keys resolve last-defined-wins across the union of sources, reactively (getter/signal-backed props re-read on every access, never snapshotted).

```ts
mergeProps({ value: 1 }, { value: undefined }).value; // 1 (was undefined)
mergeProps({ value: 1 }, { value: 2 }).value;         // 2
```
