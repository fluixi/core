/**
 * Context between elements, over the Web Components Community Group protocol.
 *
 * A consumer dispatches `context-request` from itself; it bubbles, crosses shadow roots, and
 * the nearest provider of that context answers and stops it. With `subscribe` the provider
 * calls back again on every change. A provider that turns up late (its tag upgraded after the
 * consumer asked) announces itself with `context-provider`, and consumers still waiting ask
 * again. Lit's `@lit/context` speaks the same protocol, so the two interoperate when they share
 * the context object.
 *
 * The key is a Fluixi context (`createContext` from `@fluixi/core` or `@fluixi/reactive`), which
 * also joins the two trees: an element that finds no provider above it in the DOM reads the
 * owner tree it was created in, and what an element provides is visible to `useContext` in the
 * components it renders.
 */
import { effect, getOwner, onCleanup, runWithOwner, signal, untrack, useContext, type Accessor } from '@fluixi/reactive/signal';

/** A context key. `createContext` in `@fluixi/core` and `@fluixi/reactive` both return one. */
export interface ElementContext<T> {
  readonly id: symbol;
  readonly defaultValue?: T;
}

type ContextCallback<T> = (value: T, unsubscribe?: () => void) => void;

/** Asks for a context. Field names and order follow the protocol, and so Lit. */
export class ContextRequestEvent<T = unknown> extends Event {
  constructor(
    readonly context: unknown,
    readonly contextTarget: Element,
    readonly callback: ContextCallback<T>,
    readonly subscribe?: boolean,
  ) {
    super('context-request', { bubbles: true, composed: true });
  }
}

/** A provider that has just become available, so a consumer still waiting can ask again. */
export class ContextProviderEvent extends Event {
  constructor(
    readonly context: unknown,
    readonly contextTarget: Element,
  ) {
    super('context-provider', { bubbles: true, composed: true });
  }
}

/**
 * An element has just been linked to the app it was rendered in: hydration reached it after it
 * had rendered. Consumers inside it that found no provider read the owner tree again. Fluixi's
 * own, not part of the protocol.
 */
class ContextOwnerEvent extends Event {
  constructor(readonly element: Element) {
    super('fluixi-context-owner');
  }
}

/** Tell consumers under `element` that the owner tree above them changed. */
export function announceOwner(element: Element): void {
  element.ownerDocument.dispatchEvent(new ContextOwnerEvent(element));
}

declare global {
  interface HTMLElementEventMap {
    'context-request': ContextRequestEvent;
    'context-provider': ContextProviderEvent;
  }
}

/**
 * The same context. Identity first, as the protocol has it; then the Fluixi id, because
 * `@fluixi/core`'s `createContext` wraps the reactive one in a second object with the same id.
 */
function matches(key: unknown, context: ElementContext<unknown>): boolean {
  return key === context || (typeof key === 'object' && key !== null && (key as { id?: unknown }).id === context.id);
}

function describe(context: ElementContext<unknown>): string {
  return context.id.description ?? 'context';
}

/**
 * Answer `context-request` for `context` from inside `host`. `value` is a value or an accessor;
 * with an accessor, subscribed consumers are called again when it changes. Stops when the
 * reactive scope it was called in ends: call it in `render()`.
 */
export function provideContext<T>(host: HTMLElement, context: ElementContext<T>, value: T | Accessor<T>): () => void {
  const read = typeof value === 'function' ? (value as Accessor<T>) : () => value;
  const subscribers = new Map<ContextCallback<T>, () => void>();

  const onRequest = (event: Event): void => {
    const request = event as ContextRequestEvent<T>;
    // The host asking for its own context wants the one above it.
    if (!matches(request.context, context) || request.contextTarget === host) return;
    event.stopImmediatePropagation();
    if (!request.subscribe) {
      request.callback(untrack(read));
      return;
    }
    const unsubscribe = (): void => void subscribers.delete(request.callback);
    subscribers.set(request.callback, unsubscribe);
    request.callback(untrack(read), unsubscribe);
  };
  // A server render has no DOM events: the owner tree below carries the value there.
  const dom = typeof host.addEventListener === 'function';
  if (dom) host.addEventListener('context-request', onRequest);

  // Fluixi components the element renders read it with `useContext`, from the owner `render()`
  // runs under.
  const owner = getOwner();
  let first = true;
  const stopTracking = effect(
    () => {
      const next = read();
      if (owner) (owner.contexts ??= new Map()).set(context.id, next);
      if (first) {
        first = false;
        return;
      }
      for (const [callback, unsubscribe] of subscribers) callback(next, unsubscribe);
    },
    undefined,
    { name: `provide ${describe(context)}` },
  );

  // After the render that called this has placed its content: a light DOM provider takes its
  // children out while it renders, so a consumer among them is not inside it yet.
  if (dom) {
    queueMicrotask(() => {
      if (!stopped) host.dispatchEvent(new ContextProviderEvent(context, host));
    });
  }

  let stopped = false;
  const stop = (): void => {
    if (stopped) return;
    stopped = true;
    if (dom) host.removeEventListener('context-request', onRequest);
    stopTracking();
    subscribers.clear();
  };
  onCleanup(stop);
  return stop;
}

export interface ConsumeOptions {
  /** Keep receiving the provider's changes. Defaults to true. */
  subscribe?: boolean;
}

/**
 * The nearest value of `context` above `host`, as an accessor.
 *
 * Asked of the DOM first. With no provider there, it is the value in the owner tree the element
 * was created in, so `<Ctx.Provider>` in a Fluixi app reaches an element rendered inside it, and
 * otherwise the context's default. A provider that appears later takes over. Stops when the
 * reactive scope it was called in ends: call it in `render()`.
 */
export function consumeContext<T>(host: HTMLElement, context: ElementContext<T>, options: ConsumeOptions = {}): Accessor<T> {
  const subscribe = options.subscribe ?? true;
  // The owner tree as it stands now, and again if hydration links this element up later.
  const owner = getOwner();
  const fromTree = (): T => runWithOwner(owner, () => useContext(context as { id: symbol; defaultValue?: T }) as T);
  const value = signal<T>(fromTree(), { name: describe(context) });
  // A server render: no DOM to ask, the owner tree is the answer.
  if (typeof host.dispatchEvent !== 'function') return () => value();
  let answered = false;
  let unsubscribe: (() => void) | undefined;

  const ask = (): void => {
    host.dispatchEvent(
      new ContextRequestEvent<T>(
        context,
        host,
        (next, stop) => {
          answered = true;
          if (stop) unsubscribe = stop;
          // `.set` calls a function argument as an updater; a context can hold a function.
          value.set(() => next);
        },
        subscribe,
      ),
    );
  };

  const doc = host.ownerDocument;
  const onProvider = (event: Event): void => {
    const announced = event as ContextProviderEvent;
    if (answered || !matches(announced.context, context)) return;
    if (containsComposed(announced.contextTarget, host)) ask();
  };

  const onOwner = (event: Event): void => {
    if (answered || !containsComposed((event as ContextOwnerEvent).element, host)) return;
    const next = fromTree();
    value.set(() => next);
  };

  ask();
  if (!answered) {
    doc.addEventListener('context-provider', onProvider);
    doc.addEventListener('fluixi-context-owner', onOwner);
  }

  onCleanup(() => {
    unsubscribe?.();
    doc.removeEventListener('context-provider', onProvider);
    doc.removeEventListener('fluixi-context-owner', onOwner);
  });
  return () => value();
}

/** Whether `node` sits under `container` once shadow roots are looked through. */
function containsComposed(container: Node, node: Node): boolean {
  let at: Node | null = node;
  while (at) {
    if (at === container) return true;
    at = at.parentNode ?? (at instanceof ShadowRoot ? at.host : null);
  }
  return false;
}
