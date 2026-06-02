/**
 * @fileoverview Shared integration and reactive root logic for element classes
 * @module @fluixi/element/base
 */

import {
  createRoot,
  createRenderEffect,
  createEffect,
  createMemo,
  onCleanup,
  batch,
  untrack,
  getOwner,
  runWithOwner,
} from '@fluixi/reactive/signal';
import {
  initializeIntegration,
  isIntegrationInitialized,
  registerLitRender,
  registerEffectCreator,
  registerBatch,
  insert,
} from '@fluixi/dom';
import { render as litRender } from 'lit';
import { applyStyles } from './utils.js';

// ============================================================================
// Shared integration — only runs if not already done by @fluixi/kettlejs
// ============================================================================

export function ensureElementIntegration(): void {
  if (isIntegrationInitialized()) return;
  console.log('ensure intergration from element')

  initializeIntegration({
    signalSystem: {
      createEffect: createRenderEffect,
      batch,
      createMemo,
      untrack,
      getOwner,
      runWithOwner,
      createRoot,
      onCleanup,
      createComponent: null as any,
    } as any,
  });

  registerEffectCreator(createEffect);
  registerBatch(batch);
  registerLitRender(litRender);
}

// ============================================================================
// Shared reactive root mixin logic
// ============================================================================

export interface ReactiveHost {
  __dispose: (() => void) | null;
  __connected: boolean;
}

export function createReactiveRoot(
  host: ReactiveHost,
  renderRoot: Element | ShadowRoot,
  viewFn: () => unknown
): void {
  ensureElementIntegration();

  createRoot((dispose) => {
    host.__dispose = dispose;
    const result = viewFn();
    insert(renderRoot, result as any);
  });
}

export function disposeReactiveRoot(host: ReactiveHost): void {
  if (host.__dispose) {
    host.__dispose();
    host.__dispose = null;
  }
  host.__connected = false;
}

export function attachShadow(
  el: HTMLElement,
  mode: 'open' | 'closed' | 'none',
  styles?: string | CSSStyleSheet | (string | CSSStyleSheet)[]
): HTMLElement | ShadowRoot {
  if (mode === 'none') return el;
  const root =
    (el as any).shadowRoot ??
    el.attachShadow({ mode: mode as 'open' | 'closed' });
  if (styles) applyStyles(root, styles);
  return root;
}

export {
  insert,
  createRoot,
  untrack,
  createEffect,
  createMemo,
  onCleanup,
  batch,
  getOwner,
  runWithOwner,
};
