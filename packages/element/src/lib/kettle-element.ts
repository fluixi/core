/**
 * @fileoverview KettleElement — HTMLElement base class with KettleJS reactivity
 * @module @awc/element/kettle-element
 */

import {
  createReactiveRoot,
  disposeReactiveRoot,
  attachShadow,
  type ReactiveHost,
} from './base.js';

export abstract class KettleElement extends HTMLElement implements ReactiveHost {
  static styles?: string | CSSStyleSheet | (string | CSSStyleSheet)[];
  static shadow: 'open' | 'closed' | 'none' = 'open';

  __dispose: (() => void) | null = null;
  __connected = false;

  abstract view(): unknown;

  connectedCallback(): void {
    if (this.__connected) return;
    this.__connected = true;

    const ctor = this.constructor as typeof KettleElement;
    const renderRoot = attachShadow(this, ctor.shadow, ctor.styles);

    createReactiveRoot(this, renderRoot as Element, () => this.view());
  }

  disconnectedCallback(): void {
    disposeReactiveRoot(this);
  }
}
