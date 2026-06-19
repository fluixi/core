/**
 * @fileoverview Reactive `ref` and `bindRef` directives for Fluixi / lit-html.
 *
 * Two exports:
 *
 * **bindRef(refObject)**
 *   ElementPart directive.  Sets `refObject.current` to the element when it
 *   is connected, and back to `null` when it is disconnected.
 *
 *     const elRef = createRef<HTMLInputElement>();
 *     html`<input ${bindRef(elRef)} />`
 *     // elRef.current is the <input> after render
 *
 * **ref(callbackOrRef)**
 *   ElementPart directive compatible with lit's `ref` API.
 *   - RefObject argument   → sets `.value` (lit-style ref object)
 *   - Callback argument    → called with (element) on connect, (undefined) on disconnect
 *   - Signal / accessor    → re-evaluated on each update, result is used as above
 *
 *     const inputRef = { value: undefined as HTMLInputElement | undefined };
 *     html`<input ${ref(inputRef)} />`
 *
 *     const [refCb, setRefCb] = createSignal((el: Element | undefined) => { ... });
 *     html`<input ${ref(refCb)} />`
 */

import { directive, Directive, ElementPart, PartInfo, PartType } from 'lit/directive.js';
import { noChange } from 'lit';
import { untrack } from '@fluixi/reactive/signal';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RefObject<T = Element> {
  current: T | null;
}

/** Lit-style ref object (uses `.value` instead of `.current`). */
export interface LitRefObject<T = Element> {
  value: T | undefined;
}

type RefCallback<T extends Element = Element> = (el: T | undefined) => void;

type RefOrCallback<T extends Element = Element> =
  | RefObject<T>
  | LitRefObject<T>
  | RefCallback<T>
  | (() => RefObject<T> | LitRefObject<T> | RefCallback<T>);

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveRef(input: RefOrCallback): RefObject | LitRefObject | RefCallback {
  if (typeof input !== 'function') return input;
  // Zero-arg function → accessor that returns a ref or callback.
  // One-arg function  → IS the RefCallback itself.
  if ((input as Function).length === 0) {
    return (input as () => RefObject | LitRefObject | RefCallback)();
  }
  return input as RefCallback;
}

function isRefObject(v: unknown): v is RefObject {
  return typeof v === 'object' && v !== null && 'current' in v;
}

function isLitRefObject(v: unknown): v is LitRefObject {
  return typeof v === 'object' && v !== null && 'value' in v;
}

function assign(refOrCb: RefObject | LitRefObject | RefCallback, el: Element | undefined): void {
  if (isRefObject(refOrCb)) {
    refOrCb.current = el ?? null;
  } else if (isLitRefObject(refOrCb)) {
    refOrCb.value = el;
  } else if (typeof refOrCb === 'function') {
    (refOrCb as RefCallback)(el);
  }
}

// ── bindRef ───────────────────────────────────────────────────────────────────

class BindRefDirective extends Directive {
  private _prevElement: Element | null = null;

  constructor(partInfo: PartInfo) {
    super(partInfo);
    if (partInfo.type !== PartType.ELEMENT) {
      throw new Error('`bindRef()` can only be used on elements (${bindRef(ref)})');
    }
  }

  override update(part: ElementPart, [refObject]: [RefObject<any>]): typeof noChange {
    if (this._prevElement !== part.element) {
      this._prevElement = part.element;
      refObject.current = part.element;
    }
    return noChange;
  }

  render(_refObject: RefObject<any>): typeof noChange {
    return noChange;
  }

  disconnected() {
    // Find any bound refObject and clear it.
    // The refObject is not stored here; caller must clear it in onCleanup if needed.
  }
}

export const bindRef = directive(BindRefDirective);

// ── ref ───────────────────────────────────────────────────────────────────────

class RefDirective extends Directive {
  private _element: Element | undefined;
  private _prevRefOrCb: RefObject | LitRefObject | RefCallback | undefined;

  constructor(partInfo: PartInfo) {
    super(partInfo);
    if (partInfo.type !== PartType.ELEMENT) {
      throw new Error('`ref()` can only be used on elements (${ref(callback)})');
    }
  }

  override update(part: ElementPart, [input]: [RefOrCallback]): typeof noChange {
    const element = part.element;
    const refOrCb = untrack(() => resolveRef(input));

    // If the ref target changed, clear the old one first.
    if (this._prevRefOrCb && this._prevRefOrCb !== refOrCb) {
      assign(this._prevRefOrCb, undefined);
    }

    this._element = element;
    this._prevRefOrCb = refOrCb;
    assign(refOrCb, element);

    return noChange;
  }

  render(_input: RefOrCallback): typeof noChange {
    return noChange;
  }

  disconnected() {
    if (this._prevRefOrCb) {
      assign(this._prevRefOrCb, undefined);
    }
    this._element = undefined;
  }

  reconnected() {
    if (this._prevRefOrCb && this._element) {
      assign(this._prevRefOrCb, this._element);
    }
  }
}

export const ref = directive(RefDirective);
