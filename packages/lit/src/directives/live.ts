/**
 * @fileoverview Reactive `live` directive for KettleJS / lit-html.
 *
 * Drop-in replacement for lit's `live` that supports reactive values.
 * Like lit's `live`, it always checks the *current DOM value* before
 * committing — preventing overwrites when the DOM has diverged from the
 * signal (e.g. the user typed in an <input> while the signal still holds
 * the same string).
 *
 *   // Static (same as lit's live)
 *   .value=${live('hello')}
 *
 *   // Reactive signal / accessor
 *   .value=${live(nameSignal)}
 *   .value=${live(() => name())}
 *   ?checked=${live(isChecked)}
 *   name=${live(() => user().name)}
 *
 * Supported part types: ATTRIBUTE, PROPERTY, BOOLEAN_ATTRIBUTE.
 */

import { directive, Directive, PartInfo, PartType } from 'lit/directive.js';
import { noChange } from 'lit';
import { createEffect, createRoot, untrack } from '@fluixi/reactive/signal';

// ── Types ─────────────────────────────────────────────────────────────────────

type LiveInput<T> = T | (() => T);

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveInput<T>(input: LiveInput<T>): T {
  return typeof input === 'function' ? (input as () => T)() : input;
}

/**
 * Read the current committed value directly from the DOM.
 * Used to determine whether a new value would actually change anything.
 */
function readDOMValue(part: any): unknown {
  const { type, element, name } = part;
  if (type === PartType.PROPERTY) return (element as any)[name];
  if (type === PartType.BOOLEAN_ATTRIBUTE) return element.hasAttribute(name);
  return element.getAttribute(name);
}

/**
 * Returns true when `newValue` already matches the DOM — no update needed.
 */
function matchesDOMValue(part: any, newValue: unknown): boolean {
  const dom = readDOMValue(part);
  if (part.type === PartType.PROPERTY) return newValue === dom;
  if (part.type === PartType.BOOLEAN_ATTRIBUTE) return Boolean(newValue) === dom;
  // ATTRIBUTE: compare as strings, treating null/undefined as "not present"
  if (newValue == null) return dom === null;
  return String(newValue) === dom;
}

// ── Directive ─────────────────────────────────────────────────────────────────

class ReactiveLiveDirective extends Directive {
  private _part: any;
  private _disposeRoot: (() => void) | undefined;
  private _currentInput: any;

  constructor(partInfo: PartInfo) {
    super(partInfo);
    if (
      partInfo.type !== PartType.ATTRIBUTE &&
      partInfo.type !== PartType.PROPERTY &&
      partInfo.type !== PartType.BOOLEAN_ATTRIBUTE
    ) {
      throw new Error(
        '`live()` can only be used in attribute, property, or boolean-attribute bindings'
      );
    }
  }

  render<T>(input: LiveInput<T>): T {
    return untrack(() => resolveInput(input));
  }

  override update(part: any, [input]: [LiveInput<any>]): any {
    this._part = part;

    if (this._currentInput === input && this._disposeRoot) return noChange;

    this._cleanup();
    this._currentInput = input;
    let isFirstRun = true;

    this._disposeRoot = createRoot((dispose) => {
      createEffect(() => {
        const newValue = resolveInput(input);

        if (isFirstRun) {
          isFirstRun = false;
          return;
        }

        // Only commit if the DOM value has actually diverged.
        if (!matchesDOMValue(this._part, newValue)) {
          try {
            this._part._$setValue(newValue);
          } catch {
            // Part was ejected from DOM — skip silently.
          }
        }
      });

      return dispose;
    });

    return this.render(input);
  }

  private _cleanup() {
    if (this._disposeRoot) {
      this._disposeRoot();
      this._disposeRoot = undefined;
    }
    this._currentInput = undefined;
  }

  disconnected() {
    this._cleanup();
  }

  reconnected() {
    // Effect will be recreated on next update().
  }
}

export const live = directive(ReactiveLiveDirective);
