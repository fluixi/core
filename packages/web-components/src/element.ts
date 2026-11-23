/**
 * The custom element itself: lifecycle on Fluixi's existing ownership model.
 *
 * `HTMLReactiveElement` is a real class, authored the way the platform defines elements:
 * `class X extends HTMLReactiveElement`, callbacks as methods, `customElements.define`.
 * What it adds is the reactive part. Declared props are signals behind accessors, and the
 * first connect runs `render()` once inside one `createRoot` scope; bindings update after
 * that and `dispose` takes the whole subtree down.
 *
 * Visibility is deliberate. The platform callbacks are public because the browser calls
 * them. `render`, `emit`, `targets`, `renderRoot`, `internals`, `authoredChildren` and `slotted` are
 * protected: they are for the element's own code, not its consumers. The engine's state is
 * in `#private` fields, private at runtime and not only to TypeScript.
 *
 * `insert` rather than `render`: `render` clears its container going in and again coming
 * out (@fluixi/dom runtime.ts), which for a light-DOM element would delete the author's own
 * children before the component ever saw them.
 */
import {
  closeReactiveScope,
  effect,
  getOwner,
  openReactiveScope,
  root,
  runWithOwner,
  withReactiveScope,
  type Accessor,
  type Owner,
} from '@fluixi/reactive/signal';
import { HYDRATION_KEY, afterHydrationPass, insert, isAppHydrationPending, isServer, setKeyScope, whenAppHydrated } from '@fluixi/dom';
import {
  createPropStates,
  observedFrom,
  type PropAccessors,
  type PropDeclaration,
  type PropState,
} from './props.js';
import { defineCustomElement, onRedefine, type DefineOptions } from './registry.js';
import { createDispatch, type Dispatch, type DispatchInit } from './events.js';
import { createTargets, type Targets } from './targets.js';
import { applyStyles, type ElementStyles } from './styles.js';
import { announceOwner, consumeContext, provideContext, type ConsumeOptions, type ElementContext } from './context.js';

/** Where `@fluixi/dom`'s hydration hands a server-rendered element its owner. Kept in step. */
const OWNER_KEY = Symbol.for('fluixi.owner');
/** Where @fluixi/dom keeps a server node's props, and where it looks for the element renderer. */
const SERVER_PROPS = Symbol.for('fluixi.serverProps');
const ELEMENT_RENDERER = Symbol.for('fluixi.serverElementRenderer');
/** Each element class's own server render, so the copy of this package that defined it does the work. */
const RENDER_ON_SERVER = Symbol.for('fluixi.renderOnServer');
/** Tells @fluixi/dom's page hydration that this element's children are its own, adopted already. */
const OWNS_CONTENT = Symbol.for('fluixi.ownsContent');
/** Set by @fluixi/dom's hydration: the nodes the server rendered inside this element. */
const SERVER_CONTENT = Symbol.for('fluixi.serverContent');
/** Marks content an element rendered on the server, and carries the props that have no attribute. */
const SSR_ATTRIBUTE = 'data-fx-ssr';

/**
 * Hot reload in dev (`@fluixi/dom/hot` creates the registry): a tag defined again swaps the setup
 * its class reads and rebuilds the instances on the page. The browser cannot redefine a tag.
 */
const HOT_SETUP = Symbol('fluixi.hotSetup');
const HOT_REBUILD = Symbol('fluixi.hotRebuild');

interface HotSetup {
  setup: Setup<any>;
  /** Built instances, while hot reload runs. */
  instances: Set<WeakRef<HTMLReactiveElement>>;
}

type HotShared = {
  elements: Map<string, unknown>;
  announce?: (label: string, swap: () => void, rebuilt?: () => Element[]) => void;
  keep?: <T>(host: object, render: () => T) => T;
};
function hotShared(): HotShared | undefined {
  return (globalThis as Record<symbol, HotShared | undefined>)[Symbol.for('fluixi.hot')];
}
function hotElements(): Map<string, unknown> | undefined {
  return hotShared()?.elements;
}
/** Built instances of class elements, by tag, while hot reload runs. */
const classElements = new Map<string, Set<WeakRef<HTMLReactiveElement>>>();
function classInstances(tag: string): Set<WeakRef<HTMLReactiveElement>> {
  let set = classElements.get(tag);
  if (!set) classElements.set(tag, (set = new Set()));
  return set;
}

/**
 * A class element's module ran again with a new class. The browser keeps the first class for a
 * tag, so the new methods move onto it and each live instance renders again: the instance and
 * its fields stay. A class that is not a Fluixi element, or a render that throws (a method
 * reading a `#private` field the old instance does not have), reloads the page.
 */
function redefineClass(name: string, registered: CustomElementConstructor, next: CustomElementConstructor): boolean {
  if (!hotElements()) return false;
  const reload = (): void => void (globalThis as { location?: Location }).location?.reload();
  const live = (): HTMLReactiveElement[] =>
    [...classInstances(name)].map((ref) => ref.deref()).filter((el): el is HTMLReactiveElement => !!el?.isConnected);
  hotAnnounce()(`hot update: <${name}>`, () => {
    if (!(registered.prototype instanceof HTMLReactiveElement)) return reload();
    for (const key of Reflect.ownKeys(next.prototype)) {
      if (key !== 'constructor') Object.defineProperty(registered.prototype, key, Object.getOwnPropertyDescriptor(next.prototype, key)!);
    }
    for (const key of Object.getOwnPropertyNames(next)) {
      if (key !== 'prototype' && key !== 'length' && key !== 'name') Object.defineProperty(registered, key, Object.getOwnPropertyDescriptor(next, key)!);
    }
    try {
      for (const element of live()) element[HOT_REBUILD]();
    } catch {
      reload();
    }
  }, live);
  return true;
}
if ((typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment())) onRedefine(redefineClass);

/** A render under `@fluixi/dom/hot`'s keepState, or the render alone. */
function hotKeep<T>(host: object, render: () => T): T {
  const keep = hotShared()?.keep;
  return keep ? keep(host, render) : render();
}

/** `@fluixi/dom/hot`'s devtools mark around a swap, or the swap alone. */
function hotAnnounce(): NonNullable<HotShared['announce']> {
  return hotShared()?.announce ?? ((_label, swap) => swap());
}
/**
 * Adopting the content a server rendered, installed by `@fluixi/web-components/hydrate` (which
 * `@fluixi/start` adds to an app's client entry). Without it the element carries no hydration
 * code: an element used inside another framework is never server-rendered.
 */
export interface ElementHydrator {
  /** Render `render()`'s output into `element`, adopting the server's nodes. */
  hydrate(element: Element, render: () => unknown): void;
}
// On the global, not in this module: a bundler can load two copies of this package, one
// pre-bundled with the elements that use it and one for the `hydrate` entry the app imports. A
// module variable would leave the elements' copy without the hydrator the other copy installed.
const HYDRATOR = Symbol.for('fluixi.elementHydrator');

const installedHydrator = (): ElementHydrator | undefined =>
  (globalThis as Record<symbol, ElementHydrator | undefined>)[HYDRATOR];

export function installElementHydration(next: ElementHydrator): void {
  (globalThis as Record<symbol, ElementHydrator | undefined>)[HYDRATOR] = next;
}

const SSR_PROPS_ATTRIBUTE = 'data-fx-props';

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
  if (Array.isArray(object)) return object.every((item) => isPlainData(item, seen));
  if (proto !== Object.prototype && proto !== null) return false;
  return Object.values(object).every((item) => isPlainData(item, seen));
}

/** The part of a @fluixi/dom server node the renderer uses. */
interface ServerNodeLike {
  localName: string;
  childNodes: unknown[];
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeChild(child: unknown): unknown;
}
import type { PropValues } from './types.js';
// `__DEV__` is folded by a build that defines it, so a bundler drops what it guards; without it
// the check reads NODE_ENV. Written inline at each use: a bundler keeps a function whose only
// caller sits behind an imported or local constant.
declare const __DEV__: boolean | undefined;
import { isDevelopment } from './dev-env.js';

/**
 * `true`, `'open'` or `'closed'` for a plain shadow root, or the options `attachShadow` takes:
 * `{ mode: 'open', delegatesFocus: true }` makes focusing the host focus the first focusable
 * thing inside, which is what a custom input wants.
 */
export type ShadowOption =
  | boolean
  | 'open'
  | 'closed'
  | { mode?: 'open' | 'closed'; delegatesFocus?: boolean; slotAssignment?: 'named' | 'manual' };

type Schema = Record<string, PropDeclaration<unknown>>;


/**
 * `HTMLElement` in a browser. On a server there is none, and a module declaring
 * `class X extends HTMLReactiveElement` is still imported by code that renders there, so
 * the base is an inert stand-in: the class can be declared, nothing is ever defined.
 */
const BaseElement: typeof HTMLElement =
  typeof HTMLElement === 'undefined' ? (class {} as unknown as typeof HTMLElement) : HTMLElement;

/**
 * On a server there is no `customElements` either, and an element file that registers the
 * standard way (`customElements.define('x-y', X)` at the top) is still imported by code that
 * renders there. A stand-in that accepts and ignores definitions keeps that import from
 * throwing, as Lit's server shim does. Only installed where neither DOM global exists.
 */
if (typeof HTMLElement === 'undefined' && typeof (globalThis as { customElements?: unknown }).customElements === 'undefined') {
  const defined = new Map<string, CustomElementConstructor>();
  (globalThis as { customElements?: unknown }).customElements = {
    define: (name: string, constructor: CustomElementConstructor) => void defined.set(name, constructor),
    get: (name: string) => defined.get(name),
    getName: (constructor: CustomElementConstructor) => [...defined].find(([, c]) => c === constructor)?.[0] ?? null,
    upgrade: () => {},
    // Never resolves: nothing is ever upgraded on a server.
    whenDefined: () => new Promise<never>(() => {}),
  };
}

/** The host APIs a server-rendered instance reaches its server node through. */
const HOST_PROPERTIES = ['dataset', 'style', 'classList', 'id', 'className'] as const;
const HOST_METHODS = ['setAttribute', 'getAttribute', 'removeAttribute', 'hasAttribute', 'toggleAttribute'] as const;

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
    Object.defineProperty(element, name, { configurable: true, value: (...args: unknown[]) => (target[name] as (...a: unknown[]) => unknown)(...args) });
  }
  // Form value, validity and custom states only mean something in a browser: accepted, kept
  // nowhere, so a render that sets them runs the same on both sides.
  Object.defineProperty(element, 'attachInternals', { configurable: true, value: serverInternals });
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

/** The platform callbacks, looked up on whatever sits above this class in the chain. */
interface Lifecycle {
  connectedCallback?(): void;
  disconnectedCallback?(): void;
  adoptedCallback?(): void;
  attributeChangedCallback?(name: string, previous: string | null, value: string | null): void;
}

const prepared = new WeakSet<object>();

function shadowInit(shadow: Exclude<ShadowOption, false>): ShadowRootInit {
  if (shadow === true) return { mode: 'open' };
  if (typeof shadow === 'string') return { mode: shadow };
  return { mode: 'open', ...shadow };
}

/**
 * Every `static props` from the class up to this base, nearest last so a subclass can
 * redeclare a prop its parent had.
 */
function schemaOf(constructor: Function): Schema {
  const chain: Schema[] = [];
  for (let c: Function | null = constructor; c && c !== HTMLReactiveElement; c = Object.getPrototypeOf(c)) {
    if (Object.prototype.hasOwnProperty.call(c, 'props')) chain.unshift((c as { props?: Schema }).props ?? {});
  }
  return Object.assign({}, ...chain);
}

/** `el.count = 3` has to reach the signal, so the accessors go on the prototype, once per class. */
function prepare(constructor: Function): void {
  if (prepared.has(constructor)) return;
  prepared.add(constructor);
  // A mixin that assigns `static observedAttributes = [...]` replaces this class's getter,
  // and the browser then never reports the props' attributes: `step="5"` stops reaching
  // `step`. Nothing fails; say which ones went missing.
  const observed = (constructor as { observedAttributes?: string[] }).observedAttributes ?? [];
  const missing = observedFrom(schemaOf(constructor)).filter((a) => !observed.includes(a));
  if (missing.length) {
    console.warn(
      `[fluixi] ${constructor.name}.observedAttributes leaves out ${missing.join(', ')}, so those props no longer ` +
        `follow their attributes. A class or mixin that adds its own should return [...super.observedAttributes, ...].`,
    );
  }
  for (const name of Object.keys(schemaOf(constructor))) {
    Object.defineProperty(constructor.prototype, name, {
      configurable: true,
      enumerable: true,
      get(this: HTMLReactiveElement) {
        return stateOf(this, name).read();
      },
      set(this: HTMLReactiveElement, value: unknown) {
        // `<fx-props n="2">` in JSX assigns the property, and the literal arrives as the string
        // "2". Read as its attribute would be, so a number prop gets a number either way; a
        // string prop, whose default is a string, takes it as it is, and so does a prop with no
        // attribute (`prop.any`), which has no attribute form to read it as.
        const declaration = stateOf(this, name).declaration;
        if (typeof value === 'string' && typeof declaration.initial !== 'string' && declaration.attribute !== false) {
          value = declaration.fromAttribute(value);
        }
        writeFromOutside(this, name, value);
      },
    });
  }
}

/** Filled by the class's static block: the one way in to its private state. */
let stateOf: (element: HTMLReactiveElement, name: string) => PropState<unknown>;
/** Filled by the class's static block: a prop written from outside, by a page or a script. */
let writeFromOutside: (element: HTMLReactiveElement, name: string, value: unknown) => void;

export class HTMLReactiveElement extends BaseElement {
  /** The declared properties, and the attributes that mirror them. Inherited and merged. */
  static props?: Schema;
  /**
   * `false` (the default) renders into the element itself. `'open'`, `'closed'`, `true` or an
   * options object attach a shadow root, which is what native `<slot>` needs. Light DOM is the default: a
   * component that inherits the page's styles is usually what an app wants, and it is the
   * mode that survives a server render without declarative shadow DOM.
   */
  static shadow?: ShadowOption;
  /**
   * Adopted by the shadow root, one parsed sheet shared by every instance. CSS text, a
   * `CSSStyleSheet`, or a list: `[super.styles, '...']` keeps the parent's. A class meant to be
   * extended declares it as `static styles: ElementStyles = ...`, since a bare string narrows
   * the type and a subclass's list no longer fits. Ignored in light DOM, which has no scope.
   */
  static styles?: ElementStyles;

  /**
   * The attributes of every declared prop. A mixin in between that observes its own
   * extends this with `super.observedAttributes`; a subclass need not touch it.
   */
  static get observedAttributes(): string[] {
    prepare(this);
    return observedFrom(schemaOf(this));
  }

  static {
    // Development only: defined here rather than as a method, so a production build drops it.
    if ((typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment())) {
      Object.defineProperty(HTMLReactiveElement.prototype, HOT_REBUILD, {
        configurable: true,
        value(this: HTMLReactiveElement): void {
          if (!this.#built) return;
          this.#teardown();
          if (this.#root !== this) (this.#root as ShadowRoot).replaceChildren();
          // What the server rendered was the old setup's output: render afresh.
          this.removeAttribute(SSR_ATTRIBUTE);
          this.#build();
        },
      });
    }
    // Not a member in the type: it is a handshake with the runtime, not API.
    Object.defineProperty(HTMLReactiveElement.prototype, OWNER_KEY, {
      configurable: true,
      get(this: HTMLReactiveElement) {
        return this.#creator;
      },
      set(this: HTMLReactiveElement, owner: Owner | null) {
        this.#adoptOwner(owner);
      },
    });
    // On a server, @fluixi/dom hands each attached custom element node to this renderer. It
    // defers to the element's class: after a dev reload, or with two bundles of this package,
    // the renderer registered first belongs to another copy whose classes are not this one's.
    if (typeof HTMLElement === 'undefined') {
      (globalThis as Record<symbol, unknown>)[ELEMENT_RENDERER] ??= (node: ServerNodeLike) => {
        const registry = (globalThis as { customElements?: { get(name: string): unknown } }).customElements;
        const constructor = registry?.get(node.localName) as Record<symbol, ((node: ServerNodeLike) => void) | undefined> | undefined;
        constructor?.[RENDER_ON_SERVER]?.(node);
      };
    }
    stateOf = (element, name) => {
      const state = element.#states()[name];
      if (!state) throw new Error(`[fluixi] ${name} is not a declared prop of <${element.localName}>`);
      return state;
    };
    writeFromOutside = (element, name, value) => element.#writeFromOutside(name, value);
  }

  /**
   * Props written while the app hydrates around an element already built, applied once it is
   * done. The page hydrates inside a batch whose effects run before hydration ends: an update
   * run there builds the element's new content while server nodes are still being claimed,
   * and its templates claimed the page's nodes as their own (the page's frame moved into the
   * element). Until then the element shows what it adopted from the server.
   */
  #deferred: Map<string, () => void> | null = null;

  #writeFromOutside(name: string, value: unknown, apply: () => void = () => stateOf(this, name).write(value)): void {
    if (!this.#built || !isAppHydrationPending()) {
      apply();
      return;
    }
    if (!this.#deferred) {
      this.#deferred = new Map();
      whenAppHydrated(() => {
        const pending = this.#deferred;
        this.#deferred = null;
        for (const write of pending?.values() ?? []) write();
      });
    }
    this.#deferred.set(name, apply);
  }

  #statesCache: Record<string, PropState<unknown>> | null = null;
  /** Prop values kept across a real removal, for the signals the next scope re-creates. */
  #carried: Record<string, unknown> | null = null;
  #dispose: (() => void) | null = null;
  #root: ShadowRoot | HTMLElement = this;
  #authored: ChildNode[] = [];
  #built = false;
  /** Server-rendered and waiting for the app to hand over an owner; cancels the wait. */
  #waiting: (() => void) | null = null;
  /** The wait ran once; whatever it found, the next build goes ahead. */
  #waited = false;
  /**
   * A template or hydration handed the owner over. An upgrade reads whatever owner happens to be
   * current (a module evaluating inside a route preload), which is not this element's host.
   */
  #handed = false;
  /** The first build adopts content the server rendered. */
  #hydrating = false;
  /**
   * Disposal is deferred because `disconnectedCallback` cannot tell a removal from a move.
   * Appending an already-parented node fires disconnect then connect in the same task, and
   * tearing the scope down in between would rebuild the subtree on every reorder, which a
   * keyed list does constantly.
   */
  #pendingDispose: ReturnType<typeof setTimeout> | null = null;
  /** Suppresses the attribute callback a reflect triggers, so it does not loop. */
  #reflecting = new Set<string>();
  #internals: ElementInternals | null = null;
  /**
   * What the devtools graph groups this element's signals under. Opened when the element
   * first needs one, closed when it is really removed.
   */
  #scope: object | null = null;
  #targets: Targets | null = null;
  #dispatch: Dispatch | null = null;
  /** The owner the element was created under, for context: a Fluixi template, or none. */
  #creator: Owner | null = getOwner();
  /** The owner `render()` runs under, while built. Its parent is the creator. */
  #rootOwner: Owner | null = null;

  constructor() {
    super();
    prepare(new.target);
    // Hydration reached this element before its definition did, and left the owner behind.
    const handed = Object.getOwnPropertyDescriptor(this, OWNER_KEY);
    if (handed) {
      delete (this as unknown as Record<symbol, unknown>)[OWNER_KEY];
      this.#creator = (handed.value as Owner | null) ?? this.#creator;
      this.#handed = handed.value != null;
    }
    // A property assigned before upgrade sits as an own property and shadows the prototype
    // accessor. Take it off and replay it through the signal.
    this.#adoptOwnProps();
  }

  connectedCallback(): void {
    // What sits above first: a mixin expects to run before the class that composed it.
    (Object.getPrototypeOf(HTMLReactiveElement.prototype) as Lifecycle).connectedCallback?.call(this);
    if (this.#pendingDispose !== null) {
      clearTimeout(this.#pendingDispose);
      this.#pendingDispose = null;
      return; // A move. The scope is alive and the DOM is still ours.
    }
    // A class field named like a prop lands after the constructor and hides the accessor.
    this.#adoptOwnProps(true);
    if (!this.#built && !this.#waiting) this.#build();
  }

  disconnectedCallback(): void {
    (Object.getPrototypeOf(HTMLReactiveElement.prototype) as Lifecycle).disconnectedCallback?.call(this);
    if (!this.#built || this.#pendingDispose !== null) return;
    this.#pendingDispose = setTimeout(() => {
      this.#pendingDispose = null;
      this.#teardown();
    }, 0);
  }

  /** Another document, the same scope: nothing reactive depends on which document holds the node. */
  adoptedCallback(): void {
    (Object.getPrototypeOf(HTMLReactiveElement.prototype) as Lifecycle).adoptedCallback?.call(this);
  }

  attributeChangedCallback(name: string, previous: string | null, value: string | null): void {
    (Object.getPrototypeOf(HTMLReactiveElement.prototype) as Lifecycle).attributeChangedCallback?.call(
      this,
      name,
      previous,
      value,
    );
    if (this.#reflecting.has(name)) return;
    for (const [prop, state] of Object.entries(this.#states())) {
      if (state.attribute !== name) continue;
      this.#writeFromOutside(prop, value, () => state.write(state.declaration.fromAttribute(value)));
      return;
    }
  }

  /**
   * What the element shows. Runs once, on the first connect, inside the element's reactive
   * scope; bindings keep it current after that. It is never re-run, so read a prop inside a
   * binding (`() => this.step`), not in the body, to follow it.
   */
  protected render(): unknown {
    return undefined;
  }

  /**
   * Dispatch a `CustomEvent`, bubbling and composed by default. False when cancelled.
   *
   * The name goes out lowercased: a JSX handler listens for the name after `on`, lowercased,
   * so `emit('signOut')` reaches `onSignOut`, and a listener added by hand uses `signout`.
   */
  protected emit<T>(type: string, detail?: T, init?: DispatchInit): boolean {
    this.#dispatch ??= createDispatch(this);
    return this.#dispatch(type.toLowerCase(), detail, init);
  }

  /** Elements inside this one, by `data-target`, scoped to its render root. */
  protected get targets(): Targets {
    return (this.#targets ??= createTargets(() => this.#root));
  }

  /** Where `render()` output goes: the shadow root, or the element itself in light DOM. */
  protected get renderRoot(): ShadowRoot | HTMLElement {
    return this.#root;
  }

  /**
   * The children the author wrote between the tags, in light DOM. Empty under shadow DOM,
   * where the browser projects them through `<slot>` and they were never the element's to place.
   */
  protected get authoredChildren(): readonly ChildNode[] {
    return this.#authored;
  }

  /**
   * The authored children for one named slot in light DOM: those with `slot="name"`, or, with
   * no name, those without a `slot` (text included). The element places each group itself, the
   * light DOM counterpart of `<slot name>`. Empty under shadow DOM, where the browser assigns them.
   */
  protected slotted(name?: string): ChildNode[] {
    return this.#authored.filter((node) => {
      const slot = 'getAttribute' in node ? (node as Element).getAttribute('slot') : null;
      return name ? slot === name : !slot;
    });
  }

  /**
   * The element's `ElementInternals`, attached on first use: ARIA defaults, custom states,
   * and with `static formAssociated = true`, taking part in a `<form>`.
   */
  protected get internals(): ElementInternals {
    return (this.#internals ??= this.attachInternals());
  }

  #states(): Record<string, PropState<unknown>> {
    if (this.#statesCache) return this.#statesCache;
    const states = withReactiveScope(this.#reactiveScope(), () => createPropStates(schemaOf(this.constructor)));
    if (this.#carried) {
      for (const [name, value] of Object.entries(this.#carried)) states[name]?.write(value);
      this.#carried = null;
    }
    return (this.#statesCache = states);
  }

  #reactiveScope(): object {
    return (this.#scope ??= openReactiveScope({
      kind: 'element',
      name: `<${this.localName}>`,
      target: this,
      // The class, since the line that opened the scope is this package's, not the app's.
      detail: this.constructor.name,
    }));
  }

  #adoptOwnProps(warn = false): void {
    for (const name of Object.keys(schemaOf(this.constructor))) {
      if (!Object.prototype.hasOwnProperty.call(this, name)) continue;
      const value = (this as unknown as Record<string, unknown>)[name];
      delete (this as unknown as Record<string, unknown>)[name];
      if (warn) {
        console.warn(
          `[fluixi] <${this.localName}> has a class field named "${name}", which hides the declared prop. ` +
            `Declare it only in static props, and set a default there.`,
        );
      }
      this.#states()[name].write(value);
    }
  }

  /**
   * Render a light DOM element's content into its server node, under the page's owner so its
   * context and resources are the page's. Props come from what @fluixi/dom recorded on the
   * node; the ones with no attribute form ride along as JSON for the client. Shadow DOM
   * elements are left to the client until declarative shadow roots are emitted.
   */
  static [RENDER_ON_SERVER](this: typeof HTMLReactiveElement, node: ServerNodeLike): void {
    HTMLReactiveElement.#renderOnServer(this as typeof HTMLReactiveElement & (new () => HTMLReactiveElement), node);
  }

  static #renderOnServer(constructor: typeof HTMLReactiveElement & (new () => HTMLReactiveElement), node: ServerNodeLike): void {
    if (constructor.shadow !== undefined && constructor.shadow !== false) return;

    const element = new constructor();
    const recorded = (node as unknown as Record<symbol, Record<string, unknown> | undefined>)[SERVER_PROPS] ?? {};
    const carried: Record<string, unknown> = {};
    for (const [name, state] of Object.entries(element.#states())) {
      if (name in recorded) {
        const value = recorded[name];
        state.write(value);
        if (value !== null && typeof value === 'object' && isPlainData(value)) carried[name] = value;
      } else if (state.attribute !== false) {
        const attribute = node.getAttribute(state.attribute);
        if (attribute !== null) state.write(state.declaration.fromAttribute(attribute));
      }
    }

    // Without a DOM the instance is a bare object: what render() writes to its host (a data-*
    // attribute, a custom property) goes to the server node, so it is in the HTML.
    if (BaseElement !== (globalThis as { HTMLElement?: unknown }).HTMLElement) bindHost(element, node);
    element.#authored = [...node.childNodes] as ChildNode[];
    for (const child of element.#authored) node.removeChild(child);
    element.#root = node as unknown as HTMLElement;
    element.#built = true;
    // Its own key scope, named after its own key: the client renders this content in the
    // element's root, not in the page's, and must number it the same way.
    const scope = `${node.getAttribute(HYDRATION_KEY) ?? ''}~`;
    // Under the scope that created the node (recorded by @fluixi/dom), so the app's providers
    // reach `useContext` here as they do in the browser.
    const createdIn = (node as unknown as Record<symbol, Owner | undefined>)[OWNER_KEY] ?? null;
    runWithOwner(createdIn, () =>
      root(() => {
        setKeyScope(scope);
        insert(node as unknown as Element, element.render() as never);
      }),
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

  /** This element's entry in its class's hot instances, once it has one. */
  #hotRef: WeakRef<HTMLReactiveElement> | undefined;

  /** Hot reload: the class's setup changed, so render again from scratch, keeping the props. */
  declare [HOT_REBUILD]: () => void;

  #build(): void {
    if (this.#shouldWaitForHost()) return this.#waitForHost();
    this.#built = true;
    const constructor = this.constructor as typeof HTMLReactiveElement;
    const hot = (constructor as unknown as Record<symbol, HotSetup | undefined>)[HOT_SETUP];
    // Once per element: a rebuild or a reconnect builds again, and a second entry rebuilt it
    // again on every later swap. A class element is tracked by its tag.
    if ((typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment()) && hotElements() && !this.#hotRef) {
      this.#hotRef = new WeakRef(this);
      if (hot) hot.instances.add(this.#hotRef);
      else classInstances(this.localName).add(this.#hotRef);
    }
    const shadow = constructor.shadow;

    if (shadow !== undefined && shadow !== false) {
      // A declarative shadow root may already be attached from a server render.
      this.#root = this.shadowRoot ?? this.attachShadow(shadowInit(shadow));
      applyStyles(this.#root, constructor, constructor.styles);
    } else if (this.hasAttribute(SSR_ATTRIBUTE)) {
      // Rendered on the server: its children are render()'s output, adopted below, and the
      // props with no attribute form come back from the JSON the server wrote.
      //
      // Unless the page put authored children in after claiming it: those are the live nodes
      // (handlers and all) that render() places, while the server's content holds copies of
      // them in their places. Adopting that content would leave the authored nodes appended
      // after it and the slots empty, so the element renders afresh, as a browser-built one.
      const server = (this as unknown as Record<symbol, unknown>)[SERVER_CONTENT] as ChildNode[] | undefined;
      const authored = server ? Array.from(this.childNodes).filter((node) => !server.includes(node)) : [];
      if (authored.length > 0) {
        for (const node of Array.from(this.childNodes)) node.remove();
        this.#authored = authored;
      } else {
        this.#hydrating = true;
      }
      const json = this.getAttribute(SSR_PROPS_ATTRIBUTE);
      if (json) {
        try {
          const states = this.#states();
          for (const [name, value] of Object.entries(JSON.parse(json) as Record<string, unknown>)) states[name]?.write(value);
        } catch {
          // Malformed: hydration assigns them as properties.
        }
      }
      this.removeAttribute(SSR_ATTRIBUTE);
      this.removeAttribute(SSR_PROPS_ATTRIBUTE);
      (this as unknown as Record<symbol, unknown>)[OWNS_CONTENT] = true;
      this.#root = this;
    } else {
      // Light DOM: the author's children are the content. Take them out before anything
      // renders, so they survive and the component can place them.
      this.#authored = Array.from(this.childNodes);
      for (const node of this.#authored) node.remove();
      this.#root = this;
    }

    // Detached: the element lives as long as it is connected, not as long as whatever created
    // it. Linked to that creator for context only, so an app's providers reach `render()`.
    const creator = this.#creator ?? getOwner();
    runWithOwner(null, () => withReactiveScope(this.#reactiveScope(), () =>
      root((dispose) => {
        const own = getOwner();
        this.#rootOwner = own;
        if (own && creator) own.parent = creator;
        this.#dispose = dispose;
        // Reflects live in the same scope as the content, so they stop when it does.
        this.#startReflecting();
        const draw = () => ((typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment()) ? hotKeep(this, () => this.render()) : this.render());
        const hydrator = this.#hydrating ? installedHydrator() : undefined;
        if (hydrator) hydrator.hydrate(this, draw);
        else {
          if (this.#hydrating) {
            // Server content and nothing to adopt it with: render afresh rather than beside it.
            if ((typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment())) {
              console.warn(`[fluixi] <${this.localName}> was rendered on the server, but nothing installs element hydration, so it renders again in the browser. Import '@fluixi/web-components/hydrate' in the client entry (@fluixi/start adds it).`);
            }
            this.replaceChildren();
          }
          insert(this.#root as unknown as Element, draw() as never);
        }
        this.#hydrating = false;
      }),
    ));

    // In light DOM the element decides where the children written between its tags go. One
    // that places none of them hides them, which is silent unless said.
    const shown = (node: ChildNode) => node.nodeType === 1 || (node.nodeType === 3 && node.textContent?.trim());
    if (this.#root === this && this.#authored.some((node) => shown(node) && !node.isConnected)) {
      console.warn(
        `[fluixi] <${this.localName}> has children between its tags that its render() does not place, so they ` +
          `are not shown. Place this.authoredChildren in render(), or use shadow DOM with a <slot>.`,
      );
    }
  }

  #startReflecting(): void {
    for (const state of Object.values(this.#states())) {
      const attribute = state.attribute;
      if (attribute === false || !state.declaration.reflect) continue;
      effect(() => {
        const next = state.declaration.toAttribute(state.read());
        this.#reflecting.add(attribute);
        try {
          if (next === null) this.removeAttribute(attribute);
          else this.setAttribute(attribute, next);
        } finally {
          this.#reflecting.delete(attribute);
        }
      }, undefined, { name: `reflect ${attribute}` });
    }
  }

  /**
   * Hydration found this element after it had already rendered, as a server-rendered one does:
   * link the render to the app now, so what it provides reaches the element. Consumers that
   * found nothing are told to look again.
   */
  /**
   * Rendered by the server inside an app, and upgraded before that app hydrated: nothing
   * above it yet, so a context read in its first render would find nothing. Light DOM only;
   * a shadow root is built by the client.
   */
  #shouldWaitForHost(): boolean {
    const shadow = (this.constructor as typeof HTMLReactiveElement).shadow;
    return !this.#waited && !this.#handed && (shadow === undefined || shadow === false) && this.hasAttribute(SSR_ATTRIBUTE);
  }

  /**
   * Wait a microtask, so an entry module that imported this element has called `startClient`.
   * Then build when the app hands over an owner, or when its hydration ends without reaching
   * this element. No app hydrating (a static page, another framework): build now.
   */
  #waitForHost(): void {
    let cancelled = false;
    let stop: () => void = () => {};
    this.#waiting = () => {
      cancelled = true;
      stop();
    };
    const resume = () => {
      if (cancelled) return;
      this.#waiting = null;
      this.#waited = true;
      if (!this.#built && this.isConnected) this.#build();
    };
    queueMicrotask(() => {
      if (cancelled) return;
      if (isAppHydrationPending()) stop = whenAppHydrated(resume);
      else resume();
    });
  }

  #adoptOwner(owner: Owner | null): void {
    if (!owner || this.#handed) return;
    this.#handed = true;
    this.#creator = owner;
    if (this.#waiting) {
      this.#waiting();
      this.#waiting = null;
      // At the end of the page's hydration pass, not now: the page claims this element, then
      // inserts the children written between its tags, and the build has to see them to place
      // them. Still inside the pass's call, so before anything that follows hydration (the
      // replay of early clicks among them).
      afterHydrationPass(() => {
        if (!this.#built && this.isConnected) this.#build();
      });
      return;
    }
    if (!this.#rootOwner) return;
    this.#rootOwner.parent = owner;
    announceOwner(this);
  }

  #teardown(): void {
    this.#dispose?.();
    this.#dispose = null;
    this.#rootOwner = null;
    this.#built = false;
    if (this.#scope) closeReactiveScope(this.#scope);
    this.#scope = null;
    // The props outlive the scope: their values move to new signals made inside the next one,
    // so an element added back shows its props under the scope it reports then.
    if (this.#statesCache) {
      this.#carried = Object.fromEntries(Object.entries(this.#statesCache).map(([name, state]) => [name, state.read()]));
      this.#statesCache = null;
    }
    // The rendered content goes with the scope. Light children were taken out at build time
    // and are put back, so the element reads as it was authored.
    if (this.#root === this) {
      this.textContent = '';
      for (const node of this.#authored) this.appendChild(node);
    }
  }
}

/**
 * `HTMLReactiveElement` with the declared props typed on the instance:
 * `class Counter extends typedElement(props)` gives `this.step` its type. Static props alone
 * work at runtime; this is only the type.
 */
export function typedElement<S extends Schema>(props: S): TypedElementClass<S> {
  abstract class Typed extends HTMLReactiveElement {
    static override props = props;
  }
  return Typed as unknown as TypedElementClass<S>;
}

/**
 * What `typedElement` returns: the base class, with the props typed on the instance and on
 * the static side, so a subclass can write `static props = { ...Parent.props, extra }`.
 */
export type TypedElementClass<S extends Schema> = (abstract new () => HTMLReactiveElement & PropValues<S>) &
  Omit<typeof HTMLReactiveElement, 'prototype' | 'props'> & { props: S };

// ── The function form, as a subclass ────────────────────────────────────────

/**
 * What a mixin extends: an element class, instance and statics. Constrain a mixin's base to it,
 * `function Toggle<B extends ElementBase>(Base: B)`, and `super.observedAttributes` is typed.
 */
export type ElementBase = (abstract new (...args: any[]) => HTMLReactiveElement) & {
  readonly observedAttributes: string[];
  props?: Schema;
  shadow?: ShadowOption;
  styles?: ElementStyles;
};

/**
 * A class-to-class mixin, applied over `HTMLReactiveElement` in the function form. Generic over
 * `ElementBase`, or written against `HTMLReactiveElement` itself.
 */
export type ElementMixin =
  | ((base: ElementBase) => ElementBase)
  | ((base: typeof HTMLReactiveElement) => typeof HTMLReactiveElement);

export interface ElementOptions<S extends Schema> {
  /** Declared properties and the attributes that mirror them. */
  props?: S;
  /** See `HTMLReactiveElement.shadow`. */
  shadow?: ShadowOption;
  /** See `HTMLReactiveElement.styles`. */
  styles?: ElementStyles;
  /** Passed through to `customElements.define`. */
  define?: DefineOptions;
  /**
   * Mixins applied over `HTMLReactiveElement`, in order, the way a class writes
   * `extends B(A(HTMLReactiveElement))`. A mixin that implements a platform callback calls
   * `super` and runs before this element's own work.
   */
  mixins?: ElementMixin[];
}

/**
 * The constructor the function form hands back, carrying the element's properties.
 *
 * `new Counter().step` is a number rather than an error, and
 * `HTMLElementTagNameMap['fx-counter'] = InstanceType<typeof Counter>` is the whole
 * declaration a consumer writes.
 */
export interface ElementConstructor<S extends Schema> extends CustomElementConstructor {
  new (): HTMLReactiveElement & PropValues<S>;
  readonly observedAttributes: string[];
}

/** What a setup function is handed. */
export interface Host<S extends Schema> {
  /** The custom element. For focus, measurement, and anything DOM-level. */
  readonly el: HTMLElement;
  /** Reactive reads of the declared properties. */
  readonly props: PropAccessors<S>;
  /** Write a property from inside. Reflects too, when the declaration says so. */
  set<K extends keyof S>(name: K, value: S[K] extends PropDeclaration<infer T> ? T : never): void;
  /** Emit a `CustomEvent`. False when a listener cancelled it. */
  readonly dispatch: Dispatch;
  /** Elements inside this one, by `data-target`. */
  readonly targets: Targets;
  /** The children the author wrote between the tags, in light DOM. Empty under shadow DOM. */
  children(): ChildNode[];
  /** `provideContext` for this element: give `context` to what is inside it. */
  provide<T>(context: ElementContext<T>, value: T | Accessor<T>): void;
  /** `consumeContext` for this element: the nearest value of `context` above it. */
  consume<T>(context: ElementContext<T>, options?: ConsumeOptions): Accessor<T>;
}

export type Setup<S extends Schema> = (host: Host<S>) => unknown;

export function createElementClass<S extends Schema>(setup: Setup<S>, options: ElementOptions<S> = {}): ElementConstructor<S> {
  const hot: HotSetup = { setup, instances: new Set() };
  let Base: ElementBase = HTMLReactiveElement;
  // Either shape takes what the previous one returned: the runtime class is the same.
  for (const mixin of options.mixins ?? []) Base = (mixin as (base: ElementBase) => ElementBase)(Base);

  class SetupElement extends Base {
    static override props = options.props ?? {};
    static override shadow = options.shadow;
    static override styles = options.styles;

    static [HOT_SETUP] = hot;

    protected override render(): unknown {
      const accessors: Record<string, Accessor<unknown>> = {};
      for (const name of Object.keys(schemaOf(this.constructor))) {
        accessors[name] = () => (this as unknown as Record<string, unknown>)[name];
      }
      return (hot.setup as Setup<S>)({
        el: this,
        props: accessors as PropAccessors<S>,
        set: (name, value) => {
          (this as unknown as Record<string, unknown>)[name as string] = value;
        },
        dispatch: (type, detail, init) => this.emit(type, detail, init),
        targets: this.targets,
        children: () => [...this.authoredChildren],
        provide: (context, value) => provideContext(this, context, value),
        consume: (context, options) => consumeContext(this, context, options),
      });
    }
  }
  return SetupElement as unknown as ElementConstructor<S>;
}

/**
 * Define a Fluixi component as a custom element.
 *
 * Returns the constructor, so a caller can subclass it or hand it to a lazy loader. On a
 * server it registers with the server renderer's stand-in registry, which is how a page's
 * server render finds and renders the element.
 */
export function defineElement<S extends Schema>(name: string, setup: Setup<S>, options: ElementOptions<S> = {}): ElementConstructor<S> {
  const elements = (typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment()) ? hotElements() : undefined;
  const existing = elements?.get(name) as ElementConstructor<S> | undefined;
  if ((typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment()) && existing) {
    // Defined again by hot reload: new setup, same class, every live instance rebuilt.
    const hot = (existing as unknown as Record<symbol, HotSetup | undefined>)[HOT_SETUP];
    if (!hot) return existing;
    const live = (): Element[] => [...hot.instances].map((ref) => ref.deref()).filter((el): el is NonNullable<typeof el> => !!el?.isConnected);
    hotAnnounce()(`hot update: <${name}>`, () => {
      hot.setup = setup as Setup<any>;
      for (const ref of [...hot.instances]) {
        const element = ref.deref();
        if (element?.isConnected) element[HOT_REBUILD]();
        else hot.instances.delete(ref);
      }
    }, live);
    return existing;
  }
  const constructor = createElementClass(setup, options);
  // `fx-disclosure` → `FxDisclosure`, rather than the generated `SetupElement`: what a stack
  // trace and the devtools graph show for this element.
  const className = name.replace(/(^|-)([a-z0-9])/g, (_, _dash: string, ch: string) => ch.toUpperCase());
  Object.defineProperty(constructor, 'name', { value: className, configurable: true });
  // On the server too: defineCustomElement knows the stand-in registry, and returning early
  // here left the element unknown to the server renderer, sent as an empty tag.
  const defined = defineCustomElement(name, constructor, options.define) as ElementConstructor<S>;
  if ((typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment())) elements?.set(name, defined);
  return defined;
}
