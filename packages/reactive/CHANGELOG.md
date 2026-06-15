# @fluixi/reactive

## 0.4.0-next.2

### Minor Changes

- 97cc220: Add the keyed list-reconciliation primitives `mapArray`, `keyArray` and
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

### Patch Changes

- @fluixi/utils@0.4.0-next.2

## 0.4.0-next.1

### Patch Changes

- @fluixi/utils@0.4.0-next.1

## 0.4.0-next.0

### Minor Changes

- fd33c30: Fix infinite loop when a Suspense boundary resolves during/after disposal. A
  disposed computation could still be re-run — `renderToString()` of a `<Suspense>`
  whose child kicks off a fetching resource hung the process: disposing the root
  cancelled the resource's settle (it stayed loading), but the boundary's
  `decrement` (firing as the now-resolved promise settled) kept resuming the
  disposed effect, which re-threw the already-resolved promise → synchronous
  re-fire. `dispose()` now marks the computation and `updateComputation` skips
  disposed nodes, so a disposed computation never re-runs.
- 9effed1: Resource-data transport for hydration (no flash). `renderToStringAsync` now
  serializes resolved `createResource` values into an inline
  `<script>window.__FX_DATA__=…</script>`; on the client `hydrate()` seeds the
  matching resources (ids matched by creation order) so they don't refetch — the
  async data renders immediately instead of flashing through the loading fallback.
  Also extracts the DOM-reuse hydration out of `runtime.ts` into a dedicated
  `hydration.ts`.

### Patch Changes

- @fluixi/utils@0.4.0-next.0

## 0.3.0

### Patch Changes

- @fluixi/utils@0.3.0

## 0.2.1

### Patch Changes

- Updated dependencies [aa028bd]
  - @fluixi/utils@0.2.1

## 0.2.0

### Patch Changes

- @fluixi/utils@0.2.0

## 0.1.0

### Patch Changes

- @fluixi/utils@0.1.0

## 0.0.1

### Patch Changes

- @fluixi/utils@0.0.1
