import type { Plugin } from 'vite';
import { createVitePlugin, hotRewrite, type CompilerOptions } from '@fluixi/compiler/integrations';
import { withGraphChannel } from './graph-channel.js';

export type FluixiViteOptions = CompilerOptions & {
  /**
   * Swap an edited component in place in dev, keeping the rest of the page's state, instead of
   * reloading the page. Default true. `// @refresh reload` in a file opts that file out.
   */
  hot?: boolean;
};

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
  const compile = base.transform as (this: unknown, code: string, id: string, opts?: { ssr?: boolean }) => Promise<unknown>;

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
      // After the compiler, on the app's own files, in dev: the server render goes through it too,
      // so both sides have the same structure to hydrate.
      async transform(this: unknown, code: string, id: string, opts?: { ssr?: boolean }) {
        const result = (await compile.call(this, code, id, opts)) as { code: string; map?: unknown } | string | null | undefined;
        // The app's own files only: a package linked from outside the root (a workspace copy of
        // the framework or a component library) is left as it is.
        const own = settings.sourceRoot !== undefined && id.startsWith(settings.sourceRoot.replace(/\/$/, '') + '/');
        if (!serving || options.hot === false || !own || !/\.[cm]?[jt]sx?$/.test(id) || id.includes('/node_modules/') || id.startsWith('\0') || id.includes('?')) {
          return result;
        }
        // A module with nothing to compile (no JSX, no html``) comes back null: a custom element
        // in plain TypeScript still needs its swap.
        const compiled = !result ? { code, map: null } : typeof result === 'string' ? { code: result, map: null } : result;
        const hot = hotRewrite(compiled.code, id);
        return hot ? { ...compiled, code: hot } : result ?? null;
      },
    } as Plugin,
    enabled,
    start,
  );
}

export default fluixi;

export { share, type ShareOptions, type ShareManifest } from './share.js';

// Backwards-compatible alias (matches the name fluixi has historically used).
export { createVitePlugin };
export type { CompilerOptions };
