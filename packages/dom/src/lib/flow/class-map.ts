import { Accessor, createMemo } from '@fluixi/reactive/signal';

/**
 * A single class condition: static boolean or a reactive function.
 */
export type ClassCondition =
  | boolean
  | null
  | undefined
  | Accessor<boolean | null | undefined>
  | (() => boolean | null | undefined);

/**
 * The classMap argument.
 * Can be a plain object (values may be reactive) or a function / signal
 * that returns the entire object reactively.
 */
export type ClassMapInput =
  | Record<string, ClassCondition>
  | Accessor<Record<string, ClassCondition>>
  | (() => Record<string, ClassCondition>);

/**
 * Framework-agnostic reactive class map.
 *
 * Returns a `createMemo` accessor that resolves to a space-separated
 * class string.  The memo re-evaluates whenever any reactive dependency
 * inside the map changes.
 *
 * Works in both JSX and html`` templates without renderer-specific code:
 *  - JSX:  `<div class={classMap({ active: isActive })} />`
 *  - html: `class=${classMap({ active: isActive })}`
 *
 * @example
 * // Static
 * classMap({ active: true, disabled: false })         // -> "active"
 *
 * // Per-key reactive values
 * classMap({ active: isActive, 'text-sm': () => size() === 'sm' })
 *
 * // Whole map reactive
 * classMap(() => ({ active: isActive(), error: hasError() }))
 *
 * // Mixed: combine a static base class with reactive conditions
 * classMap({ 'btn': true, 'btn-primary': isPrimary, 'btn-disabled': disabled })
 */
export function classMap(input: ClassMapInput): Accessor<string> {
  return createMemo(() => {
    const map =
      typeof input === 'function'
        ? (input as () => Record<string, ClassCondition>)()
        : input;

    const classes: string[] = [];

    for (const [cls, cond] of Object.entries(map)) {
      if (!cls) continue;
      const active =
        typeof cond === 'function' ? (cond as () => boolean | null | undefined)() : cond;
      if (active) classes.push(cls);
    }

    return classes.join(' ');
  }, undefined, { name: 'ClassMap' });
}
