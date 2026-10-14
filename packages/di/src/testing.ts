/**
 * `@fluixi/di/testing`: injectors for tests. A separate entry point, so no app ships it.
 *
 * @module
 */
import { Injector } from './injector.js';
import type { Provider } from './provider.js';
import { freshState, state } from './state.js';

/** What {@link createTestInjector} is built with. */
export interface TestInjectorOptions {
  /** The providers the test's root injector holds. */
  providers?: ReadonlyArray<Provider>;
  /**
   * Replacements for tokens, wherever they would be provided: in any injector, and in place of a
   * token's own factory. In effect until {@link resetInjection}.
   */
  overrides?: ReadonlyArray<Provider>;
}

/**
 * Create an injector for a test: a root of its own, holding only `providers` (none of the app's
 * root providers), under a fresh platform. Services that inject each other resolve as they
 * would in the app; the ones listed in `overrides` resolve to the replacements.
 *
 * Pair it with {@link resetInjection} after each test.
 *
 * @param options - The providers and overrides; see {@link TestInjectorOptions}.
 * @returns The test's root injector.
 *
 * @example
 * ```ts
 * afterEach(() => resetInjection());
 *
 * it('charges the cart total', async () => {
 *   const payments = { charge: vi.fn() };
 *   const injector = createTestInjector({
 *     providers: [{ provide: Checkout, useClass: CheckoutService }],
 *     overrides: [{ provide: Payments, useValue: payments }],
 *   });
 *   await injector.get(Checkout).pay();
 *   expect(payments.charge).toHaveBeenCalled();
 * });
 * ```
 */
export function createTestInjector(options: TestInjectorOptions = {}): Injector {
  for (const p of options.overrides ?? []) state.overrides.set(p.provide.id, p);
  const platform = new Injector(null, 'platform');
  return new Injector(platform, 'root').register(options.providers ?? []);
}

/**
 * Forget every provider, override and built service, disposing the platform and browser roots
 * first so their services release what they hold. Leaves the state as a fresh process would have
 * it: call it after each test.
 */
export function resetInjection(): void {
  state.platform?.dispose();
  state.clientRoot?.dispose();
  Object.assign(state, freshState());
}
