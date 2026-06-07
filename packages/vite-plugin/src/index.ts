/**
 * @fileoverview @fluixi/vite-plugin — the Vite integration for KettleJS.
 * @module @fluixi/vite-plugin
 *
 * Thin, well-typed wrapper around @fluixi/compiler's vite integration. It sets
 * the esbuild jsxImportSource and runs the KettleJS JSX transform, with a choice
 * of codegen backend:
 *   - 'jsx' (default): emit the automatic runtime jsx()/jsxs()
 *   - 'imperative': compile straight into @fluixi/dom runtime calls
 */
import type { Plugin } from 'vite';
import { createVitePlugin, type CompilerOptions } from '@fluixi/compiler/integrations';

export type FluixiViteOptions = CompilerOptions;

/**
 * KettleJS Vite plugin.
 *
 * @example
 * ```ts
 * import { defineConfig } from 'vite';
 * import { fluixi } from '@fluixi/vite-plugin';
 *
 * export default defineConfig({
 *   plugins: [fluixi({ backend: 'imperative' })],
 * });
 * ```
 */
export function fluixi(options: FluixiViteOptions = {}): Plugin {
  return createVitePlugin<Plugin>(options);
}

export default fluixi;

// Backwards-compatible alias (matches the name kettlejs has historically used).
export { createVitePlugin };
export type { CompilerOptions };
