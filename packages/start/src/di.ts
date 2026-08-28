/**
 * @fluixi/start/di — dependency injection, the Angular way, but SSR-correct and reactive.
 *
 * Three things make this distinct from Angular's DI:
 *
 *  1. **SSR request isolation, for free.** A "root" provider is a singleton on the CLIENT but
 *     a fresh instance PER REQUEST on the server — because the root injector lives in the
 *     per-request `RequestContext` (the same machinery that isolates resources/markers). So
 *     a stateful root service (a per-user cache, a DB unit-of-work) never leaks across two
 *     concurrent SSR requests. No zone, no `providedIn` ceremony, no manual request injectors.
 *
 *  2. **The reactive owner tree IS the injector hierarchy.** `provide()` in a component
 *     attaches a child injector to that component's reactive owner; descendants `inject()`
 *     by walking the owner chain — exactly how context resolves. Component-scoped services
 *     are disposed with the component (their `onDestroy()` runs on owner cleanup).
 *
 *  3. **Function injection, tree-shakable tokens.** No decorators/reflect-metadata. A token
 *     can carry a `factory` (Angular's `providedIn: 'root'`), so an unused service is dropped
 *     by the bundler; a used one self-provides at the root with no registration.
 *
 *     const Logger = injectionToken<Logger>('Logger', { factory: () => new ConsoleLogger() });
 *     class UserService { #log = inject(Logger); load() { this.#log.info('…'); } }
 *     const Users = injectionToken('Users', { factory: () => new UserService() });
 *     // in a component / route / server function:
 *     const users = inject(Users);
 *
 * Client-safe: imports only `fluixi` (owner) + `@fluixi/dom`'s pure `getRequestContext`.
 */
import { getOwner, onCleanup } from 'fluixi';
import { getRequestContext } from '@fluixi/dom';

// ── Tokens ───────────────────────────────────────────────────────────────────

export interface Token<T> {
  readonly id: symbol;
  readonly name: string;
  /** Tree-shakable root default (Angular's `providedIn: 'root'`). Used when no provider is found. */
  readonly factory?: () => T;
}

/** Create a typed injection token. Give it a `factory` to be self-providing at the root. */
export function injectionToken<T>(name: string, options?: { factory?: () => T }): Token<T> {
  return { id: Symbol(name), name, factory: options?.factory };
}

export type Provider<T = any> =
  | { provide: Token<T>; useValue: T }
  | { provide: Token<T>; useClass: new (...args: any[]) => T; deps?: ReadonlyArray<Token<any>> }
  | { provide: Token<T>; useFactory: (...deps: any[]) => T; deps?: ReadonlyArray<Token<any>> }
  | { provide: Token<T>; useExisting: Token<T> };

// ── Injector ─────────────────────────────────────────────────────────────────

interface Rec {
  provider: Provider;
  built: boolean;
  building: boolean;
  value: unknown;
}

export class Injector {
  readonly records = new Map<symbol, Rec>();
  constructor(readonly parent: Injector | null = null) {}

  register(providers: ReadonlyArray<Provider>): this {
    for (const p of providers) {
      this.records.set(p.provide.id, { provider: p, built: false, building: false, value: undefined });
    }
    return this;
  }

  /** Resolve a token from this injector, walking up the parent chain, then the token's factory. */
  get<T>(token: Token<T>): T {
    let inj: Injector | null = this;
    while (inj) {
      const rec = inj.records.get(token.id);
      if (rec) return inj.#build(token, rec) as T;
      inj = inj.parent;
    }
    // Unprovided but self-providing → instantiate at the ROOT of this chain (so it's a
    // per-request singleton on the server, an app singleton on the client).
    if (token.factory) return rootOf(this).#fromFactory(token);
    throw new Error(
      `[fluixi/di] No provider for "${token.name}". Register it with provide()/provideRoot(), ` +
        `or give the token a { factory } to self-provide.`,
    );
  }

  #build<T>(token: Token<T>, rec: Rec): T {
    if (rec.built) return rec.value as T;
    if (rec.building) throw new Error(`[fluixi/di] Circular dependency while resolving "${token.name}".`);
    rec.building = true;
    const p = rec.provider as any;
    try {
      if ('useValue' in p) rec.value = p.useValue;
      else if ('useExisting' in p) rec.value = this.get(p.useExisting);
      else {
        const deps = (p.deps ?? []).map((d: Token<any>) => this.get(d)); // deps resolve from where the provider lives
        rec.value = 'useClass' in p ? new p.useClass(...deps) : p.useFactory(...deps);
      }
    } finally {
      rec.building = false;
    }
    rec.built = true;
    return rec.value as T;
  }

  #fromFactory<T>(token: Token<T>): T {
    let rec = this.records.get(token.id);
    if (!rec) {
      rec = { provider: { provide: token, useFactory: token.factory! } as Provider, built: false, building: false, value: undefined };
      this.records.set(token.id, rec);
    }
    return this.#build(token, rec);
  }

  /** Run every built service's `onDestroy()`. Owner-scoped injectors call this on cleanup. */
  dispose(): void {
    for (const rec of this.records.values()) {
      const v = rec.value as { onDestroy?: () => void } | null;
      if (rec.built && v && typeof v.onDestroy === 'function') {
        try {
          v.onDestroy();
        } catch (e) {
          console.error('[fluixi/di] onDestroy threw —', e);
        }
      }
    }
    this.records.clear();
  }
}

function rootOf(inj: Injector): Injector {
  let i = inj;
  while (i.parent) i = i.parent;
  return i;
}

// ── Scoping: root (per-request on server / singleton on client) + owner tree ──

const _rootProviders: Provider[] = [];
const _reqInjectors = new WeakMap<object, Injector>(); // per-request root (server)
const _ownerInjectors = new WeakMap<object, Injector>(); // per reactive owner (component scope)
let _clientRoot: Injector | null = null;
let _explicit: Injector | null = null;

/** The root injector — per-request during SSR (isolated), a module singleton on the client. */
function rootInjector(): Injector {
  const ctx = getRequestContext() as object | undefined;
  if (ctx) {
    let inj = _reqInjectors.get(ctx);
    if (!inj) _reqInjectors.set(ctx, (inj = new Injector(null).register(_rootProviders)));
    return inj;
  }
  return (_clientRoot ??= new Injector(null).register(_rootProviders));
}

/** Nearest ancestor owner injector, else the root — the parent of a new component injector. */
function parentInjectorOf(owner: any): Injector {
  let o = owner?.parent;
  while (o) {
    const inj = _ownerInjectors.get(o);
    if (inj) return inj;
    o = o.parent;
  }
  return rootInjector();
}

/** The injector for the current scope: explicit context → nearest owner injector → root. */
function currentInjector(): Injector {
  if (_explicit) return _explicit;
  let o = getOwner() as any;
  while (o) {
    const inj = _ownerInjectors.get(o);
    if (inj) return inj;
    o = o.parent;
  }
  return rootInjector();
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Resolve a dependency from the current injection context. */
export function inject<T>(token: Token<T>): T {
  return currentInjector().get(token);
}

/**
 * Provide services for the CURRENT component/route and its descendants (owner-scoped). The
 * injector is disposed — running each service's `onDestroy()` — when the component unmounts.
 */
export function provide(providers: ReadonlyArray<Provider>): Injector {
  const owner = getOwner() as any;
  if (!owner) {
    throw new Error('[fluixi/di] provide() must run inside a component/owner scope. Use provideRoot() for app-wide services.');
  }
  let inj = _ownerInjectors.get(owner);
  if (!inj) {
    inj = new Injector(parentInjectorOf(owner));
    _ownerInjectors.set(owner, inj);
    onCleanup(() => inj!.dispose());
  }
  inj.register(providers);
  return inj;
}

/**
 * Provide app-wide services. On the client these are singletons; during SSR each request gets
 * its OWN instances (the root injector is per-request) — so a stateful root service can never
 * leak between concurrent requests. Call at module load (e.g. in entry-client / entry-server).
 */
export function provideRoot(providers: ReadonlyArray<Provider>): void {
  _rootProviders.push(...providers);
  _clientRoot?.register(providers); // apply to an already-created client root
  const ctx = getRequestContext() as object | undefined;
  if (ctx) _reqInjectors.get(ctx)?.register(providers); // and the active request root
}

/** Run `fn` with an explicit injector as the injection context (e.g. inside a server function). */
export function runInInjectionContext<R>(injector: Injector, fn: () => R): R {
  const prev = _explicit;
  _explicit = injector;
  try {
    return fn();
  } finally {
    _explicit = prev;
  }
}

/** The injector for the current scope (advanced — for passing to runInInjectionContext later). */
export function getInjector(): Injector {
  return currentInjector();
}

/** A standalone injector (parent defaults to the root) — for tests / manual hierarchies. */
export function createInjector(providers: ReadonlyArray<Provider>, parent?: Injector | null): Injector {
  return new Injector(parent === undefined ? rootInjector() : parent).register(providers);
}
