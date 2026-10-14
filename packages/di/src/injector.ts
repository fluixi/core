/**
 * An injector: the providers it holds, how it resolves a token (up its parents, then the token's
 * own factory), how it builds a service, and how it releases what it built.
 *
 * @module
 */
import { openReactiveScope, withReactiveScope } from '@fluixi/reactive/signal';
import { InjectionError } from './errors.js';
import { platformInjector } from './hierarchy.js';
import type { InjectOptions, Provider } from './provider.js';
import { state } from './state.js';
import type { Scope, Token } from './token.js';
import { DestroyRef, INJECTOR } from './tokens.js';

/**
 * Where an injector sits in the hierarchy.
 *
 * - `'platform'`: one per process, the top of every chain.
 * - `'root'`: one per request on the server, one per app in the browser, below the platform.
 * - `'owner'`: created by `provide()` for a component, below its nearest ancestor's injector or
 *   the root; the boundary `{ host: true }` stops at.
 * - `'standalone'`: created by `createInjector()` or for a test.
 */
export type InjectorKind = 'platform' | 'root' | 'owner' | 'standalone';

interface SingleRecord {
  multi: false;
  provider: Provider;
  built: boolean;
  building: boolean;
  value: unknown;
}

interface MultiRecord {
  multi: true;
  providers: Provider[];
  built: boolean;
  building: boolean;
  value: unknown[];
}

type RecordOf = SingleRecord | MultiRecord;

/**
 * Holds providers and resolves tokens: from itself, then up its parents, then from the token's
 * own factory. Each value is built once per injector, on first request, and released when the
 * injector is disposed.
 *
 * Code rarely creates injectors: `provide()`, `provideRoot()` and `providePlatform()` place
 * providers in the hierarchy, and `inject()` resolves from the current context. An `Injector` is
 * handled directly to resolve outside a context (`get`), to scope work to it
 * (`runInInjectionContext`), or in tests.
 */
export class Injector {
  readonly #records = new Map<symbol, RecordOf>();
  #created: unknown[] = [];
  #hooks: Array<() => void> = [];
  #destroyed = false;

  /** The lifecycle of this injector, also answered by `inject(DestroyRef)` in its context. */
  readonly destroyRef: DestroyRef;

  /**
   * @param parent - Where a token this injector does not hold is looked for next; `null` for the
   *   top of a chain.
   * @param kind - Where the injector sits in the hierarchy; see {@link InjectorKind}.
   */
  constructor(
    readonly parent: Injector | null = null,
    readonly kind: InjectorKind = 'standalone',
  ) {
    const self = this;
    this.destroyRef = {
      onDestroy(fn) {
        self.#hooks.push(fn);
        return () => {
          const i = self.#hooks.indexOf(fn);
          if (i >= 0) self.#hooks.splice(i, 1);
        };
      },
      get destroyed() {
        return self.#destroyed;
      },
    };
  }

  /** Whether {@link Injector.dispose} has run. A disposed injector refuses every `get`. */
  get destroyed(): boolean {
    return this.#destroyed;
  }

  /**
   * Add providers to this injector. A provider for a token already held replaces it, except
   * `multi` providers, which extend the token's list. A provider whose token has a test override
   * is replaced by the override.
   *
   * @param providers - The providers to add, in order.
   * @returns This injector, for chaining.
   */
  register(providers: ReadonlyArray<Provider>): this {
    for (const given of providers) {
      const p = state.overrides.get(given.provide.id) ?? given;
      if (p.multi) {
        const rec = this.#records.get(p.provide.id);
        if (rec?.multi) {
          rec.providers.push(p);
          rec.built = false;
        } else this.#records.set(p.provide.id, { multi: true, providers: [p], built: false, building: false, value: [] });
      } else {
        this.#records.set(p.provide.id, { multi: false, provider: p, built: false, building: false, value: undefined });
      }
    }
    return this;
  }

  /**
   * Resolve `token`: from this injector, then up its parents, then from the token's own factory
   * (built in its scope). The value is built on first request and reused after. `INJECTOR` and
   * `DestroyRef` resolve to this injector and its lifecycle.
   *
   * @param token - What to resolve.
   * @param options - Where to look and what to do when nothing is found; see {@link InjectOptions}.
   * @returns The value, or `null` when `optional` is set and nothing provides the token.
   * @throws {@link InjectionError} When nothing provides the token, on a dependency cycle, or when
   *   this injector is disposed.
   */
  get<T>(token: Token<T>, options: InjectOptions & { optional: true }): T | null;
  get<T>(token: Token<T>, options?: InjectOptions): T;
  get<T>(token: Token<T>, options: InjectOptions = {}): T | null {
    if (this.#destroyed) throw new InjectionError(`[fluixi/di] "${token.name}" requested from a disposed injector.`, [...state.path, token.name]);
    if (token.id === INJECTOR.id) return this as unknown as T;
    if (token.id === DestroyRef.id) return this.destroyRef as unknown as T;

    let inj: Injector | null = options.skipSelf ? this.parent : this;
    while (inj) {
      const rec = inj.#records.get(token.id);
      if (rec) return inj.#build(token, rec) as T;
      if (options.self || (options.host && inj.kind === 'owner')) break;
      inj = inj.parent;
    }

    const override = state.overrides.get(token.id);
    if (override && !options.self) return this.#home(token.scope).#fromProvider(token, override) as T;
    if (token.factory && !options.self && !options.host) {
      return this.#home(token.scope).#fromProvider(token, { provide: token, useFactory: token.factory }) as T;
    }
    if (options.optional) return null;
    const path = [...state.path, token.name];
    throw new InjectionError(
      `[fluixi/di] No provider for "${token.name}" (${path.join(' → ')}). Provide it in an app module, ` +
        `with provide() or provideRoot(), or give the token a { factory }.`,
      path,
    );
  }

  /** The injector a self-providing token builds in: the nearest root, or the platform. */
  #home(scope: Scope): Injector {
    let inj: Injector = this;
    if (scope === 'platform') {
      while (inj.parent) inj = inj.parent;
      return inj.kind === 'platform' ? inj : platformInjector();
    }
    let probe: Injector | null = this;
    while (probe) {
      if (probe.kind === 'root') return probe;
      probe = probe.parent;
    }
    while (inj.parent && inj.parent.kind !== 'platform') inj = inj.parent;
    return inj;
  }

  #fromProvider<T>(token: Token<T>, provider: Provider): T {
    let rec = this.#records.get(token.id);
    if (!rec) {
      rec = { multi: false, provider, built: false, building: false, value: undefined };
      this.#records.set(token.id, rec);
    }
    return this.#build(token, rec) as T;
  }

  #build<T>(token: Token<T>, rec: RecordOf): unknown {
    if (rec.built) return rec.value;
    if (rec.building) {
      const path = [...state.path, token.name];
      throw new InjectionError(`[fluixi/di] Circular dependency: ${path.join(' → ')}.`, path);
    }
    rec.building = true;
    state.path.push(token.name);
    const previous = state.explicit;
    // What the service injects resolves from where it is provided, as in Angular.
    state.explicit = this;
    try {
      if (rec.multi) {
        rec.value = rec.providers.map((p) => this.#make(token, p));
      } else {
        const module = state.moduleScopes.get(rec.provider as object);
        rec.value = module ? withReactiveScope(module, () => this.#make(token, rec.provider)) : this.#make(token, rec.provider);
      }
      rec.built = true;
      return rec.value;
    } finally {
      state.explicit = previous;
      state.path.pop();
      rec.building = false;
    }
  }

  #make<T>(token: Token<T>, p: Provider): unknown {
    if ('useValue' in p) return p.useValue;
    if ('useExisting' in p) return this.get(p.useExisting);
    const deps = (p.deps ?? []).map((d) => ('token' in d ? this.get(d.token, d) : this.get(d)));
    const scope = openReactiveScope({ kind: 'service', name: token.name, detail: 'useClass' in p ? 'useClass' : 'useFactory' });
    const value = withReactiveScope(scope, () => ('useClass' in p ? new p.useClass(...deps) : p.useFactory(...deps)));
    this.#created.push(value);
    return value;
  }

  /**
   * Release this injector: run the hooks registered on its `DestroyRef`, latest first, then the
   * `onDestroy()` method of every service it built, latest built first, then forget its
   * providers. A hook or `onDestroy()` that throws is logged and the rest still run. Running it
   * again does nothing.
   *
   * Component injectors are disposed when the component unmounts, request roots when the request
   * ends; call it yourself only for injectors you created.
   */
  dispose(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    const fail = (error: unknown) => console.error('[fluixi/di] a destroy hook threw:', error);
    for (const hook of this.#hooks.splice(0).reverse()) {
      try {
        hook();
      } catch (error) {
        fail(error);
      }
    }
    for (const value of this.#created.splice(0).reverse()) {
      const service = value as { onDestroy?: () => void } | null;
      if (service && typeof service.onDestroy === 'function') {
        try {
          service.onDestroy();
        } catch (error) {
          fail(error);
        }
      }
    }
    this.#records.clear();
  }
}
