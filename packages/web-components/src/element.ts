/**
 * The custom element itself: lifecycle on Fluixi's existing ownership model.
 *
 * Nothing here is a second reactive system. The element owns one `createRoot` scope,
 * everything the setup function builds belongs to it, and `dispose` takes the whole
 * subtree down. Bindings, effects and listeners come off with it, because the runtime
 * that created them registered them there.
 *
 * `insert` rather than `render`: `render` clears its container going in and again
 * coming out (@fluixi/dom runtime.ts), which for a light-DOM element would delete the
 * author's own children before the component ever saw them.
 */
import { effect, root, type Accessor } from '@fluixi/reactive/signal';
import { insert, isServer } from '@fluixi/dom';
import {
  createPropStates,
  observedFrom,
  type PropAccessors,
  type PropDeclaration,
  type PropState,
} from './props.js';
import { defineCustomElement, type DefineOptions } from './registry.js';
import { createDispatch, type Dispatch } from './events.js';
import { createTargets, type Targets } from './targets.js';

export type ShadowOption = boolean | 'open' | 'closed';

export interface ElementOptions<S extends Record<string, PropDeclaration<unknown>>> {
  /** Declared properties and the attributes that mirror them. */
  props?: S;
  /**
   * `false` renders into the element itself. `'open'`, `'closed'` or `true` attach a
   * shadow root, which is what native `<slot>` needs. Light DOM is the default: a
   * component that inherits the page's styles is usually what an app wants, and it is
   * the mode that survives a server render without declarative shadow DOM.
   */
  shadow?: ShadowOption;
  /** Added to the shadow root. Ignored in light DOM, which has no scope to add to. */
  styles?: string;
  /** Passed through to `customElements.define`. */
  define?: DefineOptions;
  /**
   * The class to extend, defaulting to `HTMLElement`.
   *
   * This is the mixin seam. Custom element mixins are written as `Mixin(Base)`
   * returning a class, so anything from that ecosystem composes by passing the result
   * here: `base: ScopedElementsMixin(HTMLElement)`. Several compose by nesting, which
   * is how they are meant to be used.
   *
   * The generated class calls `super.connectedCallback?.()` and the rest, so a mixin
   * that implements the same callbacks still runs. Order is base first, then this
   * element's own work, which is what a mixin expects.
   */
  base?: CustomElementConstructor;
}

/** What a setup function is handed. */
export interface Host<S extends Record<string, PropDeclaration<unknown>>> {
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
  /**
   * The children the author wrote between the tags, in light DOM.
   *
   * Empty under shadow DOM, where the browser projects them through `<slot>` and they
   * were never this component's to place.
   */
  children(): ChildNode[];
}

export type Setup<S extends Record<string, PropDeclaration<unknown>>> = (host: Host<S>) => unknown;

/**
 * The callbacks a base class may implement. `super.connectedCallback` cannot be typed
 * or cast, so the base implementation is resolved off its prototype instead, which
 * finds it wherever it sits on the chain and is the same call.
 */
interface Lifecycle {
  connectedCallback?(): void;
  disconnectedCallback?(): void;
  adoptedCallback?(): void;
  attributeChangedCallback?(name: string, previous: string | null, value: string | null): void;
}

export function createElementClass<S extends Record<string, PropDeclaration<unknown>>>(
  setup: Setup<S>,
  options: ElementOptions<S> = {},
): CustomElementConstructor {
  const schema = (options.props ?? {}) as Record<string, PropDeclaration<unknown>>;
  const observed = observedFrom(schema);
  const shadowInit: ShadowRootInit | null =
    options.shadow === false || options.shadow === undefined
      ? null
      : { mode: options.shadow === true ? 'open' : options.shadow };

  const Base = (options.base ?? HTMLElement) as CustomElementConstructor;
  // A mixin base may declare its own observed attributes, and dropping them would
  // silently stop its attributes working. Union, deduplicated.
  const inherited = (Base as unknown as { observedAttributes?: string[] }).observedAttributes ?? [];
  const inheritedLifecycle = Base.prototype as Lifecycle;

  class FluixiElement extends Base {
    static get observedAttributes(): string[] {
      return [...new Set([...inherited, ...observed])];
    }

    private states: Record<string, PropState<unknown>> = createPropStates(schema);
    private dispose: (() => void) | null = null;
    private target: ShadowRoot | HTMLElement = this;
    private lightChildren: ChildNode[] = [];
    private built = false;
    /**
     * Disposal is deferred because `disconnectedCallback` cannot tell a removal from a
     * move. Appending an already-parented node fires disconnect then connect in the
     * same task, and tearing the scope down in between would rebuild the subtree on
     * every reorder, which a keyed list does constantly.
     */
    private pendingDispose: ReturnType<typeof setTimeout> | null = null;
    /** Suppresses the attribute callback a reflect triggers, so it does not loop. */
    private reflecting = new Set<string>();

    constructor() {
      super();
      // A property assigned before upgrade sits as an own property and shadows the
      // prototype accessor. Take it off and replay it through the signal.
      for (const name of Object.keys(schema)) {
        if (!Object.prototype.hasOwnProperty.call(this, name)) continue;
        const value = (this as unknown as Record<string, unknown>)[name];
        delete (this as unknown as Record<string, unknown>)[name];
        this.states[name].write(value);
      }
    }

    connectedCallback(): void {
      // Base first: a mixin expects to run before the subclass that composed it.
      inheritedLifecycle.connectedCallback?.call(this);
      if (this.pendingDispose !== null) {
        clearTimeout(this.pendingDispose);
        this.pendingDispose = null;
        return; // A move. The scope is alive and the DOM is still ours.
      }
      if (!this.built) this.build();
    }

    disconnectedCallback(): void {
      inheritedLifecycle.disconnectedCallback?.call(this);
      if (!this.built || this.pendingDispose !== null) return;
      this.pendingDispose = setTimeout(() => {
        this.pendingDispose = null;
        this.teardown();
      }, 0);
    }

    adoptedCallback(): void {
      // Another document, the same scope. Declared so the choice is visible rather
      // than absent; nothing reactive depends on which document holds the node.
      inheritedLifecycle.adoptedCallback?.call(this);
    }

    attributeChangedCallback(name: string, previous: string | null, value: string | null): void {
      inheritedLifecycle.attributeChangedCallback?.call(this, name, previous, value);
      if (this.reflecting.has(name)) return;
      for (const state of Object.values(this.states)) {
        if (state.attribute !== name) continue;
        state.write(state.declaration.fromAttribute(value));
        return;
      }
    }

    private build(): void {
      this.built = true;

      if (shadowInit) {
        // A declarative shadow root may already be attached from a server render.
        this.target = this.shadowRoot ?? this.attachShadow(shadowInit);
        if (options.styles) {
          const style = document.createElement('style');
          style.textContent = options.styles;
          this.target.appendChild(style);
        }
      } else {
        // Light DOM: the author's children are the content. Take them out before
        // anything renders, so they survive and the component can place them.
        this.lightChildren = Array.from(this.childNodes);
        for (const node of this.lightChildren) node.remove();
        this.target = this;
      }

      root((dispose) => {
        this.dispose = dispose;
        // Reflects live in the same scope as the content, so they stop when it does.
        this.startReflecting();
        insert(this.target as unknown as Element, setup(this.host()) as never);
      });
    }

    private host(): Host<S> {
      const accessors: Record<string, Accessor<unknown>> = {};
      for (const [name, state] of Object.entries(this.states)) accessors[name] = state.read;
      return {
        el: this,
        props: accessors as PropAccessors<S>,
        set: (name, value) => {
          this.states[name as string]?.write(value as unknown);
        },
        dispatch: createDispatch(this),
        targets: createTargets(() => this.target),
        children: () => this.lightChildren,
      };
    }

    private startReflecting(): void {
      for (const state of Object.values(this.states)) {
        const attribute = state.attribute;
        if (attribute === false || !state.declaration.reflect) continue;
        effect(() => {
          const next = state.declaration.toAttribute(state.read());
          this.reflecting.add(attribute);
          try {
            if (next === null) this.removeAttribute(attribute);
            else this.setAttribute(attribute, next);
          } finally {
            this.reflecting.delete(attribute);
          }
        });
      }
    }

    private teardown(): void {
      this.dispose?.();
      this.dispose = null;
      this.built = false;
      // The rendered content goes with the scope. Light children were taken out at
      // build time and are put back, so the element reads as it was authored.
      if (this.target === this) {
        this.textContent = '';
        for (const node of this.lightChildren) this.appendChild(node);
      }
    }
  }

  // `el.count = 3` has to reach the signal, so the accessors go on the prototype.
  for (const name of Object.keys(schema)) {
    Object.defineProperty(FluixiElement.prototype, name, {
      configurable: true,
      enumerable: true,
      get(this: { states: Record<string, PropState<unknown>> }) {
        return this.states[name].read();
      },
      set(this: { states: Record<string, PropState<unknown>> }, value: unknown) {
        this.states[name].write(value);
      },
    });
  }

  return FluixiElement as unknown as CustomElementConstructor;
}

/**
 * Define a Fluixi component as a custom element.
 *
 * Returns the constructor, so a caller can subclass it or hand it to a lazy loader.
 * On a server it builds the class and registers nothing, which keeps the module
 * importable from code that also runs during a server render.
 */
export function defineElement<S extends Record<string, PropDeclaration<unknown>>>(
  name: string,
  setup: Setup<S>,
  options: ElementOptions<S> = {},
): CustomElementConstructor {
  const constructor = createElementClass(setup, options);
  if (isServer()) return constructor;
  return defineCustomElement(name, constructor, options.define);
}
