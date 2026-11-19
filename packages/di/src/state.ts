/**
 * @module
 *
 * The state every copy of this package shares. It lives in the global registry: a server bundle
 * inlines its own copy of the package while packages from node_modules use another, and both
 * must see the same injectors and providers.
 */
import type { Injector } from './injector.js';
import type { Provider } from './provider.js';

export interface DiState {
  platformProviders: Provider[];
  rootProviders: Provider[];
  platform: Injector | null;
  clientRoot: Injector | null;
  requestRoots: WeakMap<object, Injector>;
  ownerInjectors: WeakMap<object, Injector>;
  moduleScopes: WeakMap<object, object>;
  overrides: Map<symbol, Provider>;
  /** The injector `inject()` resolves from when one is set explicitly or is building a service. */
  explicit: Injector | null;
  /** The tokens being resolved, outermost first, for error messages. */
  path: string[];
}

export function freshState(): DiState {
  return {
    platformProviders: [],
    rootProviders: [],
    platform: null,
    clientRoot: null,
    requestRoots: new WeakMap(),
    ownerInjectors: new WeakMap(),
    moduleScopes: new WeakMap(),
    overrides: new Map(),
    explicit: null,
    path: [],
  };
}

export const state: DiState = ((globalThis as Record<symbol, unknown>)[Symbol.for('fluixi.di')] ??= freshState()) as DiState;

/**
 * Record which app module declared `provider`, so the devtools graph groups the services it
 * builds under that module. Called by the framework when it collects an app's modules; app code
 * has no reason to call it.
 *
 * @param provider - A provider from the module's list.
 * @param scope - The module's devtools scope.
 */
export function setModuleScope(provider: Provider, scope: object): void {
  state.moduleScopes.set(provider as object, scope);
}
