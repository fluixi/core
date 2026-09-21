/**
 * The names the web-component world expects, over the names the rest of Fluixi uses.
 *
 * Someone arriving from Lit or Catalyst reaches for `customElement` and `property`. The
 * framework's own vocabulary is `defineElement` and `prop`, which reads better beside
 * `defineMiddleware` and `defineConfig`. Both are here rather than one renamed, because
 * picking either alone costs the other audience.
 *
 * These are bindings, not wrappers. `customElement === defineElement` is true, so a
 * stack trace names the real function and nothing is added to the bundle.
 */
import { defineElement, type ElementOptions, type Setup } from './element.js';
import { createDispatch } from './events.js';
import { prop, type PropDeclaration, type PropOptions } from './props.js';
import { createTargets, type Targets } from './targets.js';
import { defineCustomElement } from './registry.js';

/** `defineElement`, under the name Lit and Catalyst use. */
export const customElement = defineElement;

/** `defineCustomElement`, already the registry-facing name. */
export { defineCustomElement };

/**
 * `prop`, under the name the brief asks for.
 *
 * A declaration rather than a decorator: `property.number(1)` returns the same thing
 * `prop.number(1)` does, and the element options carry it.
 */
export const property = prop;

/**
 * A property that is also written back to the attribute.
 *
 * `property.*` reads the attribute once and then lives as a property, which is what most
 * values want. This is the reflecting variant, for a value the page styles or inspects:
 * writing it puts the attribute in the DOM, so `[open]` in CSS matches and devtools
 * shows the current state.
 */
export const attribute = {
  string: (initial = '', options: PropOptions<string> = {}) =>
    prop.string(initial, { ...options, reflect: true }),
  number: (initial = 0, options: PropOptions<number> = {}) =>
    prop.number(initial, { ...options, reflect: true }),
  boolean: (initial = false, options: PropOptions<boolean> = {}) =>
    prop.boolean(initial, { ...options, reflect: true }),
};

/** `createDispatch`, under the name the brief asks for. */
export const event = createDispatch;

/** `createTargets`, under the name Catalyst uses. */
export const target = createTargets;

/**
 * One element by target name, resolved when called.
 *
 * `target(root)` hands back the whole set; this is the single-element shorthand for a
 * setup body that wants one node and nothing else. It resolves on each call rather than
 * caching, so it stays correct when the subtree re-renders.
 */
export function ref<T extends Element = HTMLElement>(
  targets: Targets,
  name: string,
): () => T | null {
  return () => targets.get<T>(name);
}

/**
 * A slot's assigned nodes, reactive to slotchange.
 *
 * The browser owns slotting. This reports what the browser decided, so a setup body can
 * branch on whether anything was passed without reimplementing distribution.
 */
export function slot(
  root: () => ParentNode,
  name?: string,
): () => Element[] {
  return () => {
    const host = root() as ParentNode & { querySelector?: ParentNode['querySelector'] };
    const selector = name ? `slot[name="${name}"]` : 'slot:not([name])';
    const element = host.querySelector?.(selector) as HTMLSlotElement | null;
    if (!element) return [];
    return element.assignedElements ? element.assignedElements() : [];
  };
}

export type { ElementOptions, PropDeclaration, PropOptions, Setup, Targets };
