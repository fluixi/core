/**
 * @fileoverview Reactive classMap directive for Fluixi / lit-html.
 *
 * Drop-in replacement for lit's `classMap` that fully supports reactive values:
 *
 *   // Static (same as lit's classMap)
 *   class=${classMap({ active: true, disabled: false })}
 *
 *   // Individual values as signals or functions
 *   class=${classMap({ active: isActive, 'text-sm': () => size() === 'sm' })}
 *
 *   // Whole map as a signal / accessor
 *   class=${classMap(() => ({ active: isActive(), error: hasError() }))}
 *
 * Architecture mirrors litrx:
 *  - render()  → untrack-evaluate the map and return the initial class string.
 *  - update()  → create ONE isolated createEffect per directive instance.
 *                The effect skips its first run (render() already committed
 *                the initial value). Subsequent runs diff prevClasses vs
 *                nextClasses and call classList.add / classList.remove.
 *  - cleanup() → disposes the root (and therefore the effect) when the
 *                element is disconnected or the directive is replaced.
 */

import { directive, Directive, PartInfo, PartType } from 'lit/directive.js';
import { noChange } from 'lit';
import { createEffect, createRoot, untrack } from '@fluixi/reactive/signal';

// ── Types ─────────────────────────────────────────────────────────────────────

/** A single class condition — static or reactive. */
type ClassCondition =
  | boolean
  | null
  | undefined
  | (() => boolean | null | undefined);

/**
 * The classMap argument.
 * Can be:
 *  - A plain object with static or reactive values per key.
 *  - A function / signal that returns the whole object reactively.
 */
export type ClassMapInput =
  | Record<string, ClassCondition>
  | (() => Record<string, ClassCondition>);

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Resolve the top-level map (may be a reactive accessor). */
function resolveMap(input: ClassMapInput): Record<string, ClassCondition> {
  return typeof input === 'function'
    ? (input as () => Record<string, ClassCondition>)()
    : input;
}

/** Resolve a single class condition value (may be a reactive accessor). */
function resolveCondition(val: ClassCondition): boolean {
  return Boolean(typeof val === 'function' ? val() : val);
}

/**
 * Evaluate the full map and return the set of active class names.
 * All reactive calls are tracked when called inside a reactive context.
 */
function resolveActiveClasses(input: ClassMapInput): Set<string> {
  const map = resolveMap(input);
  const active = new Set<string>();
  for (const [cls, cond] of Object.entries(map)) {
    if (cls && resolveCondition(cond)) active.add(cls);
  }
  return active;
}

/** Convert an active-class Set to a space-separated string. */
function setToString(classes: Set<string>): string {
  return Array.from(classes).join(' ');
}

// ── Directive ─────────────────────────────────────────────────────────────────

class ReactiveClassMapDirective extends Directive {
  private _element: Element | undefined;
  private _disposeRoot: (() => void) | undefined;
  private _currentInput: ClassMapInput | undefined;
  private _prevClasses = new Set<string>();

  constructor(partInfo: PartInfo) {
    super(partInfo);
    if (partInfo.type !== PartType.ATTRIBUTE) {
      throw new Error(
        '`classMap()` can only be used in an attribute binding (e.g. class=${classMap({...})})'
      );
    }
  }

  /**
   * Returns the initial class string without establishing any reactive tracking.
   * lit-html commits this value on the very first render.
   */
  render(input: ClassMapInput): string {
    const classes = untrack(() => resolveActiveClasses(input));
    this._prevClasses = classes;
    return setToString(classes);
  }

  /**
   * Called on every template update.
   * - Stores the element reference.
   * - If the input reference is unchanged and an effect is already running,
   *   returns noChange (the effect will push updates itself).
   * - Otherwise tears down the old effect and creates a new one inside an
   *   isolated createRoot so nested reactive trees don't bleed ownership.
   */
  override update(part: any, [input]: [ClassMapInput]): string | typeof noChange {
    this._element = part.element as Element;

    // Same input ref + active effect → let the effect handle updates.
    if (this._currentInput === input && this._disposeRoot) {
      return noChange;
    }

    this._cleanup();
    this._currentInput = input;

    let isFirstRun = true;

    this._disposeRoot = createRoot((dispose) => {
      createEffect(() => {
        const nextClasses = resolveActiveClasses(input);

        if (isFirstRun) {
          // render() already committed the initial value — skip DOM mutation.
          isFirstRun = false;
          this._prevClasses = nextClasses;
          return;
        }

        if (this._element) {
          const { classList } = this._element;

          // Remove classes that are no longer active.
          for (const cls of this._prevClasses) {
            if (!nextClasses.has(cls)) classList.remove(cls);
          }

          // Add newly active classes.
          for (const cls of nextClasses) {
            if (!this._prevClasses.has(cls)) classList.add(cls);
          }
        }

        this._prevClasses = nextClasses;
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
    this._prevClasses = new Set();
  }

  disconnected() {
    this._cleanup();
  }

  reconnected() {
    // The effect will be recreated on the next update() call.
  }
}

export const $classMap = directive(ReactiveClassMapDirective);
