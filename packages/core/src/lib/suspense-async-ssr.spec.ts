// @vitest-environment jsdom
/**
 * <Suspense> resolution under renderToStringAsync (async SSR), on current source.
 *
 * ── STATE ────────────────────────────────────────────────────────────────────
 * - <Suspense> + a plain createResource -> resolves to content.
 * - <Suspense> + a lazy() child whose module load is async (then the loaded child
 *   fetches its own resource) -> resolves to content. (was the storefront-route gap)
 *
 * ── How the lazy case resolves (the fix) ─────────────────────────────────────
 * The lazy child does not suspend via throw/catch, it's driven by the load
 * resource's trackPromise increment on the boundary. SuspenseImpl registers its
 * `triggerLazy` render effect in the boundary's resume `effects` list, so when the
 * load resolves and the boundary decrements to 0, resumeEffects() re-runs it during
 * the async drain -> the now-resolved child renders -> ITS own resource self-registers
 * in ctx.pending -> the drain awaits that too (a 2nd round). Before the fix, `effects`
 * was empty at decrement, so the resolved child only re-rendered at serialize time
 * (after the drain exited) and the FALLBACK got serialised.
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

  // The storefront route shape: a lazy() route whose loaded component then fetches
  // its own resource. Drives a 2-round drain (load -> child fetch). See file header.
  it('resolves a LAZY child + its resource (the storefront route shape)', async () => {
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
