/**
 * @fileoverview @fluixi/vite-plugin: the Vite integration for Fluixi.
 * @module @fluixi/vite-plugin
 *
 * Thin, well-typed wrapper around @fluixi/compiler's vite integration. It sets
 * the esbuild jsxImportSource and runs the Fluixi transform: JSX and `` html`` ``
 * templates both lower to the shared IR and compile straight into @fluixi/dom
 * runtime calls: no per-render jsx() dispatch.
 */
import type { Plugin } from 'vite';
import { createVitePlugin, type CompilerOptions } from '@fluixi/compiler/integrations';
import { withGraphChannel } from './graph-channel.js';

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
  // The compiler reads this object per transform, so turning source marks on once the
  // command is known reaches every file: they are worth their size in dev and nothing in a
  // build, which is why the answer waits for configResolved.
  const settings = options as FluixiViteOptions & {
    sourceLocations?: boolean;
    sourceLocationsExternal?: boolean;
    sourceRoot?: string;
  };
  let serving = false;
  const enabled = () => serving && settings.devtools !== false;

  const base = createVitePlugin<Plugin>(settings);
  const inherited = base.configResolved as ((config: unknown) => void | Promise<void>) | undefined;

  const start = () => {
    settings.sourceLocations = true;
    // Marking a dependency is for someone working on the framework, so it is asked for.
    settings.sourceLocationsExternal =
      typeof settings.devtools === 'object' && settings.devtools.external === true;
  };

  return withGraphChannel(
    {
      ...base,
      // Awaited: the compiler's own hook loads the transform it needs for component styles, and
      // Vite starts transforming as soon as every configResolved has settled.
      async configResolved(config: { root?: string; command?: string }) {
        await inherited?.(config);
        // `serve` covers vitest as well as the dev server, and a test run has no page to
        // watch: the marks would only change what the compiler emits under test. The
        // channel turns them on from configureServer, which only a real server calls.
        serving = config?.command === 'serve';
        settings.sourceRoot = config.root;
      },
    } as Plugin,
    enabled,
    start,
  );
}

export default fluixi;

// Backwards-compatible alias (matches the name fluixi has historically used).
export { createVitePlugin };
export type { CompilerOptions };
