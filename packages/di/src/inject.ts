/**
 * What code calls: resolve from the current context, provide to a component, the whole app or
 * the process, and work with the injection context.
 *
 * @module
 */
import { getRequestContext } from '@fluixi/dom';
import { getOwner, onCleanup } from '@fluixi/reactive/signal';
import { currentInjector, nearestOwnerInjector, rootInjector } from './hierarchy.js';
import { Injector } from './injector.js';
import type { InjectOptions, Provider } from './provider.js';
import { state } from './state.js';
import type { Token } from './token.js';

/**
 * Resolve `token` from the current injection context: the injector set by
 * {@link runInInjectionContext} or building the current service, else the nearest component
 * injector up the reactive owner tree, else the root (the request's on the server, the app's in
 * the browser).
 *
 * Call it during a component's setup, inside a provider's constructor or factory, or inside
 * {@link runInInjectionContext}. In an event handler or after an `await` there is no component
 * owner any more: keep the value, or the injector (`inject(INJECTOR)`), from setup instead.
 *
 * @param token - What to resolve.
 * @param options - Where to look and what to do when nothing is found; see {@link InjectOptions}.
 * @returns The value, or `null` when `optional` is set and nothing provides the token.
 * @throws {@link InjectionError} When nothing provides the token, or on a dependency cycle.
 *
 * @example
 * ```ts
 * function Profile() {
 *   const users = inject(Users);
 *   const analytics = inject(Analytics, { optional: true }); // null where not provided
 *   ...
 * }
 * ```
 */
export function inject<T>(token: Token<T>, options: InjectOptions & { optional: true }): T | null;
export function inject<T>(token: Token<T>, options?: InjectOptions): T;
export function inject<T>(token: Token<T>, options?: InjectOptions): T | null {
  return currentInjector().get(token, options ?? {});
}

/**
 * Provide services to the current component and its descendants. The first call in a component
 * creates its injector, below the nearest ancestor component's injector (or the root); later
 * calls add to it. The injector is disposed when the component unmounts: hooks registered on its
 * `DestroyRef` and each service's `onDestroy()` run then.
 *
 * @param providers - The providers to add to the component's injector.
 * @returns The component's injector.
 * @throws Error When called outside a component, where there is no owner to attach to; use
 *   {@link provideRoot} for services of the whole app.
 *
 * @example
 * ```ts
 * function Checkout() {
 *   provide([{ provide: Cart, useClass: CartStore }]); // one cart per checkout, released with it
 *   return <CheckoutSteps />;
 * }
 * ```
 */
export function provide(providers: ReadonlyArray<Provider>): Injector {
  const owner = getOwner() as any;
  if (!owner) {
    throw new Error('[fluixi/di] provide() runs inside a component. Use provideRoot() for services of the whole app.');
  }
  let inj = state.ownerInjectors.get(owner);
  if (!inj) {
    const created = new Injector(nearestOwnerInjector(owner.parent) ?? rootInjector(), 'owner');
    state.ownerInjectors.set(owner, created);
    onCleanup(() => created.dispose());
    inj = created;
  }
  return inj.register(providers);
}

/**
 * Provide services to the whole app, in the root injector: one instance per request on the
 * server (released when the request ends, so per-user state never leaks between requests), one
 * per app in the browser.
 *
 * Call it at module load, before the first render: in an app module's providers, or in the app's
 * entry. Providers added later reach the browser's root and the current request's root, not
 * requests already finished.
 *
 * @param providers - The providers every root injector starts with.
 *
 * @example
 * ```ts
 * provideRoot([
 *   { provide: ApiUrl, useValue: import.meta.env.API_URL },
 *   { provide: Http, useClass: FetchHttp, deps: [ApiUrl] },
 * ]);
 * ```
 */
export function provideRoot(providers: ReadonlyArray<Provider>): void {
  state.rootProviders.push(...providers);
  state.clientRoot?.register(providers);
  const ctx = getRequestContext() as object | undefined;
  if (ctx) state.requestRoots.get(ctx)?.register(providers);
}

/**
 * Provide services once per process, in the platform injector above every root: shared by every
 * request on the server. For what is costly to create and safe to share (a connection pool,
 * parsed settings); never for per-user state, which belongs in {@link provideRoot}.
 *
 * @param providers - The providers the platform injector holds.
 *
 * @example
 * ```ts
 * providePlatform([{ provide: Database, useFactory: () => createPool(process.env.DATABASE_URL) }]);
 * ```
 */
export function providePlatform(providers: ReadonlyArray<Provider>): void {
  state.platformProviders.push(...providers);
  state.platform?.register(providers);
}

/**
 * Run `fn` with `injector` as the injection context, so `inject()` inside it resolves from
 * `injector`. The context lasts for the synchronous part of `fn`: after an `await`, resolve what
 * is needed before it, or call this again.
 *
 * @param injector - Where `inject()` resolves from while `fn` runs.
 * @param fn - The work to run.
 * @returns What `fn` returns.
 *
 * @example
 * ```ts
 * const injector = inject(INJECTOR);
 * button.addEventListener('click', () => runInInjectionContext(injector, () => inject(Cart).add(item)));
 * ```
 */
export function runInInjectionContext<R>(injector: Injector, fn: () => R): R {
  const previous = state.explicit;
  state.explicit = injector;
  try {
    return fn();
  } finally {
    state.explicit = previous;
  }
}

/**
 * Whether `inject()` can resolve here: inside {@link runInInjectionContext} or a provider being
 * built, during a component's setup, or during a server request.
 *
 * @returns `true` when an injection context is active.
 */
export function isInInjectionContext(): boolean {
  return state.explicit !== null || getOwner() !== null || getRequestContext() !== undefined;
}

/**
 * Throw unless an injection context is active. For functions that call `inject()` themselves and
 * want a clear error for their own callers instead of an unexpected resolution from the root.
 *
 * @param name - The calling function's name, used in the message.
 * @throws Error When no injection context is active.
 *
 * @example
 * ```ts
 * export function useCart(): Cart {
 *   assertInInjectionContext('useCart');
 *   return inject(Cart);
 * }
 * ```
 */
export function assertInInjectionContext(name: string): void {
  if (!isInInjectionContext()) {
    throw new Error(`[fluixi/di] ${name}() runs inside a component, a request or runInInjectionContext().`);
  }
}

/**
 * The injector of the current context: to keep, and resolve from or hand to
 * {@link runInInjectionContext} later. Same as `inject(INJECTOR)`.
 *
 * @returns The injector `inject()` would resolve from here.
 */
export function getInjector(): Injector {
  return currentInjector();
}

/**
 * Create a standalone injector holding `providers`, below `parent`. For a scope of your own (a
 * job, a dialog, a test): what it builds is released when you call `dispose()` on it.
 *
 * @param providers - The providers the new injector holds.
 * @param parent - Where unresolved tokens are looked for next. Defaults to the current root;
 *   `null` makes it the top of its own chain.
 * @returns The new injector.
 *
 * @example
 * ```ts
 * const job = createInjector([{ provide: JobId, useValue: id }]);
 * try {
 *   await runInInjectionContext(job, () => inject(Importer)).run();
 * } finally {
 *   job.dispose();
 * }
 * ```
 */
export function createInjector(providers: ReadonlyArray<Provider>, parent?: Injector | null): Injector {
  return new Injector(parent === undefined ? rootInjector() : parent, 'standalone').register(providers);
}
