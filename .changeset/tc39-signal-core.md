---
"@fluixi/reactive": minor
---

Add `@fluixi/reactive/signal-next` — the complete reactive API running on a TC39 Signals
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
