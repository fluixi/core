/**
 * The error a resolution throws.
 *
 * @module
 */

/**
 * Thrown when a token cannot be resolved: nothing provides it (and it has no factory), its
 * providers depend on each other in a cycle, or it is asked of a disposed injector.
 *
 * The message names the whole resolution path, outermost first, so the provider that is
 * missing can be told apart from the service that needed it: `Checkout → Payments → ApiKey`.
 *
 * @example
 * ```ts
 * try {
 *   inject(Checkout);
 * } catch (error) {
 *   if (error instanceof InjectionError) console.error(error.path); // ['Checkout', 'Payments', 'ApiKey']
 *   throw error;
 * }
 * ```
 */
export class InjectionError extends Error {
  /**
   * @param message - What went wrong, with the path rendered into it.
   * @param path - The tokens being resolved, outermost first; the last one is the one that failed.
   */
  constructor(
    message: string,
    readonly path: readonly string[],
  ) {
    super(message);
    this.name = 'InjectionError';
  }
}
