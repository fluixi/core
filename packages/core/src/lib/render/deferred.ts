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
import { isHydrating, isServer, keepServerContent } from '@fluixi/dom';
import { createMemo, createSignal, untrack } from '@fluixi/reactive/signal';
import { observeIntersection } from '@fluixi/dom/utils';
import { lazy } from './lazy.js';
import { captureInteraction, type InteractionCapture } from './interaction-replay.js';



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
  // `null` only for `load:never` in a browser build: there is no code to fetch there.
  loader: (() => Promise<Record<string, unknown>>) | null,
  options: DeferredOptions,
): AnyComponent & { preload: () => Promise<void> } {
  const exportName = options.export ?? 'default';
  if (!loader) {
    const ServerOnly = (): unknown =>
      // What the server rendered stays while the page hydrates; a page reached in the browser
      // has none, and this component has no code here to render it with.
      isHydrating() ? keepServerContent() : null;
    ServerOnly.preload = (): Promise<void> => Promise.resolve();
    return ServerOnly;
  }

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
    if (options.strategy.kind === 'never') {
      if (isServer()) return Lazy(props);
      return isHydrating() ? keepServerContent() : null;
    }
    if (isServer() || options.strategy.kind === 'eager') return Lazy(props);

    const [ready, setReady] = createSignal(false);
    const start = (): void => {
      void Lazy.preload().then(() => setReady(true));
    };

    // Hydrating, the server already rendered the component in full: its nodes stay as they are
    // until the code arrives, rather than blanking until the trigger and showing up again (or,
    // for a media query that never matches, never). `visible` watches that content itself.
    if (isHydrating()) {
      let adopted = false;
      let capture: InteractionCapture | undefined;
      const keep = keepServerContent((nodes) => {
        if (adopted) return;
        adopted = true;
        const elements = nodes.filter((n): n is HTMLElement => n.nodeType === 1);
        // `interaction` listens on the component's own nodes when it has some, and plays what
        // happened there again once it renders.
        if (options.strategy.kind === 'interaction' && elements.length) {
          capture = captureInteraction(elements, options.strategy.events, start);
          return;
        }
        schedule(options.strategy, start, elements[0]);
      });
      // Not inside a slot that hands its nodes over: schedule without content to watch.
      queueMicrotask(() => {
        if (adopted) return;
        adopted = true;
        schedule(options.strategy, start);
      });
      return createMemo(
        () => {
          if (!ready()) return keep;
          const rendered = Lazy(props);
          // After the insert that puts the new nodes where the server's were.
          if (capture) queueMicrotask(() => capture!.replay(nodesOf(rendered)));
          return rendered;
        },
        undefined,
        { name: 'deferred' },
      );
    }

    // `visible` is the one strategy that needs something in the DOM to watch, so it
    // renders an anchor and observes that; the others key off global signals and can
    // render the plain fallback.
    const anchor = options.strategy.kind === 'visible' ? createAnchor() : undefined;
    // Rendered in the browser, `interaction` listens on the fallback when it is an element; with
    // nothing on the page to interact with, on the page.
    const fallback = options.fallback;
    const capture =
      options.strategy.kind === 'interaction' && typeof Element !== 'undefined' && fallback instanceof Element
        ? captureInteraction([fallback], options.strategy.events, start)
        : undefined;
    if (!capture) schedule(options.strategy, start, anchor);

    return createMemo(
      () => {
        if (!ready()) return anchor ?? fallback ?? null;
        const rendered = Lazy(props);
        if (capture) queueMicrotask(() => capture.replay(nodesOf(rendered)));
        return rendered;
      },
      undefined,
      { name: 'deferred' },
    );
  }

  Deferred.preload = Lazy.preload;
  return Deferred;
}

/** The nodes a rendered component produced, for the replay to find its targets in. */
function nodesOf(value: unknown): Node[] {
  const out: Node[] = [];
  const walk = (v: unknown): void => {
    if (typeof Node !== 'undefined' && v instanceof Node) out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (typeof v === 'function') walk(untrack(v as () => unknown));
  };
  walk(value);
  return out;
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
      // On the page: the component has no nodes of its own yet (rendered in the browser with
      // no element fallback). With nodes, `captureInteraction` listens on them instead.
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
