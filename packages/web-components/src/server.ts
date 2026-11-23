/**
 * Fluixi custom elements rendered on a server: their light DOM content goes into the HTML, and
 * the client adopts it (`./hydrate.ts`). Imported for its effect where the server renders;
 * `@fluixi/start` adds it to an app's server entry. Without it an element is sent empty and
 * renders in the browser, and browser bundles carry none of this.
 *
 *   import '@fluixi/web-components/server';
 */
import { HYDRATION_KEY, insert, setKeyScope } from '@fluixi/dom';
import { root, runWithOwner, type Owner } from '@fluixi/reactive/signal';
import {
  BaseElement,
  HTMLReactiveElement,
  OWNER_KEY,
  SERVER_PROPS,
  SSR_ATTRIBUTE,
  SSR_PROPS_ATTRIBUTE,
  ELEMENT_COPIES,
  type ElementCopy,
  type ServerAccess,
} from './element.js';

/** The part of a @fluixi/dom server node the renderer uses. */
interface ServerNodeLike {
  localName: string;
  childNodes: unknown[];
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeChild(child: unknown): unknown;
}

/** Where @fluixi/dom looks for the renderer it hands each attached custom element node to. */
const ELEMENT_RENDERER = Symbol.for('fluixi.serverElementRenderer');

/**
 * Whether a value comes back from JSON as it went in: primitives, arrays, and objects with no
 * prototype but Object's. A class instance serialises without its methods and getters, so a
 * Zod schema carried this way reached the client as an object with no `shape`, and the element
 * read that until hydration assigned the real one. Such values wait for hydration instead.
 */
function isPlainData(value: unknown, seen = new Set<object>()): boolean {
  if (value === null) return true;
  switch (typeof value) {
    case 'string':
    case 'number':
    case 'boolean':
      return true;
    case 'object':
      break;
    default:
      return false;
  }
  const object = value as object;
  if (seen.has(object)) return false;
  seen.add(object);
  const proto = Object.getPrototypeOf(object);
  if (Array.isArray(object))
    return object.every((item) => isPlainData(item, seen));
  if (proto !== Object.prototype && proto !== null) return false;
  return Object.values(object).every((item) => isPlainData(item, seen));
}

function serverInternals(): ElementInternals {
  return {
    states: new Set<string>(),
    setFormValue() {},
    setValidity() {},
    checkValidity: () => true,
    reportValidity: () => true,
    validity: {} as ValidityState,
    validationMessage: '',
    willValidate: false,
    form: null,
    labels: [] as unknown as NodeList,
  } as unknown as ElementInternals;
}

/** The host APIs a server-rendered instance reaches its server node through. */
const HOST_PROPERTIES = [
  'dataset',
  'style',
  'classList',
  'id',
  'className',
] as const;
const HOST_METHODS = [
  'setAttribute',
  'getAttribute',
  'removeAttribute',
  'hasAttribute',
  'toggleAttribute',
] as const;

function bindHost(element: object, node: object): void {
  const target = node as Record<string, unknown>;
  for (const name of HOST_PROPERTIES) {
    Object.defineProperty(element, name, {
      configurable: true,
      get: () => target[name],
      set: (value: unknown) => void (target[name] = value),
    });
  }
  for (const name of HOST_METHODS) {
    Object.defineProperty(element, name, {
      configurable: true,
      value: (...args: unknown[]) =>
        (target[name] as (...a: unknown[]) => unknown)(...args),
    });
  }
  // Form value, validity and custom states only mean something in a browser: accepted, kept
  // nowhere, so a render that sets them runs the same on both sides.
  Object.defineProperty(element, 'attachInternals', {
    configurable: true,
    value: serverInternals,
  });
}

/**
 * Render a light DOM element's content into its server node, under the page's owner so its
 * context and resources are the page's. Props come from what @fluixi/dom recorded on the
 * node; the ones with no attribute form ride along as JSON for the client. Shadow DOM
 * elements are left to the client until declarative shadow roots are emitted.
 */
function renderOnServer(
  constructor: typeof HTMLReactiveElement & (new () => HTMLReactiveElement),
  node: ServerNodeLike,
  serverAccess: ServerAccess
): void {
  if (constructor.shadow !== undefined && constructor.shadow !== false) return;

  const element = new constructor();
  const recorded =
    (node as unknown as Record<symbol, Record<string, unknown> | undefined>)[
      SERVER_PROPS
    ] ?? {};
  const carried: Record<string, unknown> = {};
  for (const [name, state] of Object.entries(serverAccess.states(element))) {
    if (name in recorded) {
      const value = recorded[name];
      state.write(value);
      if (value !== null && typeof value === 'object' && isPlainData(value))
        carried[name] = value;
    } else if (state.attribute !== false) {
      const attribute = node.getAttribute(state.attribute);
      if (attribute !== null)
        state.write(state.declaration.fromAttribute(attribute));
    }
  }

  // Without a DOM the instance is a bare object: what render() writes to its host (a data-*
  // attribute, a custom property) goes to the server node, so it is in the HTML.
  if (BaseElement !== (globalThis as { HTMLElement?: unknown }).HTMLElement)
    bindHost(element, node);
  const authored = [...node.childNodes] as ChildNode[];
  for (const child of authored) node.removeChild(child);
  serverAccess.adopt(element, node, authored);
  // Its own key scope, named after its own key: the client renders this content in the
  // element's root, not in the page's, and must number it the same way.
  const scope = `${node.getAttribute(HYDRATION_KEY) ?? ''}~`;
  // Under the scope that created the node (recorded by @fluixi/dom), so the app's providers
  // reach `useContext` here as they do in the browser.
  const createdIn =
    (node as unknown as Record<symbol, Owner | undefined>)[OWNER_KEY] ?? null;
  runWithOwner(createdIn, () =>
    root(() => {
      setKeyScope(scope);
      insert(node as unknown as Element, serverAccess.render(element) as never);
    })
  );

  node.setAttribute(SSR_ATTRIBUTE, '');
  if (Object.keys(carried).length) {
    try {
      node.setAttribute(SSR_PROPS_ATTRIBUTE, JSON.stringify(carried));
    } catch {
      // A cycle: the client waits for hydration to assign it.
    }
  }
}

// One renderer for every copy: a class is rendered through the access of the copy it extends.
(globalThis as Record<symbol, unknown>)[ELEMENT_RENDERER] ??= (
  node: ServerNodeLike
) => {
  const registry = (
    globalThis as { customElements?: { get(name: string): unknown } }
  ).customElements;
  const constructor = registry?.get(node.localName);
  if (typeof constructor !== 'function') return;
  const copies =
    (globalThis as Record<symbol, ElementCopy[] | undefined>)[ELEMENT_COPIES] ??
    [];
  const copy = copies.find(
    (entry) => constructor.prototype instanceof entry.base
  );
  if (copy)
    renderOnServer(
      constructor as typeof HTMLReactiveElement &
        (new () => HTMLReactiveElement),
      node,
      copy.access
    );
};
