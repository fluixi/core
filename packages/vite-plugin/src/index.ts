/**
 * @fileoverview @fluixi/vite-plugin — the Vite integration for Fluixi.
 * @module @fluixi/vite-plugin
 *
 * Thin, well-typed wrapper around @fluixi/compiler's vite integration. It sets
 * the esbuild jsxImportSource and runs the Fluixi transform: JSX and `` html`` ``
 * templates both lower to the shared IR and compile straight into @fluixi/dom
 * runtime calls — no per-render jsx() dispatch.
 */
import type { Plugin } from 'vite';
import { createVitePlugin, type CompilerOptions } from '@fluixi/compiler/integrations';

export type FluixiViteOptions = CompilerOptions;

/**
 * Fluixi Vite plugin.
 *
 * @example
 * ```ts
 * import { defineConfig } from 'vite';
 * import { fluixi } from '@fluixi/vite-plugin';
 *
 * export default defineConfig({
 *   plugins: [fluixi()],
 * });
 * ```
 */
export function fluixi(options: FluixiViteOptions = {}): Plugin {
  return createVitePlugin<Plugin>(options);
}

export default fluixi;

// Backwards-compatible alias (matches the name fluixi has historically used).
export { createVitePlugin };
export type { CompilerOptions };
