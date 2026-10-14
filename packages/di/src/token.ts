/**
 * Typed tokens: what a service is asked for by, and how a token can provide itself.
 *
 * @module
 */

/**
 * Where a self-providing token builds its value.
 *
 * - `'root'`: once per root injector, so once per request on the server and once per app in
 *   the browser. The default, and the right one for anything holding per-user or per-request
 *   state.
 * - `'platform'`: once per process, shared by every request. For what is expensive to create
 *   and safe to share: a connection pool, parsed settings, a compiled schema.
 */
export type Scope = 'root' | 'platform';

/**
 * A typed key for a value an injector provides. Two tokens never match each other, even with the
 * same name: identity comes from {@link Token.id}.
 *
 * Create tokens with {@link injectionToken}; do not build the object by hand.
 *
 * @typeParam T - The type of the value the token resolves to.
 */
export interface Token<T> {
  /** The token's identity. Unique per call to {@link injectionToken}. */
  readonly id: symbol;
  /** A readable name, used in error messages and the devtools graph. Not used for lookup. */
  readonly name: string;
  /**
   * Builds the value when no injector on the resolution path provides the token. The token then
   * provides itself, once, in {@link Token.scope}: an unused service costs nothing, as with
   * Angular's `providedIn: 'root'`.
   */
  readonly factory?: () => T;
  /** Where {@link Token.factory} builds the value. `'root'` unless the token says otherwise. */
  readonly scope: Scope;
}

/**
 * Create a typed injection token.
 *
 * Without options, the token must be provided by an injector (`provide`, `provideRoot`,
 * `providePlatform`, an app module). With a `factory`, it provides itself where it is first
 * needed, in the given `scope`; a provider on the resolution path still takes precedence.
 *
 * The factory runs in an injection context, so it may call `inject()` for its own dependencies.
 *
 * @param name - A readable name for error messages and the devtools graph.
 * @param options - `factory` to make the token self-providing, and the `scope` it builds in.
 * @returns A new token, distinct from every other token.
 *
 * @example
 * ```ts
 * // Must be provided:
 * const ApiUrl = injectionToken<string>('ApiUrl');
 *
 * // Provides itself, once per request on the server, once per app in the browser:
 * const Users = injectionToken('Users', { factory: () => new UserService(inject(Http)) });
 *
 * // Provides itself once per process:
 * const Pool = injectionToken('Pool', { factory: () => createPool(), scope: 'platform' });
 * ```
 */
export function injectionToken<T>(name: string, options?: { factory?: () => T; scope?: Scope }): Token<T> {
  return { id: Symbol(name), name, factory: options?.factory, scope: options?.scope ?? 'root' };
}
