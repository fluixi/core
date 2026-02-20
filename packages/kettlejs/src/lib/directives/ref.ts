/**
 * @fileoverview Ref directive for element references in KettleJS
 * @module @awc/kettlejs/directives/ref
 */

import { directive, Directive, PartInfo, PartType } from 'lit/directive.js';
import { noChange } from 'lit';

/**
 * Ref callback type
 */
export type RefCallback<T extends Element = Element> = (
  element: T | null
) => void;

/**
 * Ref object type
 */
export interface RefObject<T extends Element = Element> {
  current: T | null;
}

/**
 * Creates a ref object
 *
 * @template T - Element type
 * @returns {RefObject<T>} Ref object
 *
 * @example
 * ```typescript
 * import { createRef } from '@awc/kettlejs/directives';
 *
 * class MyElement extends KettleElement {
 *   private inputRef = createRef<HTMLInputElement>();
 *
 *   view() {
 *     return html`<input ${ref(this.inputRef)} />`;
 *   }
 *
 *   focusInput() {
 *     this.inputRef.current?.focus();
 *   }
 * }
 * ```
 */
export function createRef<T extends Element = Element>(): RefObject<T> {
  return { current: null };
}

class RefDirective extends Directive {
  private element: Element | null = null;
  private callback: RefCallback | RefObject | null = null;

  constructor(partInfo: PartInfo) {
    super(partInfo);
    if (partInfo.type !== PartType.ELEMENT) {
      throw new Error('The `ref` directive must be used on elements');
    }
  }

  render(ref: RefCallback | RefObject) {
    return noChange;
  }

  override update(part: any, [ref]: [RefCallback | RefObject]) {
    const element = part.element as Element;

    // If element changed, clear old ref
    if (element !== this.element) {
      if (this.callback) {
        this.setRef(this.callback, null);
      }
      this.element = element;
    }

    // If ref changed, update
    if (ref !== this.callback) {
      if (this.callback) {
        this.setRef(this.callback, null);
      }
      this.callback = ref;
      if (ref) {
        this.setRef(ref, element);
      }
    }

    return noChange;
  }

  disconnected() {
    if (this.callback) {
      this.setRef(this.callback, null);
    }
  }

  reconnected() {
    if (this.callback && this.element) {
      this.setRef(this.callback, this.element);
    }
  }

  private setRef(ref: RefCallback | RefObject, element: Element | null) {
    if (typeof ref === 'function') {
      ref(element);
    } else if (ref && 'current' in ref) {
      (ref as RefObject).current = element;
    }
  }
}

/**
 * Ref directive for getting element references
 *
 * @param {RefCallback | RefObject} ref - Ref callback or object
 * @returns Directive instance
 *
 * @example
 * ```typescript
 * import { ref, createRef } from '@awc/kettlejs/directives';
 *
 * // With ref object
 * const myRef = createRef<HTMLDivElement>();
 * html`<div ${ref(myRef)}>Content</div>`;
 *
 * // With callback
 * html`<div ${ref((el) => console.log('Element:', el))}>Content</div>`;
 * ```
 */
export const ref = directive(RefDirective);
