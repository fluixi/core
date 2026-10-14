/**
 * @fluixi/di: dependency injection for Fluixi.
 *
 * Typed tokens, providers (value, class, factory, alias, multi), and a hierarchy of injectors:
 * the platform (one per process), the root (one per request on the server, one per app in the
 * browser) and component injectors on the reactive owner tree. `inject(token, options)` resolves
 * from the current injection context. Tests use `@fluixi/di/testing`.
 */
export { injectionToken, type Scope, type Token } from './token.js';
export type { Dependency, InjectOptions, Provider } from './provider.js';
export { InjectionError } from './errors.js';
export { DestroyRef, INJECTOR } from './tokens.js';
export { Injector, type InjectorKind } from './injector.js';
export {
  inject,
  provide,
  provideRoot,
  providePlatform,
  runInInjectionContext,
  isInInjectionContext,
  assertInInjectionContext,
  getInjector,
  createInjector,
} from './inject.js';
export { APP_INITIALIZER, provideAppInitializer, runAppInitializers } from './initializers.js';
export { setModuleScope } from './state.js';
