/**
 * @fileoverview Reactive `ifDefined` directive for Fluixi / lit-html.
 *
 * Drop-in replacement for lit's `ifDefined` that supports reactive values.
 * When the resolved value is `null` or `undefined` the attribute is removed
 * (lit's `nothing` sentinel). Otherwise the value is committed as-is.
 *
 *   // Static (same as lit's ifDefined)
 *   href=${ifDefined(maybeUrl)}
 *
 *   // Reactive signal / accessor
 *   href=${ifDefined(urlSignal)}
 *   href=${ifDefined(() => user()?.profileUrl)}
 *
 * Supported part types: ATTRIBUTE, PROPERTY, BOOLEAN_ATTRIBUTE.
 */

import { directive, Directive, PartInfo, PartType } from 'lit/directive.js';
import { noChange, nothing } from 'lit';
import { createEffect, createRoot, untrack } from '@fluixi/reactive/signal';

// ── Types ─────────────────────────────────────────────────────────────────────

type IfDefinedInput<T> = T | null | undefined | (() => T | null | undefined);

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveInput<T>(input: IfDefinedInput<T>): T | null | undefined {
  return typeof input === 'function'
    ? (input as () => T | null | undefined)()
    : input;
}

function toCommit<T>(raw: T | null | undefined): T | typeof nothing {
  return raw == null ? (nothing as unknown as typeof nothing) : raw;
}

// ── Directive ─────────────────────────────────────────────────────────────────

class ReactiveIfDefinedDirective extends Directive {
  private _part: any;
  private _disposeRoot: (() => void) | undefined;
  private _currentInput: any;
  private _prevRaw: any = Symbol('uninitialised');

  constructor(partInfo: PartInfo) {
    super(partInfo);
    if (
      partInfo.type !== PartType.ATTRIBUTE &&
      partInfo.type !== PartType.PROPERTY &&
      partInfo.type !== PartType.BOOLEAN_ATTRIBUTE
    ) {
      throw new Error(
        '`ifDefined()` can only be used in attribute or property bindings'
      );
    }
  }

  render<T>(input: IfDefinedInput<T>): T | typeof nothing {
    return untrack(() => toCommit(resolveInput(input)));
  }

  override update(part: any, [input]: [IfDefinedInput<any>]): any {
    this._part = part;

    if (this._currentInput === input && this._disposeRoot) return noChange;

    this._cleanup();
    this._currentInput = input;
    let isFirstRun = true;

    this._disposeRoot = createRoot((dispose) => {
      createEffect(() => {
        const raw = resolveInput(input);

        if (isFirstRun) {
          isFirstRun = false;
          this._prevRaw = raw;
          return;
        }

        // Commit only when the raw value changed.
        if (raw !== this._prevRaw) {
          this._prevRaw = raw;
          try {
            this._part._$setValue(toCommit(raw));
          } catch {
            // Part ejected from DOM — skip silently.
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
    this._prevRaw = Symbol('uninitialised');
  }

  disconnected() {
    this._cleanup();
  }

  reconnected() {
    // Effect will be recreated on next update().
  }
}

export const $ifDefined = directive(ReactiveIfDefinedDirective);
