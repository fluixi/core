import { Accessor, createEffect, createSignal } from '@fluixi/reactive';
import {
  childToTemplate,
  isTruthy,
  normalizeAccessor,
  renderContent,
} from './utils.js';
import type { Component } from '../../shared/types.js';
import { nothing, TemplateResult } from 'lit';

// type Match<T = unknown> = [Accessor<boolean>, () => T];

// class SwitchDirective extends Directive {
//   private dispose?: () => void;
//   private part!: ChildPart;
//   private value: unknown;

//   constructor(info: PartInfo) {
//     super(info);
//     if (info.type !== PartType.CHILD) {
//       throw new Error('switch() can only be used in child expressions');
//     }
//   }

//   render(_matches: Match[], _fallback?: () => unknown) {
//     if (this.dispose) this.dispose();

//     this.dispose = createEffect(() => {
//       let next: unknown = _fallback?.();

//       for (const [when, body] of _matches) {
//         if (when()) {
//           next = body();
//           break;
//         }
//       }

//       if (next !== this.value) {
//         this.value = next;
//         this.part?._$setValue(next);
//       }
//     });

//     for (const [when, body] of _matches) {
//       if (when()) return body();
//     }

//     return _fallback?.();
//   }

//   override update(
//     part: ChildPart,
//     args: [matches: Match[], fallback?: () => unknown]
//   ) {
//     this.part = part;
//     return this.render(...args);
//   }

//   disconnected() {
//     this.dispose?.();
//     this.dispose = undefined;
//   }
// }

// /**
//  * Usage example
//  * ```ts
//  *  ${$switch(
//  * [
//  *  [() => state === 'loading', () => html`Loading...`],
//  *  [() => state === 'error', () => html`Error`],
//  *  [() => state === 'ready', () => html`Ready`]
//  * ],
//  *  () => html`Idle`
//  * )}
//  * ```
//  */
// export const $switch = directive(SwitchDirective);
/**
 * Props for the Match component (used with Switch)
 */
export interface $MatchProps<T = any> {
  /**
   * Value to match against
   */
  when: T | Accessor<T>;

  /**
   * Children to render when matched
   */
  children: Component<T>;
}
/**
 * Match component - used inside Switch for pattern matching
 *
 * @template T - Type of the match value
 * @param {MatchProps<T>} props - Component props
 * @returns {never} This component should only be used inside Switch
 *
 * @example
 * ```typescript
 * // See Switch component for usage examples
 * ```
 */
export function $match<T>(props: $MatchProps<T>): never {
  throw new Error('Match must be used inside a Switch component');
}

/**
 * Props for the Switch component
 */
export interface $SwitchProps<T = any> {
  /**
   * Fallback content when no Match matches
   */
  fallback?: Component<T>;

  /**
   * Match components as children
   */
  children: Array<ReturnType<typeof $match>>;
}

/**
 * Switch component for multiple conditional branches
 *
 * Similar to a switch statement, renders the first matching Match component.
 *
 * @template T - Type of the condition values
 * @param {$SwitchProps<T>} props - Component props
 * @returns {TemplateResult | typeof nothing} Rendered template
 *
 * @example
 * ```typescript
 * const MyComponent = () => {
 *   const [status, setStatus] = createSignal<'loading' | 'success' | 'error'>('loading');
 *
 *   return html`
 *     ${Switch({
 *       fallback: html`<p>Unknown status</p>`,
 *       children: [
 *         Match({ when: () => status() === 'loading', children: html`<p>Loading...</p>` }),
 *         Match({ when: () => status() === 'success', children: html`<p>Success!</p>` }),
 *         Match({ when: () => status() === 'error', children: html`<p>Error!</p>` })
 *       ]
 *     })}
 *   `;
 * };
 * ```
 */
export function $switch<T>(
  props: $SwitchProps<T>
): TemplateResult | typeof nothing {
  const [current, setCurrent] = createSignal<Component<T>>(nothing as any);

  createEffect(() => {
    // Find first matching condition
    for (const child of props.children) {
      const matchProps = (child as any).props as $MatchProps<T>;
      if (!matchProps) continue;

      const whenAccessor = normalizeAccessor(matchProps.when);
      const condition = whenAccessor();

      if (isTruthy(condition)) {
        if (typeof matchProps.children === 'function') {
          const result = renderContent(() =>
            (matchProps.children as Function)(condition)
          );
          setCurrent(result);
        } else {
          setCurrent(renderContent(matchProps.children));
        }
        return;
      }
    }

    // No match found - render fallback
    if (props.fallback !== undefined) {
      const fallbackResult = renderContent(props.fallback);
      setCurrent(fallbackResult);
    } else {
      setCurrent(nothing as any);
    }
  });

  return childToTemplate(current());
}
