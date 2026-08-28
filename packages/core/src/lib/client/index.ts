/**
 * @fileoverview Client-Side Rendering Entry Point for Fluixi
 * @module fluixi/client
 *
 * Implements client-side mounting and hydration logic using @fluixi/dom runtime.
 * Supports both JSX and Lit HTML.
 */

// import {
//   cleanupHydration,
//   deserializeHydrationData,
// } from '../server/hydration.js';
import {
  render as domRender,
  hydrate as domHydrate,
} from '@fluixi/dom';
// Registers core's version with the DOM runtime, which does the stamping. This entry is a
// separate subpath, so it does not otherwise load core's render — and without this the
// hydrate path stamped `fx-dom`/`fx-reactive` but never `fluixi`.
import '../render/versions.js';
import {
  deserializeHydrationData,
  setHydrating,
  cleanupHydration,
} from '../server/hydration.js';
import { render } from '../render/index.js';
import { ensureIntegration } from '../render/component.js';
import { createHead, setActiveHead, mountHead, stripHeadMarker } from '@fluixi/head';
ensureIntegration('client index');

// Connect the reactive system (signals, effects, batch) to the DOM runtime.
// Without this, createRenderEffect in @fluixi/dom is a one-shot call that never
// re-runs when signals change — breaking all JSX reactive updates.
// ensureIntegration();

/**
 * Mount application to DOM (Client-side Rendering)
 *
 * @param App Root component function
 * @param container DOM element to mount into
 *
 * @example
 * ```typescript
 * import { mount } from 'fluixi/client';
 * import App from './App';
 *
 * mount(() => App(), document.getElementById('root'));
 * ```
 */
export function mount(App: () => any, container: HTMLElement | null) {
  if (!container) {
    throw new Error('Container element not found for mount()');
  }

  // Use @fluixi/dom render which handles reactivity and supports Lit via registration
  domRender(() => App(), container);
}

export { hydrate } from '@fluixi/dom';

export interface StartClientOptions {
  /** CSS selector or HTMLElement for the app root. Default: '#app' */
  root?: string | HTMLElement;
  /** Force hydration mode. Default: auto-detect from __FLUIXI_HYDRATION__ marker */
  hydrate?: boolean;
  /**
   * The app's route tree (the same array passed to <Router routes={…}/>). When provided,
   * the lazy chunk(s) for the route matching the current URL are downloaded and awaited
   * BEFORE hydration, so each lazy file-route resolves synchronously and adopts the server
   * DOM in place (no fallback, no duplicate). Passing this also enables auto-hydration of a
   * server-rendered (non-empty) root, giving flash-free hydration with zero extra config.
   */
  routes?: any[];
}

/**
 * Standard entry point for client-side rendering or hydration.
 *
 * Auto-detects whether to hydrate (if server-rendered HTML is present)
 * or do a full client render.
 *
 * @example
 * ```ts
 * // entry-client.ts
 * import { startClient } from 'fluixi/client';
 * import App from './app';
 *
 * startClient(App);
 * ```
 */
export async function startClient(
  App: (props?: any) => any,
  options: StartClientOptions = {}
) {
  const container =
    typeof options.root === 'string'
      ? document.querySelector(options.root)
      : options.root ?? document.querySelector('#app');

  if (!container) {
    throw new Error(
      `[Fluixi] Mount container not found: ${options.root ?? '#app'}`
    );
  }

  // Hydrate when explicitly requested (`{ hydrate: true }`), when the server emits the
  // `__FLUIXI_HYDRATION__` marker, or — with a route tree in hand — when the mount root already
  // holds server-rendered content. A non-empty root means SSR/SSG ran, so reuse that DOM instead
  // of clearing and re-rendering (which flashes). Auto-hydration is gated on `routes` because
  // hydrating an app with async lazy file-routes is only safe once those chunks are preloaded
  // (below) — without the route tree we can't preload, so we fall back to the render() path. A
  // client-only app mounts into an empty `<div id="root">` (firstElementChild null) → client render.
  const hasServerDom =
    !!document.getElementById('__FLUIXI_HYDRATION__') ||
    (!!options.routes && (container as Element).firstElementChild != null);
  const shouldHydrate = options.hydrate ?? hasServerDom;

  // Active head registry for this document — seo()/useHead() during the app render register here;
  // mountHead reconciles it into <head> after mount (reusing server tags by key) and keeps it live.
  const head = createHead();
  setActiveHead(head);

  // Drop a stray `<!--fh:…-->` head-transport comment if the server left one in the mount root
  // (streaming / custom servers that don't lift it into <head>). It would otherwise be the cursor's
  // first node and strand hydration — rebuilding the whole tree as a duplicate. Harmless no-op when
  // the server already extracted it (the supported adapter/prerender/dev paths do).
  stripHeadMarker(container as Element);

  if (shouldHydrate) {
    // Preload the lazy chunk(s) for the current route so they resolve synchronously during the
    // hydration render — the lazy boundary then adopts the server DOM in place instead of
    // resolving a tick later and rebuilding a duplicate. Dynamic import keeps the router out of
    // client-only bundles that never pass `routes`.
    if (options.routes && options.routes.length) {
      const { preloadRoutes } = await import('../router/index.js');
      await preloadRoutes(options.routes, window.location.pathname);
    }
    deserializeHydrationData();
    setHydrating(true);
    domHydrate(() => App(), container as HTMLElement);
    // Handlers are now wired (delegated $$listeners attach during the hydration
    // render) — replay any events the user fired before hydration.
    replayEvents();
    setTimeout(() => {
      setHydrating(false);
      cleanupHydration();
    }, 100);
  } else {
    render(() => App(), container as HTMLElement);
  }

  mountHead(head);
}

/**
 * Replay events captured before hydration by the server's eventCaptureScript
 * (window.__FX_REPLAY__). Hydration REUSES the server DOM, so each recorded target
 * is still live — re-dispatch a synthetic event on it so the app's delegated
 * handlers fire. Discrete events only (click/input/change/submit/keydown). No-op
 * when the capture script wasn't emitted (no queue).
 */
function replayEvents(): void {
  if (typeof window === 'undefined') return;
  const w = window as any;
  if (typeof w.__FX_REPLAY_STOP__ === 'function') w.__FX_REPLAY_STOP__();
  const queue = w.__FX_REPLAY__;
  w.__FX_REPLAY__ = undefined;
  w.__FX_REPLAY_STOP__ = undefined;
  if (!Array.isArray(queue) || queue.length === 0) return;
  for (const rec of queue) {
    const target: any = rec && rec.target;
    // Skip targets dropped by a hydration mismatch (recreated, not reconnected).
    if (!target || target.isConnected === false || typeof target.dispatchEvent !== 'function') continue;
    const type: string = rec.type;
    const ev =
      type === 'click'
        ? new MouseEvent(type, { bubbles: true, cancelable: true })
        : new Event(type, { bubbles: true, cancelable: true });
    target.dispatchEvent(ev);
  }
}
