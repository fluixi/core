/**
 * Typing a custom element for its consumers.
 *
 * An element is a runtime registration, so nothing about it reaches TypeScript on its
 * own: `document.querySelector('my-counter')` is an `Element`, and `<my-counter count={1}/>`
 * in JSX is an error about an unknown tag. Both are fixed by declaring the element once,
 * and these types are what make that declaration short enough to write by hand.
 *
 * The prop schema already describes every value the element takes, so the types below
 * read it rather than asking for the same list twice.
 *
 * @example
 * ```ts
 * const schema = { step: prop.number(1) };
 * export const MyCounter = customElement('my-counter', setup, { props: schema });
 *
 * declare global {
 *   interface HTMLElementTagNameMap {
 *     'my-counter': ElementOf<typeof schema, { change: { value: number } }>;
 *   }
 *   interface JSXCustomElements {
 *     'my-counter': ElementAttributes<typeof schema, { change: { value: number } }>;
 *   }
 * }
 * ```
 */
import type { PropDeclaration } from './props.js';

/** The value each declared prop holds. */
export type PropValues<S extends Record<string, PropDeclaration<unknown>>> = {
  [K in keyof S]: S[K] extends PropDeclaration<infer T> ? T : never;
};

/**
 * The DOM interface for an element with this schema.
 *
 * Goes in `HTMLElementTagNameMap`, which is what gives `querySelector` and
 * `createElement` the right type.
 */
export type ElementOf<
  S extends Record<string, PropDeclaration<unknown>>,
  _Events extends Record<string, unknown> = Record<string, never>,
> = HTMLElement & PropValues<S>;

/** `{ change: Detail }` becomes `{ onChange?: (event: CustomEvent<Detail>) => void }`. */
type EventHandlers<E extends Record<string, unknown>> = {
  [K in keyof E & string as `on${Capitalize<K>}`]?: (event: CustomEvent<E[K]>) => void;
};

/**
 * What JSX accepts on the tag.
 *
 * Every declared prop, optional, plus a handler per dispatched event, plus the global
 * attributes any element takes. Props are accepted as their real type rather than as
 * strings: the runtime sets them as properties, so a number stays a number.
 */
export type ElementAttributes<
  S extends Record<string, PropDeclaration<unknown>>,
  E extends Record<string, unknown> = Record<string, never>,
> = Partial<PropValues<S>> &
  EventHandlers<E> & {
    children?: unknown;
    class?: string;
    id?: string;
    slot?: string;
    style?: string | Record<string, string | number>;
    ref?: unknown;
    [data: `data-${string}`]: unknown;
    [aria: `aria-${string}`]: unknown;
  };

/**
 * An element someone else wrote, for §16's other half.
 *
 * A third-party custom element has no Fluixi schema to read, so its properties are
 * spelled out. The event map still works, and so do the global attributes.
 */
export type ForeignElementAttributes<
  P extends Record<string, unknown> = Record<string, never>,
  E extends Record<string, unknown> = Record<string, never>,
> = Partial<P> &
  EventHandlers<E> & {
    children?: unknown;
    class?: string;
    id?: string;
    slot?: string;
    style?: string | Record<string, string | number>;
    ref?: unknown;
    [data: `data-${string}`]: unknown;
    [aria: `aria-${string}`]: unknown;
  };
