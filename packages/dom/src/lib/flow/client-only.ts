import { createMemo, createSignal } from '@fluixi/reactive/signal';
import { isServer } from '../dom/server/host.js';
import { hydration } from '../dom/hydration-state.js';
import type { ComponentChild } from '../shared/types.js';

export interface ClientOnlyProps {
  /**
   * Rendered instead of `children` on the server, and during hydration.
   *
   * When hydrating, this must produce the same markup the server emitted —
   * that is the whole point: the fallback is what both sides agree on.
   */
  fallback?: ComponentChild;
  /** Content rendered only in the browser. */
  children?: ComponentChild;
}

/**
 * Renders `children` only in the browser.
 *
 * For subtrees that cannot render on the server — they read `window`,
 * `localStorage`, a canvas, or produce time/locale-dependent output that would
 * differ between the two passes and corrupt hydration.
 *
 * The swap is deferred to a microtask rather than done immediately, because
 * rendering `children` mid-hydration would desync the hydration cursor from the
 * server markup — the exact bug this component exists to prevent. `hydrate()`
 * runs synchronously and clears its flag in a `finally`, so a microtask is the
 * first moment the pass is guaranteed to be over.
 *
 * Outside hydration (a plain client render) there is nothing to match, so
 * `children` render straight away and `fallback` is never shown.
 *
 * @example JSX
 * <ClientOnly fallback={<Skeleton />}>
 *   <Chart data={points()} />
 * </ClientOnly>
 *
 * @example html``
 * ClientOnly({ fallback: html`<div class="skeleton"></div>`, children: () => html`<x-chart></x-chart>` })
 */
export function ClientOnly(props: ClientOnlyProps): ComponentChild {
  if (isServer) return props.fallback ?? null;

  // Captured now, not read inside the memo: `hydration.active` is a global that
  // flips when the pass ends, and this subtree's behaviour is decided by whether
  // it was created during hydration.
  const hydrating = hydration.active;
  const [ready, setReady] = createSignal(!hydrating);

  if (hydrating) queueMicrotask(() => setReady(true));

  return createMemo(() => (ready() ? props.children : (props.fallback ?? null)), undefined, {
    name: 'client-only',
  });
}

/**
 * `NoSsr` is {@link ClientOnly} — the same component under the name used by
 * other libraries, so the concept is findable either way.
 */
export const NoSsr = ClientOnly;
export type NoSsrProps = ClientOnlyProps;
