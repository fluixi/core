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
 * them. `render`, `emit`, `targets`, `renderRoot`, `internals` and `authoredChildren` are
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
  openReactiveScope,
  root,
  withReactiveScope,
  type Accessor,
} from '@fluixi/reactive/signal';
import { insert, isServer } from '@fluixi/dom';
import {
  createPropStates,
  observedFrom,
  type PropAccessors,
  type PropDeclaration,
  type PropState,
} from './props.js';
import { defineCustomElement, type DefineOptions } from './registry.js';
import { createDispatch, type Dispatch, type DispatchInit } from './events.js';
import { createTargets, type Targets } from './targets.js';
import type { PropValues } from './types.js';

export type ShadowOption = boolean | 'open' | 'closed';

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

/** The platform callbacks, looked up on whatever sits above this class in the chain. */
interface Lifecycle {
  connectedCallback?(): void;
  disconnectedCallback?(): void;
  adoptedCallback?(): void;
  attributeChangedCallback?(name: string, previous: string | null, value: string | null): void;
}

const prepared = new WeakSet<object>();

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
        stateOf(this, name).write(value);
      },
    });
  }
}

/** Filled by the class's static block: the one way in to its private state. */
let stateOf: (element: HTMLReactiveElement, name: string) => PropState<unknown>;

export class HTMLReactiveElement extends BaseElement {
  /** The declared properties, and the attributes that mirror them. Inherited and merged. */
  static props?: Schema;
  /**
   * `false` (the default) renders into the element itself. `'open'`, `'closed'` or `true`
   * attach a shadow root, which is what native `<slot>` needs. Light DOM is the default: a
   * component that inherits the page's styles is usually what an app wants, and it is the
   * mode that survives a server render without declarative shadow DOM.
   */
  static shadow?: ShadowOption;
  /** Added to the shadow root. Ignored in light DOM, which has no scope to add to. */
  static styles?: string;

  /**
   * The attributes of every declared prop. A mixin in between that observes its own
   * extends this with `super.observedAttributes`; a subclass need not touch it.
   */
  static get observedAttributes(): string[] {
    prepare(this);
    return observedFrom(schemaOf(this));
  }

  static {
    stateOf = (element, name) => {
      const state = element.#states()[name];
      if (!state) throw new Error(`[fluixi] ${name} is not a declared prop of <${element.localName}>`);
      return state;
    };
  }

  #statesCache: Record<string, PropState<unknown>> | null = null;
  /** Prop values kept across a real removal, for the signals the next scope re-creates. */
  #carried: Record<string, unknown> | null = null;
  #dispose: (() => void) | null = null;
  #root: ShadowRoot | HTMLElement = this;
  #authored: ChildNode[] = [];
  #built = false;
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

  constructor() {
    super();
    prepare(new.target);
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
    if (!this.#built) this.#build();
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
    for (const state of Object.values(this.#states())) {
      if (state.attribute !== name) continue;
      state.write(state.declaration.fromAttribute(value));
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

  /** Dispatch a `CustomEvent`, bubbling and composed by default. False when cancelled. */
  protected emit<T>(type: string, detail?: T, init?: DispatchInit): boolean {
    this.#dispatch ??= createDispatch(this);
    return this.#dispatch(type, detail, init);
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

  #build(): void {
    this.#built = true;
    const constructor = this.constructor as typeof HTMLReactiveElement;
    const shadow = constructor.shadow;

    if (shadow !== undefined && shadow !== false) {
      // A declarative shadow root may already be attached from a server render.
      this.#root = this.shadowRoot ?? this.attachShadow({ mode: shadow === true ? 'open' : shadow });
      if (constructor.styles) {
        const style = document.createElement('style');
        style.textContent = constructor.styles;
        this.#root.appendChild(style);
      }
    } else {
      // Light DOM: the author's children are the content. Take them out before anything
      // renders, so they survive and the component can place them.
      this.#authored = Array.from(this.childNodes);
      for (const node of this.#authored) node.remove();
      this.#root = this;
    }

    withReactiveScope(this.#reactiveScope(), () =>
      root((dispose) => {
        this.#dispose = dispose;
        // Reflects live in the same scope as the content, so they stop when it does.
        this.#startReflecting();
        insert(this.#root as unknown as Element, this.render() as never);
      }),
    );

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

  #teardown(): void {
    this.#dispose?.();
    this.#dispose = null;
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

/** A class-to-class mixin, applied over `HTMLReactiveElement` in the function form. */
export type ElementMixin = (base: typeof HTMLReactiveElement) => typeof HTMLReactiveElement;

export interface ElementOptions<S extends Schema> {
  /** Declared properties and the attributes that mirror them. */
  props?: S;
  /** See `HTMLReactiveElement.shadow`. */
  shadow?: ShadowOption;
  /** Added to the shadow root. Ignored in light DOM. */
  styles?: string;
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
}

export type Setup<S extends Schema> = (host: Host<S>) => unknown;

export function createElementClass<S extends Schema>(setup: Setup<S>, options: ElementOptions<S> = {}): ElementConstructor<S> {
  let Base = HTMLReactiveElement;
  for (const mixin of options.mixins ?? []) Base = mixin(Base);

  class SetupElement extends Base {
    static override props = options.props ?? {};
    static override shadow = options.shadow;
    static override styles = options.styles;

    protected override render(): unknown {
      const accessors: Record<string, Accessor<unknown>> = {};
      for (const name of Object.keys(schemaOf(this.constructor))) {
        accessors[name] = () => (this as unknown as Record<string, unknown>)[name];
      }
      return setup({
        el: this,
        props: accessors as PropAccessors<S>,
        set: (name, value) => {
          (this as unknown as Record<string, unknown>)[name as string] = value;
        },
        dispatch: (type, detail, init) => this.emit(type, detail, init),
        targets: this.targets,
        children: () => [...this.authoredChildren],
      });
    }
  }
  return SetupElement as unknown as ElementConstructor<S>;
}

/**
 * Define a Fluixi component as a custom element.
 *
 * Returns the constructor, so a caller can subclass it or hand it to a lazy loader. On a
 * server it builds the class and registers nothing, which keeps the module importable from
 * code that also runs during a server render.
 */
export function defineElement<S extends Schema>(name: string, setup: Setup<S>, options: ElementOptions<S> = {}): ElementConstructor<S> {
  const constructor = createElementClass(setup, options);
  // `fx-disclosure` → `FxDisclosure`, rather than the generated `SetupElement`: what a stack
  // trace and the devtools graph show for this element.
  const className = name.replace(/(^|-)([a-z0-9])/g, (_, _dash: string, ch: string) => ch.toUpperCase());
  Object.defineProperty(constructor, 'name', { value: className, configurable: true });
  if (isServer()) return constructor;
  return defineCustomElement(name, constructor, options.define) as ElementConstructor<S>;
}
