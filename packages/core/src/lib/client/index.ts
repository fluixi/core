/**
 * @fileoverview Client-Side Rendering Entry Point for Fluixi
 * @module @fluixi/core/client
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
import {
  deserializeHydrationData,
  setHydrating,
  cleanupHydration,
} from '../server/hydration.js';
import { render } from '../render/index.js';
import { ensureIntegration } from '../render/component.js';
import { createHead, setActiveHead, mountHead } from '@fluixi/head';
ensureIntegration('client index');
// console.log('client called')
// Register Lit support in @fluixi/dom
// This allows JSX/DOM engine to render Lit TemplateResults
// registerLitRender(litRenderFn);

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
 * import { mount } from '@fluixi/core/client';
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
 * import { startClient } from '@fluixi/core/client';
 * import App from './app';
 *
 * startClient(App);
 * ```
 */
export function startClient(
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
  // `__FLUIXI_HYDRATION__` marker, OR — the common case — when the mount root already holds
  // server-rendered content (a non-empty root means SSR/SSG ran, so reuse that DOM instead of
  // clearing it and re-rendering, which causes a first-paint flash). A client-only app mounts
  // into an empty `<div id="root">`, so `firstElementChild` is null and it client-renders.
  // Lazy-route, text-ordering, component-children, and nested Router/Suspense/Outlet hydration
  // all reuse the server DOM in place (no duplication).
  const shouldHydrate =
    options.hydrate ??
    (!!document.getElementById('__FLUIXI_HYDRATION__') ||
      (container as Element).firstElementChild != null);

  // Active head registry for this document — seo()/useHead() during the app render register here;
  // mountHead reconciles it into <head> after mount (reusing server tags by key) and keeps it live.
  const head = createHead();
  setActiveHead(head);

  if (shouldHydrate) {
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
