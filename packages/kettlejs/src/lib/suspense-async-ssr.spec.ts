// @vitest-environment jsdom
/**
 * <Suspense> resolution under renderToStringAsync (async SSR), on current source.
 *
 * ── STATE ────────────────────────────────────────────────────────────────────
 * - <Suspense> + a plain createResource → resolves to content. ✅ (test below)
 * - <Suspense> + a lazy() child whose module load is async → still serialises the
 *   FALLBACK, not the content. ❌ (skipped test below) — this is what blocks the
 *   storefront's lazy routes from full route SSR (it stays on sync renderRequest).
 *
 * ── DIAGNOSIS of the lazy gap (traced) ───────────────────────────────────────
 * renderToStringAsync's drain awaits ctx.pending then flush()es. For the lazy case:
 *   1. sync render: the lazy memo reads its load resource -> throws the load promise
 *      -> Suspense fallback; the load promise is registered in ctx.pending.
 *   2. drain round 1 awaits the load promise; it resolves -> Suspense decrement.
 *   3. BUT the boundary's resume `effects` list is EMPTY at decrement: the lazy
 *      *memo* was never added to it (only render-effects with `c.suspense` are, and
 *      the load increment came from the resource's trackPromise, not the memo). So
 *      the lazy memo is NOT re-run during the drain -> Inner never renders during
 *      the drain -> Inner's own resource is never registered/awaited.
 *   4. The lazy memo only re-runs at serialize time (when the Suspense output is
 *      read), AFTER the drain exited -> Inner suspends at serialize -> the FALLBACK
 *      is what got serialised.
 * Fix sketch (needs care, touches reactive core + lazy + the drain): register the
 * suspended lazy memo in the boundary's resume list so it re-runs during the drain
 * (and cache its instantiated component so re-runs don't churn a fresh resource).
 * Partial attempts work for the plain case but the resume/scheduler timing for the
 * multi-step lazy->child-fetch case needs a dedicated pass.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createResource } from '@fluixi/reactive/signal';
import { renderToStringAsync, setServerMode } from '@fluixi/server';
import { Suspense } from './render/suspense.js';
import { lazy } from './render/lazy.js';
import { ensureIntegration, createComponent } from './render/component.js';

beforeAll(() => { ensureIntegration(); });

const tick = <T,>(v: T, ms = 5) => new Promise<T>((r) => setTimeout(() => r(v), ms));

describe('renderToStringAsync + Suspense', () => {
  it('resolves the boundary to content (plain resource)', async () => {
    function Data() {
      const [data] = createResource(() => tick('LOADED'));
      return () => data();
    }
    function App() {
      return createComponent(Suspense, { fallback: 'SPINNER', children: createComponent(Data, {}) });
    }

    setServerMode(true);
    const html = await renderToStringAsync(() => App());
    setServerMode(false);

    expect(html).toContain('LOADED');
    expect(html).not.toContain('SPINNER');
  });

  // KNOWN GAP — see file header. A lazy() child under <Suspense> serialises the
  // fallback under async SSR because the suspended lazy memo isn't resumed during
  // the drain. Un-skip when the lazy/Suspense async-resume fix lands.
  it.skip('resolves a LAZY child + its resource (the storefront route shape)', async () => {
    function Inner() {
      const [data] = createResource(() => tick('LAZY-LOADED'));
      return () => data();
    }
    const LazyInner = lazy(() => tick({ default: Inner }));
    function App() {
      return createComponent(Suspense, { fallback: 'SPINNER', children: createComponent(LazyInner as any, {}) });
    }

    setServerMode(true);
    const html = await renderToStringAsync(() => App());
    setServerMode(false);

    expect(html).toContain('LAZY-LOADED');
    expect(html).not.toContain('SPINNER');
  });
});
