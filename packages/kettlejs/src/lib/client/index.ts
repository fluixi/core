/**
 * @fileoverview Client-Side Rendering Entry Point for KettleJS
 * @module @awc/kettlejs/client
 *
 * Implements client-side mounting and hydration logic using @awc/dom runtime.
 * Supports both JSX and Lit HTML.
 */

// import {
//   cleanupHydration,
//   deserializeHydrationData,
// } from '../server/hydration.js';
import {
  render as domRender,
  hydrate as domHydrate,
  registerLitRender,
} from '@awc/dom';
import { render as litRenderFn } from 'lit';
import {
  deserializeHydrationData,
  setHydrating,
  cleanupHydration,
} from '../server/hydration.js';
import { ensureIntegration } from '../render/component.js';
import { render } from '../render/index.js';

// console.log('client called')
// Register Lit support in @awc/dom
// This allows JSX/DOM engine to render Lit TemplateResults
// registerLitRender(litRenderFn);

// Connect the reactive system (signals, effects, batch) to the DOM runtime.
// Without this, createRenderEffect in @awc/dom is a one-shot call that never
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
 * import { mount } from '@awc/kettlejs/client';
 * import App from './App';
 *
 * mount(() => App(), document.getElementById('root'));
 * ```
 */
export function mount(App: () => any, container: HTMLElement | null) {
  if (!container) {
    throw new Error('Container element not found for mount()');
  }

  // Use @awc/dom render which handles reactivity and supports Lit via registration
  domRender(() => App(), container);
}

export { hydrate } from '@awc/dom';

export interface StartClientOptions {
  /** CSS selector or HTMLElement for the app root. Default: '#app' */
  root?: string | HTMLElement;
  /** Force hydration mode. Default: auto-detect from __KETTLE_HYDRATION__ marker */
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
 * import { startClient } from '@awc/kettlejs/client';
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
      `[KettleJS] Mount container not found: ${options.root ?? '#app'}`
    );
  }

  const shouldHydrate =
    options.hydrate ?? !!document.getElementById('__KETTLE_HYDRATION__');

  if (shouldHydrate) {
    deserializeHydrationData();
    setHydrating(true);
    domHydrate(() => App(), container as HTMLElement);
    setTimeout(() => {
      setHydrating(false);
      cleanupHydration();
    }, 100);
  } else {
    render(() => App(), container as HTMLElement);
  }
}
