import { Accessor, createMemo } from '@awc/reactive/signal';

/**
 * A single style property value — static or reactive.
 * Numbers are converted to strings as-is (no `px` appended automatically).
 */
export type StyleValue =
  | string
  | number
  | null
  | undefined
  | Accessor<string | number | null | undefined>
  | (() => string | number | null | undefined);

/**
 * The styleMap argument.
 * Can be a plain object (values may be reactive) or a function / signal
 * that returns the entire object reactively.
 *
 * Keys should be camelCase (`backgroundColor`) or CSS custom properties
 * (`--my-color`).  camelCase keys are converted to kebab-case automatically.
 */
export type StyleMapInput =
  | Record<string, StyleValue>
  | Accessor<Record<string, StyleValue>>
  | (() => Record<string, StyleValue>);

/** camelCase → kebab-case; CSS custom properties (--) pass through unchanged. */
function toKebab(prop: string): string {
  return prop.startsWith('--')
    ? prop
    : prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

/**
 * Framework-agnostic reactive style map.
 *
 * Returns a `createMemo` accessor that resolves to an inline style string.
 * The memo re-evaluates whenever any reactive dependency inside the map
 * changes.
 *
 * Works in both JSX and lit-html without any renderer-specific code:
 *  - JSX:      `<div style={styleMap({ color: textColor })} />`
 *  - lit-html: `style=${styleMap({ color: textColor })}`
 *
 * For lit-html the `processValues` helper detects the memo (via `$SIGNAL`)
 * and wraps it with `litrx` automatically.
 *
 * @example
 * // Static
 * styleMap({ color: 'red', fontSize: '14px' })
 *
 * // Per-property reactive values
 * styleMap({ color: textColor, opacity: () => opacity() })
 *
 * // Whole map reactive
 * styleMap(() => ({ color: textColor(), '--accent': brand() }))
 *
 * // camelCase is converted automatically
 * styleMap({ backgroundColor: '#fff', fontSize: '1rem' })
 * // → "background-color: #fff; font-size: 1rem"
 *
 * // CSS custom properties pass through unchanged
 * styleMap({ '--radius': radius })
 * // → "--radius: 8px"
 */
export function styleMap(input: StyleMapInput): Accessor<string> {
  return createMemo(() => {
    const map =
      typeof input === 'function'
        ? (input as () => Record<string, StyleValue>)()
        : input;

    const parts: string[] = [];

    for (const [prop, val] of Object.entries(map)) {
      if (!prop) continue;
      const resolved =
        typeof val === 'function'
          ? (val as () => string | number | null | undefined)()
          : val;
      if (resolved != null) {
        parts.push(`${toKebab(prop)}: ${resolved}`);
      }
    }

    return parts.join('; ');
  });
}
