/**
 * @fileoverview Reactive `unsafeHTML` directive for KettleJS / lit-html.
 *
 * Drop-in replacement for lit's `unsafeHTML` that supports reactive values.
 * The HTML string may be a plain value, a signal, or any zero-arg function.
 * When the value changes, the inner HTML of the part is replaced.
 *
 * ⚠️  This directive injects raw HTML.  Never use it with untrusted input.
 *
 *   // Static (same as lit's unsafeHTML)
 *   ${unsafeHTML('<b>bold</b>')}
 *
 *   // Reactive signal / accessor
 *   ${unsafeHTML(htmlStringSignal)}
 *   ${unsafeHTML(() => renderMarkdown(content()))}
 */

import { directive, Directive, PartInfo, PartType } from 'lit/directive.js';
import { noChange } from 'lit';
import { unsafeHTML as litUnsafeHTML } from 'lit/directives/unsafe-html.js';
import { createEffect, createRoot, untrack } from '@fluixi/reactive/signal';

// ── Types ─────────────────────────────────────────────────────────────────────

type UnsafeHTMLInput = string | null | undefined | (() => string | null | undefined);

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveInput(input: UnsafeHTMLInput): string {
  const v = typeof input === 'function' ? (input as () => string | null | undefined)() : input;
  return v ?? '';
}

// ── Directive ─────────────────────────────────────────────────────────────────

class ReactiveUnsafeHTMLDirective extends Directive {
  private _part: any;
  private _disposeRoot: (() => void) | undefined;
  private _currentInput: UnsafeHTMLInput | undefined;
  private _prevResolved: string | undefined;

  constructor(partInfo: PartInfo) {
    super(partInfo);
    if (partInfo.type !== PartType.CHILD) {
      throw new Error('`unsafeHTML()` can only be used in child content bindings');
    }
  }

  render(input: UnsafeHTMLInput): any {
    const v = untrack(() => resolveInput(input));
    return litUnsafeHTML(v);
  }

  override update(part: any, [input]: [UnsafeHTMLInput]): any {
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
            this._part._$setValue(litUnsafeHTML(resolved));
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

export const unsafeHTML = directive(ReactiveUnsafeHTMLDirective);
