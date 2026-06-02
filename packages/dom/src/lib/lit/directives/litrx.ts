/**
 * @fileoverview Reactive directive for KettleJS — fine-grained reactivity in Lit templates.
 *
 * Architecture:
 * - `render()` returns the INITIAL value (computed via untrack, no side effects).
 * - `update()` creates a reactive effect ONCE per accessor. The effect uses
 *   `_$setValue` to push changes to the DOM when signals change.
 * - The effect's FIRST run is skipped (isFirstRun flag) because `render()`
 *   already returns the initial value to lit-html.
 * - When `update` is called again with the SAME accessor, it returns `noChange`
 *   to avoid re-creating the effect or double-processing the template.
 * - `createRoot` isolates the effect's ownership so inner litrx effects
 *   (from nested templates) are NOT children of outer litrx effects.
 */

import { directive, Directive, PartInfo, PartType } from 'lit/directive.js';
import { noChange, ChildPart } from 'lit';
import {
  createEffect,
  isSignal,
  $SIGNAL,
  isResource,
  untrack,
  createRoot,
  isMemo,
} from '@fluixi/reactive/signal';
import type { Accessor } from '@fluixi/reactive/signal';
import { isPromise } from './utils.js';


function getSignal(accessor: any) {
  if (typeof accessor === 'function') {
    const node = accessor[Symbol.for('signal-node')]
    if (node) {
    console.log('initial accessor', node)
    }
  }
}

/**
 * Resolve a reactive accessor to its final non-function value.
 *
 * Two-phase unwrap:
 *  1. Read through signal/memo/resource chains (these are the reactive reads
 *     that effects must track).
 *  2. Unwrap remaining plain functions (thunks, closures).
 */
function resolveValue(accessor: any): any {
  let val = accessor;
  // Phase 1: Read through reactive primitives (signal → memo → resource chain).
  // Each call establishes a dependency when called inside an effect.
  while (typeof val === 'function' && !isSignal(val)) {
    val = val();
  }

  // Phase 2: Unwrap plain (non-reactive) function layers.
  let depth = 0;
  while (typeof val === 'function' && depth < 5) {
    val = val();
    depth++;
  }

  return val;
}

class ReactiveDirective extends Directive {
  private value: any = noChange;
  private disposeRoot?: () => void;
  private part!: ChildPart;
  private currentAccessor: any = undefined;

  constructor(partInfo: PartInfo) {
    super(partInfo);
    if (
      partInfo.type !== PartType.CHILD &&
      partInfo.type !== PartType.ATTRIBUTE &&
      partInfo.type !== PartType.PROPERTY &&
      partInfo.type !== PartType.BOOLEAN_ATTRIBUTE
    ) {
      throw new Error(
        'The `reactive` directive can only be used in text content, attributes, or properties'
      );
    }
  }

  /**
   * render() computes the INITIAL value only. No effects, no side effects.
   * This value is returned to lit-html for the first commit.
   */
  render(_accessor: Accessor<any> | any): any {
    const accessor = _accessor;
    if ((accessor as any)?._$litDirective$) return accessor;
    if (typeof accessor !== 'function') {
      return accessor;
    }

    // Compute initial value without reactive tracking.
    const initial = untrack(() => resolveValue(accessor));
    this.value = initial;
    return initial;
  }

  /**
   * update() is called on EVERY render (including the first).
   * - Sets this.part (needed for _$setValue)
   * - If the accessor is the same and we already have an effect → noChange
   * - Otherwise, creates a new effect inside createRoot (isolated ownership)
   */
  override update(part: ChildPart, [accessor]: any[]): any {
    this.part = part;

    // Non-function values: pass through directly
    if ((accessor as any)?._$litDirective$) return accessor;
    if (typeof accessor !== 'function') {
      return accessor;
    }


    
    // Same accessor with active effect → nothing to do.
    // The existing effect will push updates via _$setValue.
    if (this.currentAccessor === accessor && this.disposeRoot) {
      console.log('lit rex')
      return noChange;
    }

    // New accessor (or first time): tear down old effect, create new one.
    this.cleanup();
    this.currentAccessor = accessor;

    let isFirstRun = true;

    // Use createRoot to ISOLATE the effect's ownership.
    // Without this, effects created during _$setValue (for inner litrx
    // directives in nested templates) become children of THIS effect,
    // causing disposal cascades when the outer effect re-runs.
    // this.disposeRoot = createEffect(() => {
    //     try {
    //       const newValue = resolveValue(accessor);

    //       // console.log('new a')
    //       if (isFirstRun) {
    //         // Skip _$setValue on first run — render() returns the initial
    //         // value to lit-html. Calling _$setValue here would double-process
    //         // the template (especially TemplateResults with inner directives).
    //         isFirstRun = false;
    //         this.value = newValue;
    //         return;
    //       }

    //       // Subsequent runs: signal changed → push update to DOM.
    //       if (newValue !== this.value) {
    //         this.value = newValue;
    //         if (this.part) {
    //           try {
    //             if (typeof newValue !== 'undefined') {
    //               this.part._$setValue(newValue);
    //             }
    //           } catch {
    //             // Part was ejected from DOM — skip silently
    //           }
    //         }
    //       }
    //     } catch (error) {
    //       console.error('Error in reactive directive:', error);
    //     }
    //   });
    this.disposeRoot = createRoot((dispose) => {
      console.log('lit root')
      createEffect(() => {
        try {
          let newValue = accessor();
          while (typeof newValue === 'function') {
            newValue = newValue();
          }

          if (isFirstRun) {
            // console.log('new a', newValue)
            // Skip _$setValue on first run — render() returns the initial
            // value to lit-html. Calling _$setValue here would double-process
            // the template (especially TemplateResults with inner directives).
            isFirstRun = false;
            this.value = newValue;
            return;
          }

          // Subsequent runs: signal changed → push update to DOM.
          if (newValue !== this.value) {
            this.value = newValue;
            if (this.part) {
              try {
                if (typeof newValue !== 'undefined') {
                  this.part._$setValue(newValue);
                }
              } catch(error) {
                console.warn('dom part ejected', {error, part: this.part})
                // Part was ejected from DOM — skip silently
              }
            }else{
              console.warn('dom part not found', {part: this.part})
            }
          }
        } catch (error) {
          console.error('Error in reactive directive:', error);
        }
      });

      return dispose;
    });


    // Return the initial value for lit-html to commit.
    return this.render(accessor);
  }

  private cleanup() {
    if (this.disposeRoot) {
      this.disposeRoot();
      this.disposeRoot = undefined;
    }
    this.currentAccessor = undefined;
  }

  disconnected() {
    this.cleanup();
  }

  reconnected() {
    // Effect will be recreated on next update
  }
}

export const litrx = directive(ReactiveDirective);
