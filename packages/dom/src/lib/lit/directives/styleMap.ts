/**
 * @fileoverview Reactive styleMap directive for KettleJS / lit-html.
 *
 * Drop-in replacement for lit's `styleMap` that fully supports reactive values:
 *
 *   // Static
 *   style=${styleMap({ color: 'red', fontSize: '12px' })}
 *
 *   // Individual values as signals or functions
 *   style=${styleMap({ color: textColor, fontSize: () => size() + 'px' })}
 *
 *   // Whole map as a reactive accessor
 *   style=${styleMap(() => ({ color: textColor(), opacity: opacity() }))}
 *
 *   // CSS custom properties
 *   style=${styleMap({ '--accent': brandColor })}
 *
 * Architecture mirrors classMap: isolated createEffect per instance,
 * first-run skipped, subsequent runs diff prevValues vs nextValues and
 * call element.style.setProperty / removeProperty / camelCase assignment.
 */

import { directive, Directive, PartInfo, PartType } from 'lit/directive.js';
import { noChange } from 'lit';
import { createEffect, createRoot, untrack } from '@awc/reactive/signal';

// ── Types ─────────────────────────────────────────────────────────────────────

type StyleValue = string | number | null | undefined | (() => string | number | null | undefined);

export type StyleMapInput =
  | Record<string, StyleValue>
  | (() => Record<string, StyleValue>);

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveMap(input: StyleMapInput): Record<string, StyleValue> {
  return typeof input === 'function'
    ? (input as () => Record<string, StyleValue>)()
    : input;
}

function resolveStyleValue(val: StyleValue): string | null {
  const v = typeof val === 'function' ? val() : val;
  return v == null ? null : String(v);
}

/** camelCase → kebab-case, custom properties (--) pass through unchanged. */
function toCSS(prop: string): string {
  return prop.startsWith('--')
    ? prop
    : prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

function applyProp(style: CSSStyleDeclaration, prop: string, value: string | null): void {
  if (prop.startsWith('--')) {
    value == null
      ? style.removeProperty(prop)
      : style.setProperty(prop, value);
  } else {
    (style as any)[prop] = value ?? '';
  }
}

function resolveAllValues(input: StyleMapInput): Map<string, string | null> {
  const map = resolveMap(input);
  const result = new Map<string, string | null>();
  for (const [prop, val] of Object.entries(map)) {
    result.set(prop, resolveStyleValue(val));
  }
  return result;
}

// ── Directive ─────────────────────────────────────────────────────────────────

class ReactiveStyleMapDirective extends Directive {
  private _element: HTMLElement | undefined;
  private _disposeRoot: (() => void) | undefined;
  private _currentInput: StyleMapInput | undefined;
  private _prevValues = new Map<string, string | null>();

  constructor(partInfo: PartInfo) {
    super(partInfo);
    if (partInfo.type !== PartType.ATTRIBUTE) {
      throw new Error(
        '`styleMap()` can only be used in an attribute binding (style=${styleMap({...})})'
      );
    }
  }

  /** Returns inline style string for initial render. */
  render(input: StyleMapInput): string {
    const values = untrack(() => resolveAllValues(input));
    this._prevValues = values;
    const parts: string[] = [];
    for (const [prop, val] of values) {
      if (val != null) parts.push(`${toCSS(prop)}: ${val}`);
    }
    return parts.join('; ');
  }

  override update(part: any, [input]: [StyleMapInput]): string | typeof noChange {
    this._element = part.element as HTMLElement;

    if (this._currentInput === input && this._disposeRoot) return noChange;

    this._cleanup();
    this._currentInput = input;
    let isFirstRun = true;

    this._disposeRoot = createRoot((dispose) => {
      createEffect(() => {
        const nextValues = resolveAllValues(input);

        if (isFirstRun) {
          isFirstRun = false;
          this._prevValues = nextValues;
          return;
        }

        if (this._element) {
          const { style } = this._element;
          // Remove props no longer present.
          for (const [prop] of this._prevValues) {
            if (!nextValues.has(prop)) applyProp(style, prop, null);
          }
          // Apply new or changed values.
          for (const [prop, val] of nextValues) {
            if (val !== this._prevValues.get(prop)) applyProp(style, prop, val);
          }
        }

        this._prevValues = nextValues;
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
    this._prevValues = new Map();
  }

  disconnected() {
    this._cleanup();
  }

  reconnected() {
    // Effect will be recreated on next update().
  }
}

export const $styleMap = directive(ReactiveStyleMapDirective);
