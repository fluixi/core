# @fluixi/reactive

## 1.0.0-alpha.18

### Minor Changes

- 6ccf203: Add `@fluixi/reactive/signal-next` — the complete reactive API running on a TC39 Signals
  proposal-shaped core, as an **opt-in, additive** drop-in for `@fluixi/reactive/signal`.

  - **L0 graph core** (`Signal.State` / `Signal.Computed` / `Signal.subtle.Watcher`): class-based,
    lazy push-pull, glitch-free, equality-gated, error-caching — ported from the existing
    CLEAN/CHECK/DIRTY + version algorithm.
  - **L1 runtime** (the APIs TC39 omits): effects, owner tree (createRoot/onCleanup), scheduler,
    batch, and an owner-tree context.
  - **Full surface on the new core**: `createSignal/createMemo/createEffect/createComputed/
createRenderEffect/createRoot`, `onCleanup/batch/untrack/on`, `startTransition/useTransition`,
    `createContext/useContext/provide`, `createResource` (with the same `__FX_DATA__` SSR seeding +
    async-SSR drain, reusing the existing hooks), `Suspense` boundaries, and error boundaries.

  The legacy `@fluixi/reactive/signal` (`signal.ts`) and the store remain the default and the
  fallback — completely unchanged. Adopt `signal-next` to run on the new core; when a native
  `globalThis.Signal` ships, L0 becomes a thin polyfill swap under the same surface.

### Patch Changes

- @fluixi/utils@1.0.0-alpha.18

## 1.0.0-next.17

### Patch Changes

- @fluixi/utils@1.0.0-next.17

## 1.0.0-next.16

### Patch Changes

- @fluixi/utils@1.0.0-next.16

## 1.0.0-next.15

### Patch Changes

- @fluixi/utils@1.0.0-next.15

## 1.0.0-next.14

### Patch Changes

- @fluixi/utils@1.0.0-next.14

## 0.4.0-next.13

### Patch Changes

- @fluixi/utils@0.4.0-next.13

## 0.4.0-next.12

### Patch Changes

- @fluixi/utils@0.4.0-next.12

## 0.4.0-next.11

### Patch Changes

- @fluixi/utils@0.4.0-next.11

## 0.4.0-next.10

### Patch Changes

- @fluixi/utils@0.4.0-next.10

## 0.4.0-next.9

### Patch Changes

- @fluixi/utils@0.4.0-next.9

## 0.4.0-next.8

### Patch Changes

- @fluixi/utils@0.4.0-next.8

## 0.4.0-next.7

### Patch Changes

- 59aa5a9: Fix an infinite render loop on the client after hydration (regression in 0.4.0-next.6). The eager stale-effect scheduling added for `<Suspense>` async SSR is now gated to the server render only (`setEagerStaleEffects`, enabled inside `renderToStringAsync`). On the client the lazy stale-effect behavior is restored, so a memo↔effect cycle no longer spins forever.
  - @fluixi/utils@0.4.0-next.7

## 0.4.0-next.6

### Patch Changes

- 901c975: Fix async SSR of lazy routes rendered through the router `<Outlet/>`. `propagateDirty` now schedules a stale effect reached via a pure memo on signal write (matching the memo-recompute path), so a `<Suspense>` output re-renders when its boundary resolves; and `renderToStringAsync` probe-evaluates the lazily-built tree before draining so deferred route resources register and are awaited instead of serialising the fallback.
  - @fluixi/utils@0.4.0-next.6

## 0.4.0-next.5

### Patch Changes

- @fluixi/utils@0.4.0-next.5

## 0.4.0-next.4

### Patch Changes

- 21d2c18: ---

  "@fluixi/kettlejs": patch

  ***

  Tidy kettlejs internals: remove the dead `dev-server/` and `builder/` stubs and
  ~4,500 lines of extensionless router scratch files (`actual`/`curr`/`known`/`lts`/
  `rs`/`rt`) — all unexported and unimportable. No public API change.

- Updated dependencies [21d2c18]
  - @fluixi/utils@0.4.0-next.4

## 0.4.0-next.3

### Patch Changes

- @fluixi/utils@0.4.0-next.3

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
