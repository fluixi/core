/**
 * @fileoverview Reactive attribute directive for KettleJS / lit-html.
 *
 * Handles reactive values in ATTRIBUTE, PROPERTY, and BOOLEAN_ATTRIBUTE
 * binding positions.
 *
 * Unlike `litrx` (which uses `_$setValue` — unreliable for attribute parts),
 * `reactiveAttr` directly manipulates the DOM element on every signal change:
 *   ATTRIBUTE          → element.setAttribute / removeAttribute
 *   PROPERTY           → element[name] = value
 *   BOOLEAN_ATTRIBUTE  → element.toggleAttribute(name, bool)
 *
 * This makes attribute bindings fully reactive for the lifetime of the element,
 * not just on the first change.
 *
 * Usage (automatic via processValues — you rarely need to call this directly):
 *
 *   class=${signal}           // → reactiveAttr(signal)
 *   ?disabled=${() => bool}   // → reactiveAttr(() => bool)
 *   .value=${signal}          // → reactiveAttr(signal)
 *   href=${() => url()}       // → reactiveAttr(() => url())
 *
 * Architecture mirrors $classMap / $styleMap:
 *  - render()  → untrack the input and return the initial value for lit commit.
 *  - update()  → create ONE isolated createEffect per directive instance.
 *                First run is skipped (render() already committed the initial
 *                value). Subsequent runs directly mutate the DOM element.
 *  - cleanup() → dispose root (and effect) on disconnect or accessor change.
 */

import { directive, Directive, PartInfo, PartType } from 'lit/directive.js';
import { noChange } from 'lit';
import { createEffect, createRoot, untrack } from '@awc/reactive/signal';

// ── Types ─────────────────────────────────────────────────────────────────────

type AttrInput = any | (() => any);

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Resolve a reactive input to its final value.
 * When called inside a createEffect, signal/memo/resource reads establish
 * reactive dependencies automatically.
 */
function resolveValue(input: AttrInput): any {
  if (typeof input !== 'function') return input;
  // Call through all function layers (plain functions and reactive primitives).
  // Inside an effect, any signal reads here are tracked.
  let val = input();
  let depth = 0;
  while (typeof val === 'function' && depth < 10) {
    val = val();
    depth++;
  }
  return val;
}

/**
 * Commit a value to an element's attribute based on the part type.
 */
function commitAttr(
  element: Element,
  name: string,
  partType: PartType,
  value: any
): void {
  if (partType === PartType.PROPERTY) {
    (element as any)[name] = value;
  } else if (partType === PartType.BOOLEAN_ATTRIBUTE) {
    element.toggleAttribute(name, Boolean(value));
  } else {
    // ATTRIBUTE
    if (value == null || value === false) {
      element.removeAttribute(name);
    } else if (value === true) {
      element.setAttribute(name, '');
    } else {
      element.setAttribute(name, String(value));
    }
  }
}

// ── Directive ─────────────────────────────────────────────────────────────────

class ReactiveAttrDirective extends Directive {
  private _element: Element | undefined;
  private _attrName: string | undefined;
  private _partType: PartType | undefined;
  private _disposeRoot: (() => void) | undefined;
  private _currentInput: any = undefined;
  private _prevValue: any = Symbol('uninitialised');

  constructor(partInfo: PartInfo) {
    super(partInfo);
    if (
      partInfo.type !== PartType.ATTRIBUTE &&
      partInfo.type !== PartType.PROPERTY &&
      partInfo.type !== PartType.BOOLEAN_ATTRIBUTE
    ) {
      throw new Error(
        '`reactiveAttr` can only be used in attribute, property, or boolean-attribute bindings'
      );
    }
    this._partType = partInfo.type;
    this._attrName = (partInfo as any).name;
  }

  /**
   * Returns the initial (untracked) value so lit-html commits it on first render.
   */
  render(input: AttrInput): any {
    return untrack(() => resolveValue(input));
  }

  override update(part: any, [input]: [AttrInput]): any {
    this._element = part.element as Element;
    this._attrName = part.name as string;
    this._partType = part.type as PartType;

    // Same input reference + live effect → let the effect handle updates.
    if (this._currentInput === input && this._disposeRoot) {
      return noChange;
    }

    this._cleanup();
    this._currentInput = input;
    let isFirstRun = true;

    this._disposeRoot = createRoot((dispose) => {
      createEffect(() => {
        const value = resolveValue(input);

        if (isFirstRun) {
          // render() already committed the initial value — skip DOM mutation.
          isFirstRun = false;
          this._prevValue = value;
          return;
        }

        if (value === this._prevValue) return;
        this._prevValue = value;

        const el = this._element;
        const name = this._attrName;
        const partType = this._partType;
        if (!el || !name || partType == null) return;

        try {
          commitAttr(el, name, partType, value);
        } catch {
          // Element removed from DOM — skip silently.
        }
      });

      return dispose;
    });

    // Return initial value so lit-html renders correctly on first commit.
    return this.render(input);
  }

  private _cleanup() {
    if (this._disposeRoot) {
      this._disposeRoot();
      this._disposeRoot = undefined;
    }
    this._currentInput = undefined;
    this._prevValue = Symbol('uninitialised');
  }

  disconnected() {
    this._cleanup();
  }

  reconnected() {
    // Effect will be recreated on next update().
  }
}

export const reactiveAttr = directive(ReactiveAttrDirective);
