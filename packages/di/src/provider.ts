/**
 * How a token gets its value in an injector, and the options a resolution takes.
 *
 * @module
 */
import type { Token } from './token.js';

/**
 * Options for one resolution, given to `inject()`, `Injector.get()` or a provider's `deps`.
 * They combine: `{ optional: true, skipSelf: true }` looks from the parent up and answers `null`
 * when nothing is found.
 */
export interface InjectOptions {
  /**
   * Answer `null` instead of throwing an `InjectionError` when nothing provides the token. A
   * self-providing token is still built.
   */
  optional?: boolean;
  /**
   * Look only in the injector asked. Neither its parents nor the token's own factory are
   * consulted.
   */
  self?: boolean;
  /**
   * Start with the parent of the injector asked: a component asking for what its ancestors
   * provide, while providing the same token to its own descendants.
   */
  skipSelf?: boolean;
  /**
   * Stop at the nearest component injector, the one `provide()` created, after looking in it.
   * Keeps a component from reaching past its own host for a dependency. The token's own factory
   * is not consulted.
   */
  host?: boolean;
}

/**
 * A dependency of a class or factory provider, resolved in order and passed as arguments: a token,
 * or a token with {@link InjectOptions}.
 *
 * @example
 * ```ts
 * { provide: Cache, useFactory: (store, log) => new Cache(store, log),
 *   deps: [Store, { token: Logger, optional: true }] }
 * ```
 */
export type Dependency = Token<unknown> | ({ token: Token<unknown> } & InjectOptions);

/** What every provider has: the token it provides, and whether it contributes to a list. */
interface ProviderBase<T> {
  /** The token this provider answers. */
  provide: Token<T>;
  /**
   * Contribute one value to a list instead of replacing the token's value. Every `multi`
   * provider of the token in one injector forms the list, in registration order, and
   * `inject(token)` returns that array. A child injector with its own `multi` providers for the
   * token has its own list; it does not extend its parent's.
   */
  multi?: boolean;
}

/**
 * How an injector produces the value of a token. Exactly one of the four forms:
 *
 * - `useValue`: this value, as given.
 * - `useClass`: a new instance of the class, its constructor called with `deps`.
 * - `useFactory`: the function's result, called with `deps`.
 * - `useExisting`: an alias; whatever another token resolves to.
 *
 * Classes and factories run in the injection context of the injector that holds the provider:
 * `inject()` inside a constructor or factory resolves from there, not from wherever the service
 * was first asked for. What they build is released with that injector (see `DestroyRef`).
 *
 * @typeParam T - The type of the value provided.
 *
 * @example
 * ```ts
 * provideRoot([
 *   { provide: ApiUrl, useValue: 'https://api.example.com' },
 *   { provide: Http, useClass: FetchHttp, deps: [ApiUrl] },
 *   { provide: Users, useFactory: () => new UserService(inject(Http)) },
 *   { provide: AnyHttp, useExisting: Http },
 *   { provide: Interceptors, useValue: authInterceptor, multi: true },
 * ]);
 * ```
 */
export type Provider<T = any> = ProviderBase<T> &
  (
    | { useValue: T }
    | { useClass: new (...args: any[]) => T; deps?: ReadonlyArray<Dependency> }
    | { useFactory: (...args: any[]) => T; deps?: ReadonlyArray<Dependency> }
    | { useExisting: Token<T> }
  );
