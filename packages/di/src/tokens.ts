/**
 * The tokens every injector answers itself, without a provider.
 *
 * @module
 */
import type { Injector } from './injector.js';
import { injectionToken, type Token } from './token.js';

/**
 * The lifecycle of an injector, for releasing what a service holds when the injector goes
 * away: a component unmounting, a request ending, a test resetting.
 *
 * Obtained with `inject(DestroyRef)`, which answers the injector of the current context. Inside a
 * provider, that is the injector holding the provider, so the hooks run when the service itself
 * is released.
 */
export interface DestroyRef {
  /**
   * Run `fn` when the injector is disposed. Hooks run latest first, before the services'
   * `onDestroy()` methods. A hook that throws is logged; the others still run.
   *
   * @param fn - What to run. Called once, with no arguments.
   * @returns A function that unregisters `fn`, for a resource released earlier.
   */
  onDestroy(fn: () => void): () => void;
  /** Whether the injector has been disposed. */
  readonly destroyed: boolean;
}

/**
 * Resolves to the {@link DestroyRef} of the current injection context's injector.
 *
 * @example
 * ```ts
 * class Poller {
 *   #timer = setInterval(() => this.poll(), 5_000);
 *   constructor() {
 *     inject(DestroyRef).onDestroy(() => clearInterval(this.#timer));
 *   }
 * }
 * ```
 */
export const DestroyRef: Token<DestroyRef> = injectionToken<DestroyRef>('DestroyRef');

/**
 * Resolves to the injector of the current injection context: to keep it and resolve later, or to
 * hand to `runInInjectionContext` from a callback that runs outside any context.
 *
 * @example
 * ```ts
 * const injector = inject(INJECTOR);
 * socket.on('message', () => runInInjectionContext(injector, () => inject(Inbox).add()));
 * ```
 */
export const INJECTOR: Token<Injector> = injectionToken<Injector>('Injector');
