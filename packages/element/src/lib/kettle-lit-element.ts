/**
 * @fileoverview KettleLitElement — LitElement base class with KettleJS reactivity
 * @module @awc/element/kettle-lit-element
 */

import { LitElement } from 'lit';
import { createRoot } from '@awc/dom';
import { ensureElementIntegration, type ReactiveHost } from './base.js';

export abstract class KettleLitElement extends LitElement {
  private __dispose: (() => void) | null = null;
  private __viewResult: unknown = undefined;
  private __rootCreated = false;

  abstract view(): unknown;

  override connectedCallback(): void {
    super.connectedCallback();

    if (!this.__rootCreated) {
      this.__rootCreated = true;
      ensureElementIntegration();

      createRoot((dispose) => {
        this.__dispose = dispose;
        this.__viewResult = this.view();
      });
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();

    if (this.__dispose) {
      this.__dispose();
      this.__dispose = null;
    }
    this.__rootCreated = false;
    this.__viewResult = undefined;
  }

  override render(): unknown {
    return this.__viewResult;
  }
}
