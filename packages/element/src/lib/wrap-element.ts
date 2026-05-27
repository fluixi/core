/**
 * @fileoverview wrapElement — creates a typed JSX component from a web component constructor.
 * Similar to @lit/react createComponent but for KettleJS JSX.
 * Types flow through the component function — no declare global needed.
 * Also works in lit-html and vanilla JS contexts.
 * @module @awc/element/wrap-element
 */

import type {
  KettleElementConstructor,
  PropDefinition,
  EventDefinition,
  InferPropType,
  ElementEventHandlers,
  KettleHTMLAttributes,
} from '@awc/dom/element';

type WrappedProps<
  P extends Record<string, PropDefinition>,
  E extends Record<string, EventDefinition> = Record<string, EventDefinition>
> = {
  [K in keyof P]?: InferPropType<P[K]> | (() => InferPropType<P[K]>);
} & ElementEventHandlers<E> & KettleHTMLAttributes;

type WrappedComponent<
  P extends Record<string, PropDefinition>,
  E extends Record<string, EventDefinition> = Record<string, EventDefinition>
> = (
  props?: WrappedProps<P, E>
) => HTMLElement;

/**
 * Create a typed JSX component function from a KettleElementConstructor.
 * The returned function can be used directly in JSX with full prop types.
 *
 * For JSX: `<Counter name="foo" />`
 * For lit-html: `html\`\${Counter({ name: 'foo' })}\``
 * For vanilla: `document.body.append(Counter({ name: 'foo' }))`
 */
export function wrapElement<
  Tag extends string,
  P extends Record<string, PropDefinition>,
  E extends Record<string, EventDefinition>
>(elementConstructor: KettleElementConstructor<Tag, P, E>): WrappedComponent<P, E> {
  const tagName = (elementConstructor as any).__tag as string | undefined;

  function WrappedElement(props?: WrappedProps<P, E>): HTMLElement {
    const tag = tagName || 'div';
    const el = document.createElement(tag);

    if (props) {
      for (const [key, value] of Object.entries(props)) {
        if (key === 'children' || key === 'ref') continue;
        if (key.startsWith('on') && typeof value === 'function') {
          el.addEventListener(
            key.slice(2).toLowerCase(),
            value as EventListener
          );
          continue;
        }
        if (key === 'class' || key === 'className') {
          el.setAttribute('class', String(value));
          continue;
        }
        if (key === 'style') {
          if (typeof value === 'object' && value !== null) {
            Object.assign((el as HTMLElement).style, value);
          } else {
            el.setAttribute('style', String(value));
          }
          continue;
        }
        const resolved =
          typeof value === 'function' ? (value as () => unknown)() : value;
        if (typeof (el as any).setProp === 'function') {
          (el as any).setProp(key, resolved);
        } else {
          el.setAttribute(key, String(resolved));
        }
      }

      if (props.ref) {
        if (typeof props.ref === 'function') {
          props.ref(el);
        } else if (
          props.ref &&
          typeof props.ref === 'object' &&
          'current' in props.ref
        ) {
          (props.ref as any).current = el;
        }
      }
    }

    return el;
  }

  // Store tag name on the function for runtime access
  (WrappedElement as any).__tag = tagName;

  return WrappedElement as WrappedComponent<P, E>;
}
