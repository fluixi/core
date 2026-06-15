---
"@fluixi/reactive": minor
"@fluixi/dom": minor
---

Add the keyed list-reconciliation primitives `mapArray`, `keyArray` and
`indexArray` (mirrors SolidJS) and rebuild `<For>`/`<Index>` on top of them.

- `mapArray(list, mapFn, { fallback? })` — reference-keyed; reuses an item's
  scope while the same value stays in the list, map fn gets the plain value + a
  reactive index. Backs `<For>`.
- `keyArray(list, keyFn, mapFn, { fallback? })` — key-function keyed; survives
  object recreation, map fn gets a live item accessor. Backs `<For by={…}>`.
- `indexArray(list, mapFn, { fallback? })` — index-keyed; growing adds slots,
  shrinking disposes trailing slots, a value change updates the slot signal
  without re-running the map fn. Backs `<Index>`.

Each mapped item lives in its own `createRoot`, so list items have a stable,
disposable owner scope. `<For>`/`<Index>` are now thin wrappers over these
(and a stray debug `console.log` in the keyed `<For>` path is gone). Exported
from `@fluixi/reactive/signal` and re-exported from `@fluixi/dom`.
