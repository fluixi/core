/**
 * @fileoverview Reactive `unsafeSVG` directive for Fluixi / lit-html.
 *
 * Drop-in replacement for lit's `unsafeSVG` that supports reactive values.
 * The SVG string may be a plain value, a signal, or any zero-arg function.
 * When the value changes, the SVG content of the part is replaced.
 *
 * This directive injects raw SVG.  Never use it with untrusted input.
 *
 *   // Static (same as lit's unsafeSVG)
 *   ${unsafeSVG('<circle cx="50" cy="50" r="40" />')}
 *
 *   // Reactive signal / accessor
 *   ${unsafeSVG(svgStringSignal)}
 *   ${unsafeSVG(() => buildIcon(iconName()))}
 */

import { directive, Directive, PartInfo, PartType } from 'lit/directive.js';
import { noChange } from 'lit';
import { unsafeSVG as litUnsafeSVG } from 'lit/directives/unsafe-svg.js';
import { createEffect, createRoot, untrack } from '@fluixi/reactive/signal';

// ── Types ─────────────────────────────────────────────────────────────────────

type UnsafeSVGInput = string | null | undefined | (() => string | null | undefined);

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveInput(input: UnsafeSVGInput): string {
  const v = typeof input === 'function' ? (input as () => string | null | undefined)() : input;
  return v ?? '';
}

// ── Directive ─────────────────────────────────────────────────────────────────

class ReactiveUnsafeSVGDirective extends Directive {
  private _part: any;
  private _disposeRoot: (() => void) | undefined;
  private _currentInput: UnsafeSVGInput | undefined;
  private _prevResolved: string | undefined;

  constructor(partInfo: PartInfo) {
    super(partInfo);
    if (partInfo.type !== PartType.CHILD) {
      throw new Error('`unsafeSVG()` can only be used in child content bindings');
    }
  }

  render(input: UnsafeSVGInput): any {
    const v = untrack(() => resolveInput(input));
    return litUnsafeSVG(v);
  }

  override update(part: any, [input]: [UnsafeSVGInput]): any {
    this._part = part;

    if (this._currentInput === input && this._disposeRoot) return noChange;

    this._cleanup();
    this._currentInput = input;
    let isFirstRun = true;

    this._disposeRoot = createRoot((dispose) => {
      createEffect(() => {
        const resolved = resolveInput(input);

        if (isFirstRun) {
          isFirstRun = false;
          this._prevResolved = resolved;
          return;
        }

        if (resolved !== this._prevResolved) {
          this._prevResolved = resolved;
          try {
            this._part._$setValue(litUnsafeSVG(resolved));
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
    this._prevResolved = undefined;
  }

  disconnected() {
    this._cleanup();
  }

  reconnected() {
    // Effect will be recreated on next update().
  }
}

export const unsafeSVG = directive(ReactiveUnsafeSVGDirective);
