/**
 * `deferred(loader, options)`, a component whose module is fetched on a schedule.
 *
 * This is the runtime half of the `load:` directive. It adds only the *when*: which
 * browser signal starts the download. Resolution, Suspense integration and the
 * synchronous-when-preloaded hydration path all come from {@link lazy}, reused unchanged
 *, so a deferred component behaves exactly like a lazy one once its trigger fires.
 *
 * There is no registry and no runtime name lookup. The compiler emits a call with a
 * literal `import()`, which is what lets the bundler do chunking, hashing and
 * tree-shaking as ordinary behaviour rather than as an integration.
 */
import { isServer } from '@fluixi/dom';
import { createMemo, createSignal } from '@fluixi/reactive/signal';
import { observeIntersection } from '@fluixi/dom/utils';
import { lazy } from './lazy.js';



/** When to fetch. Mirrors the compiler's `IRLoadStrategy`. */
export type LoadStrategy =
  | { kind: 'eager' }
  | { kind: 'idle' }
  | { kind: 'visible'; rootMargin?: string }
  | { kind: 'interaction'; events: string[] }
  | { kind: 'media'; query: string }
  | { kind: 'never' };

export interface DeferredOptions {
  strategy: LoadStrategy;
  /** Named export to take from the module. Defaults to `default`. */
  export?: string;
  /** Rendered until the module arrives. */
  fallback?: unknown;
}

type AnyComponent = (props: any) => any;

/**
 * Wrap a dynamic import so the component loads when its strategy says to.
 *
 * The returned component still exposes `preload()`, so a route or a hover handler can
 * pull the module forward regardless of the strategy.
 */
export function deferred(
  loader: () => Promise<Record<string, unknown>>,
  options: DeferredOptions,
): AnyComponent & { preload: () => Promise<void> } {
  const exportName = options.export ?? 'default';

  // `lazy` wants `{ default }`; the resolver imports named exports, so adapt here rather
  // than making every call site emit an adapter.
  const Lazy = lazy(
    () =>
      loader().then((mod) => {
        const component = mod[exportName];
        if (typeof component !== 'function') {
          throw new Error(
            `deferred(): module has no '${exportName}' export (got ${typeof component}).`,
          );
        }
        return { default: component as AnyComponent };
      }),
    { fallback: options.fallback },
  );

  function Deferred(props: Record<string, unknown>): unknown {
    // `never` is server-only: the component renders during SSR and its code is meant to
    // stay out of the client bundle entirely. The compiler is what actually drops it
    // this guard only stops the client from fetching it if one slips through.
    if (options.strategy.kind === 'never') return isServer() ? Lazy(props) : null;
    if (isServer() || options.strategy.kind === 'eager') return Lazy(props);

    const [ready, setReady] = createSignal(false);
    const start = (): void => {
      void Lazy.preload().then(() => setReady(true));
    };

    // `visible` is the one strategy that needs something in the DOM to watch, so it
    // renders an anchor and observes that; the others key off global signals and can
    // render the plain fallback.
    const anchor = options.strategy.kind === 'visible' ? createAnchor() : undefined;
    schedule(options.strategy, start, anchor);

    return createMemo(() => (ready() ? Lazy(props) : (anchor ?? options.fallback ?? null)), undefined, {
      name: 'deferred',
    });
  }

  Deferred.preload = Lazy.preload;
  return Deferred;
}

/**
 * A zero-height marker to observe. It occupies the component's slot until the module
 * arrives, so `IntersectionObserver` has something with a position to report.
 */
function createAnchor(): HTMLElement {
  const el = document.createElement('span');
  el.setAttribute('data-fx-load', 'visible');
  el.style.display = 'block';
  return el;
}

/** Run `start` when the strategy's trigger fires. Idempotent, it fires at most once. */
function schedule(strategy: LoadStrategy, start: () => void, anchor?: HTMLElement): void {
  let fired = false;
  const once = (): void => {
    if (fired) return;
    fired = true;
    start();
  };

  switch (strategy.kind) {
    case 'idle': {
      const ric = (globalThis as { requestIdleCallback?: (cb: () => void) => void })
        .requestIdleCallback;
      // Safari has no requestIdleCallback; a timeout keeps the behaviour rather than
      // silently loading eagerly.
      if (ric) ric(once);
      else setTimeout(once, 1);
      return;
    }

    case 'visible': {
      // Without an observer there is no signal to wait for, so load rather than never
      // rendering, a missing capability should degrade to eager, not to broken.
      if (!anchor || typeof IntersectionObserver === 'undefined') {
        once();
        return;
      }
      const stop = observeIntersection(
        anchor,
        (isIntersecting) => {
          if (!isIntersecting) return;
          stop();
          once();
        },
        { rootMargin: strategy.rootMargin ?? '0px' },
      );
      return;
    }

    case 'interaction': {
      // Listened for on the document rather than the element: the point is the user's
      // first interaction anywhere, and the component often has no DOM yet.
      const handler = (): void => {
        for (const event of strategy.events) {
          document.removeEventListener(event, handler, true);
        }
        once();
      };
      for (const event of strategy.events) {
        document.addEventListener(event, handler, { capture: true, passive: true });
      }
      return;
    }

    case 'media': {
      if (typeof matchMedia === 'undefined') {
        once();
        return;
      }
      const query = matchMedia(strategy.query);
      if (query.matches) {
        once();
        return;
      }
      const onChange = (e: MediaQueryListEvent): void => {
        if (!e.matches) return;
        query.removeEventListener('change', onChange);
        once();
      };
      query.addEventListener('change', onChange);
      return;
    }

    /* c8 ignore next 3 */
    default:
      once();
  }
}
