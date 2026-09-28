/**
 * Properties, and the attributes that mirror them.
 *
 * A custom element has two ways in. A property assignment (`el.count = 3`) carries a
 * real value and is what a framework binding uses. An attribute (`count="3"`) carries
 * a string and is what HTML and a server render can express. Both have to land on the
 * same signal or the two go out of sync.
 *
 * Each declaration owns the conversion in one place, so the element never guesses.
 * `attribute: false` opts a property out of HTML entirely, which is the right answer
 * for anything a string cannot carry: a function, a Date, a large object.
 */
import { signal, type Accessor } from '@fluixi/reactive/signal';

export interface PropDeclaration<T> {
  /** Value before anything sets one. */
  readonly initial: T;
  /**
   * The attribute this mirrors, or false for a property with no HTML form.
   * Defaults to the property name lowercased.
   */
  readonly attribute: string | false;
  /** Write the property back out to the attribute whenever it changes. */
  readonly reflect: boolean;
  /** Attribute string to property value. `null` means the attribute was removed. */
  fromAttribute(value: string | null): T;
  /** Property value to attribute string. `null` removes the attribute. */
  toAttribute(value: T): string | null;
  /** Skip a write that would not change anything, so a reflect loop terminates. */
  equals(a: T, b: T): boolean;
}

export type PropsSchema = Record<string, PropDeclaration<never>>;

/** The reactive accessors an element exposes for its declared properties. */
export type PropAccessors<S extends Record<string, PropDeclaration<unknown>>> = {
  readonly [K in keyof S]: Accessor<S[K] extends PropDeclaration<infer T> ? T : never>;
};

export interface PropOptions<T> {
  attribute?: string | false;
  reflect?: boolean;
  equals?: (a: T, b: T) => boolean;
}

const same = <T>(a: T, b: T): boolean => a === b;

function declare<T>(
  initial: T,
  fromAttribute: (value: string | null) => T,
  toAttribute: (value: T) => string | null,
  options: PropOptions<T> = {},
): PropDeclaration<T> {
  return {
    initial,
    attribute: options.attribute ?? '',
    reflect: options.reflect ?? false,
    fromAttribute,
    toAttribute,
    equals: options.equals ?? same,
  };
}

/**
 * The built-in conversions.
 *
 * `boolean` follows HTML rather than JSON: presence is true, absence is false, and the
 * value is ignored, so `disabled=""` and `disabled="false"` are both true. Anything
 * else would disagree with every native element on the page.
 */
export const prop = {
  string: (initial = '', options: PropOptions<string> = {}) =>
    declare<string>(initial, (v) => v ?? initial, (v) => v, options),

  number: (initial = 0, options: PropOptions<number> = {}) =>
    declare<number>(
      initial,
      (v) => (v === null || v.trim() === '' ? initial : Number(v)),
      (v) => String(v),
      options,
    ),

  boolean: (initial = false, options: PropOptions<boolean> = {}) =>
    declare<boolean>(initial, (v) => v !== null, (v) => (v ? '' : null), options),

  /**
   * JSON in the attribute, the parsed value in the property.
   *
   * Unparseable text keeps the initial value rather than throwing: the attribute is
   * author-supplied and often mid-edit, and an exception in `attributeChangedCallback`
   * leaves the element half-upgraded.
   */
  object: <T>(initial: T, options: PropOptions<T> = {}) =>
    declare<T>(
      initial,
      (v) => {
        if (v === null) return initial;
        try {
          return JSON.parse(v) as T;
        } catch {
          return initial;
        }
      },
      (v) => (v === undefined ? null : JSON.stringify(v)),
      options,
    ),

  /** No attribute at all. For a value only a property assignment can carry. */
  any: <T>(initial: T, options: Omit<PropOptions<T>, 'attribute' | 'reflect'> = {}) =>
    declare<T>(initial, () => initial, () => null, { ...options, attribute: false }),
};

/** One property's signal plus the declaration that drives its attribute. */
export interface PropState<T> {
  read: Accessor<T>;
  write(value: T): void;
  declaration: PropDeclaration<T>;
  /** The attribute name, resolved from the property name when it was left blank. */
  attribute: string | false;
}

export function createPropStates(
  schema: Record<string, PropDeclaration<unknown>>,
): Record<string, PropState<unknown>> {
  const states: Record<string, PropState<unknown>> = {};
  for (const [name, declaration] of Object.entries(schema)) {
    // Named, so the devtools graph shows `step` rather than an anonymous signal.
    const value = signal(declaration.initial, { equals: declaration.equals, name });
    states[name] = {
      read: value,
      // `.set` reads a function argument as an updater and calls it. A property holding
      // a callback is ordinary for a custom element, so it is wrapped: the value
      // arrives as the return of an updater that ignores the previous one.
      write: (next: unknown) =>
        void (typeof next === 'function' ? value.set(() => next) : value.set(next as never)),
      declaration,
      attribute: declaration.attribute === '' ? name.toLowerCase() : declaration.attribute,
    };
  }
  return states;
}

/** The attribute names an element has to observe, derived from its schema. */
export function observedFrom(schema: Record<string, PropDeclaration<unknown>>): string[] {
  return Object.entries(schema)
    .map(([name, d]) => (d.attribute === '' ? name.toLowerCase() : d.attribute))
    .filter((a): a is string => a !== false);
}
