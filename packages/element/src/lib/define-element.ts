/**
 * @fileoverview defineElement() — primary functional API for KettleJS web components
 * @module @awc/element/define-element
 */

import { createSignal } from '@awc/dom';
import type {
  PropDefinition,
  EventDefinition,
  DefineElementOptions,
  ElementRenderFn,
  KettleElementConstructor,
} from '@awc/dom/element';
import { camelToKebab, coerceAttribute } from './utils.js';
import {
  createReactiveRoot,
  disposeReactiveRoot,
  attachShadow,
  untrack,
  type ReactiveHost,
} from './base.js';

type SignalTupleAny = [() => any, (v: any) => void];

/** Constructor of an existing custom-element class (HTMLElement or LitElement subclass). */
type WebComponentClass = new (...args: any[]) => HTMLElement;

export function defineElement<
  const Tag extends string,
  const P extends Record<string, PropDefinition>,
  const E extends Record<string, EventDefinition>
>(
  tagName: Tag,
  renderFn: ElementRenderFn<P, E>,
  options?: DefineElementOptions<P, E>
): KettleElementConstructor<Tag, P, E>;

/**
 * Register an already-defined web component class (e.g. `class MyCounter extends HTMLElement`)
 * under `tagName` without wrapping it in a new KettleDefinedElement.
 *
 * The class is stamped with `__tag`, `__props`, and `__events` metadata so the
 * vite plugin and JSX type-helpers keep working.
 */
export function defineElement<const Tag extends string>(
  tagName: Tag,
  elementClass: WebComponentClass,
  options?: Pick<DefineElementOptions, 'styles'>
): KettleElementConstructor<Tag, Record<never, never>, Record<never, never>>;

export function defineElement(
  tagName: string,
  renderFn:
    | ((
        props: Record<string, SignalTupleAny>,
        ctx: { emit: (name: string, detail?: unknown) => void }
      ) => unknown)
    | WebComponentClass,
  options: DefineElementOptions = {}
): KettleElementConstructor<string, any> {
  // ── Branch: existing web component class ─────────────────────────────────
  if (typeof renderFn === 'function' && renderFn.prototype instanceof HTMLElement) {
    if (!customElements.get(tagName)) {
      customElements.define(tagName, renderFn as CustomElementConstructor);
    }
    // Stamp metadata consumed by the vite plugin and type helpers.
    if (!('__tag' in renderFn)) {
      Object.defineProperty(renderFn, '__tag', { value: tagName, configurable: true });
    }
    if (!('__props' in renderFn)) {
      Object.defineProperty(renderFn, '__props', { value: {}, configurable: true });
    }
    if (!('__events' in renderFn)) {
      Object.defineProperty(renderFn, '__events', { value: {}, configurable: true });
    }
    return renderFn as any;
  }

  // ── Branch: render function ───────────────────────────────────────────────
  const {
    shadow = 'open',
    styles,
    props: propDefs = {},
    events: eventDefs = {},
    formAssociated = false,
    lifecycle = {},
  } = options;

  const attrToProp = new Map<string, string>();
  const observedAttrs: string[] = [];

  for (const [propName, def] of Object.entries(propDefs)) {
    if (def.attribute === false) continue;
    const attr = (def.attribute as string) || camelToKebab(propName);
    attrToProp.set(attr, propName);
    observedAttrs.push(attr);

    // Also observe the data-* variant so that lit-html `data-value=${x}` and
    // plain HTML `<k-el data-value="5">` both update the prop signal.
    const dataAttr = `data-${camelToKebab(propName)}`;
    if (!attrToProp.has(dataAttr)) {
      attrToProp.set(dataAttr, propName);
      observedAttrs.push(dataAttr);
    }
  }

  class KettleDefinedElement extends HTMLElement implements ReactiveHost {
    static observedAttributes = observedAttrs;
    static formAssociated = formAssociated;
    static readonly __tag = tagName;
    static readonly __props = propDefs;
    static readonly __events = eventDefs;

    __dispose: (() => void) | null = null;
    __connected = false;
    private __propSignals: Record<string, SignalTupleAny> = {};
    private __pendingProps: Record<string, unknown> | null = null;

    connectedCallback(): void {
      if (this.__connected) return;
      this.__connected = true;

      const renderRoot = attachShadow(this, shadow, styles);
      const pending = this.__pendingProps;
      this.__pendingProps = null;

      createReactiveRoot(this, renderRoot as Element, () => {
        const propSignals: Record<string, SignalTupleAny> = {};
        for (const [propName, def] of Object.entries(propDefs)) {
          // Priority: pending setProp value > attribute > default
          let initial: unknown;
          if (pending && propName in pending) {
            initial = pending[propName];
          } else {
            const attr =
              def.attribute !== false
                ? (def.attribute as string) || camelToKebab(propName)
                : null;
            const attrValue = attr ? this.getAttribute(attr) : null;
            // Fall back to data-* attribute (e.g. data-value="5" → value prop)
            const dataAttrValue =
              attrValue === null && attr
                ? this.getAttribute(`data-${camelToKebab(propName)}`)
                : null;
            const rawValue = attrValue ?? dataAttrValue;
            initial =
              rawValue !== null
                ? coerceAttribute(rawValue, def)
                : def.default ?? undefined;
          }
          const [get, set] = createSignal(initial);
          propSignals[propName] = [get, set];
        }
        this.__propSignals = propSignals;

        const host = this;
        const ctx = {
          emit: (name: string, detail?: unknown) => {
            host.dispatchEvent(
              new CustomEvent(name, { detail, bubbles: true, composed: true })
            );
          },
        };

        // At this point renderFn is guaranteed to be the render-function branch
        // (the class-constructor branch returned early above).
        const fn = renderFn as (p: any, c: any) => unknown;
        return untrack(() => fn(propSignals as any, ctx));
      });

      lifecycle.connectedCallback?.(this);
    }

    disconnectedCallback(): void {
      lifecycle.disconnectedCallback?.(this);
      disposeReactiveRoot(this);
    }

    attributeChangedCallback(
      name: string,
      _old: string | null,
      val: string | null
    ): void {
      const propName = attrToProp.get(name);
      if (!propName) return;
      const def = propDefs[propName];
      if (!def) return;
      const tuple = this.__propSignals[propName];
      if (!tuple) return;
      tuple[1](coerceAttribute(val, def));
      lifecycle.onAttributeChange?.(this, name, _old, val);
    }

    adoptedCallback(): void {
      lifecycle.adoptedCallback?.(this);
    }

    formAssociatedCallback(form: HTMLFormElement | null): void {
      lifecycle.formAssociatedCallback?.(this, form);
    }

    formDisabledCallback(disabled: boolean): void {
      lifecycle.formDisabledCallback?.(this, disabled);
    }

    formResetCallback(): void {
      lifecycle.formResetCallback?.(this);
    }

    formStateRestoreCallback(
      state: unknown,
      mode: 'restore' | 'autocomplete'
    ): void {
      lifecycle.formStateRestoreCallback?.(this, state, mode);
    }

    setProp(name: string, value: unknown): void {
      const tuple = this.__propSignals[name];
      if (tuple) {
        tuple[1](value);
      } else if (!this.__connected) {
        // Queue props set before connectedCallback
        if (!this.__pendingProps) this.__pendingProps = {};
        this.__pendingProps[name] = value;
      }
    }

    getProp(name: string): unknown {
      const tuple = this.__propSignals[name];
      return tuple ? tuple[0]() : undefined;
    }
  }

  // Define a property getter/setter for each declared prop on the prototype.
  // This enables lit-html's `.value=${x}` (property binding) which sets
  // `element.value = x` directly instead of going through setAttribute.
  // The setter feeds into setProp() → signal update; getter reads the signal.
  for (const propName of Object.keys(propDefs)) {
    Object.defineProperty(KettleDefinedElement.prototype, propName, {
      get(this: InstanceType<typeof KettleDefinedElement>) {
        return this.getProp(propName);
      },
      set(this: InstanceType<typeof KettleDefinedElement>, v: unknown) {
        this.setProp(propName, v);
      },
      configurable: true,
      enumerable: false,
    });
  }

  customElements.define(tagName, KettleDefinedElement);
  return KettleDefinedElement as any;
}
