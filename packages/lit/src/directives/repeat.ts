/**
 * @fileoverview Reactive `repeat` directive for Fluixi / lit-html.
 *
 * Drop-in replacement for lit's `repeat` where the items array can be a
 * reactive signal or accessor.  When the array changes, lit's keyed reconciler
 * is re-invoked via `_$setValue` so DOM nodes are efficiently reused.
 *
 *   // Static array (same as lit's repeat)
 *   ${repeat(items, (i) => i.id, (i) => html`<li>${i.name}</li>`)}
 *
 *   // Reactive signal / accessor
 *   ${repeat(itemsSignal, (i) => i.id, (i) => html`<li>${i.name}</li>`)}
 *   ${repeat(() => items(), (i) => i.id, (i) => html`<li>${i.name}</li>`)}
 *
 * keyFn and template are intentionally static — pass a stable function reference.
 * If either needs to be reactive, wrap the whole expression in litrx().
 */

import { directive, Directive, PartInfo, PartType } from 'lit/directive.js';
import { noChange } from 'lit';
import {
  repeat as litRepeat,
  type KeyFn,
  type ItemTemplate,
} from 'lit/directives/repeat.js';
import { createEffect, createRoot, untrack } from '@fluixi/reactive/signal';

// ── Types ─────────────────────────────────────────────────────────────────────

type RepeatItems<T> = T[] | (() => T[]);

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveItems<T>(items: RepeatItems<T>): T[] {
  return typeof items === 'function' ? (items as () => T[])() : items;
}

// ── Directive ─────────────────────────────────────────────────────────────────

class ReactiveRepeatDirective extends Directive {
  private _part: any;
  private _disposeRoot: (() => void) | undefined;
  private _currentItems: RepeatItems<any> | undefined;

  constructor(partInfo: PartInfo) {
    super(partInfo);
    if (partInfo.type !== PartType.CHILD) {
      throw new Error('`repeat()` can only be used in child content bindings');
    }
  }

  render<T>(items: RepeatItems<T>, keyFn: KeyFn<T>, template: ItemTemplate<T>): any {
    return untrack(() => litRepeat(resolveItems(items), keyFn, template));
  }

  override update(
    part: any,
    [items, keyFn, template]: [RepeatItems<any>, KeyFn<any>, ItemTemplate<any>]
  ): any {
    this._part = part;

    // Same items ref + active effect → let the effect handle updates.
    if (this._currentItems === items && this._disposeRoot) return noChange;

    this._cleanup();
    this._currentItems = items;
    let isFirstRun = true;

    this._disposeRoot = createRoot((dispose) => {
      createEffect(() => {
        const resolved = resolveItems(items);
        const result = litRepeat(resolved, keyFn, template);

        if (isFirstRun) {
          isFirstRun = false;
          return;
        }

        try {
          this._part._$setValue(result);
        } catch {
          // Part ejected from DOM — skip silently.
        }
      });

      return dispose;
    });

    return this.render(items, keyFn, template);
  }

  private _cleanup() {
    if (this._disposeRoot) {
      this._disposeRoot();
      this._disposeRoot = undefined;
    }
    this._currentItems = undefined;
  }

  disconnected() {
    this._cleanup();
  }

  reconnected() {
    // Effect will be recreated on next update().
  }
}

// Cast to preserve the <T> generic signature expected at call sites.
export const repeat = directive(ReactiveRepeatDirective) as <T>(
  items: RepeatItems<T>,
  keyFn: KeyFn<T>,
  template: ItemTemplate<T>
) => unknown;
