/**
 * Modules an app shares with code it loads at run time: plugins installed into a deployment,
 * not built with the app. Such code imports `@fluixi/core` by name and must get the app's
 * copy, or it drives a second reactive runtime, a second DI container and a second element
 * registry.
 *
 * In a browser build each shared module becomes its own chunk, keeping every export, and an
 * import map names it: written as `share.json` next to the assets, and placed first in the
 * `<head>` of an `index.html` the build processes. A server build is left alone; there the
 * modules must stay external so loaded code resolves them from `node_modules` (`@fluixi/start`
 * does that from its own `share` option).
 *
 * On a dev server each shared module is pre-bundled, and the import map names the URL the dev
 * server gives the app's own import of it, version query included: loaded code then gets the very
 * module instance the app runs.
 *
 * @module
 */
import { isAbsolute, relative } from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';

/** Options of {@link share}. */
export interface ShareOptions {
  /**
   * Module ids to share, each as code will import it: `@fluixi/core`, `@fluixi/core/router`.
   * A subpath is a module of its own and is listed on its own.
   */
  modules: readonly string[];
  /** File name of the import map written next to the assets. Default `share.json`. */
  manifest?: string;
}

/** What `share.json` holds: an import map. */
export interface ShareManifest {
  imports: Record<string, string>;
}

const PREFIX = 'share/';

/** `@buntubi/sdk/plugins` becomes `buntubi-sdk-plugins`: a chunk name, unique per id. */
const chunkName = (id: string) => PREFIX + id.replace(/^@/, '').replace(/[^a-zA-Z0-9]+/g, '-');

/**
 * Share `modules` with code loaded at run time, through an import map.
 *
 * Shared modules are kept whole: their unused exports are not shaken out, since the app cannot
 * know which ones a plugin will use.
 *
 * @example
 * ```ts
 * import { fluixi, share } from '@fluixi/vite-plugin';
 *
 * export default defineConfig({
 *   plugins: [fluixi(), share({ modules: ['@fluixi/core', '@fluixi/reactive/signal'] })],
 * });
 * ```
 */
export function share(options: ShareOptions): Plugin {
  const modules = [...new Set(options.modules)];
  const names = new Map(modules.map((id) => [chunkName(id), id]));
  if (names.size !== modules.length) {
    throw new Error('[fluixi] share: two modules map to the same chunk name; list each id once.');
  }
  let base = '/';
  let browser = true;
  let serving = false;
  let root = process.cwd();
  let server: ViteDevServer | undefined;

  /** The URL the dev server serves `id` at to the page: the one its own imports are rewritten to. */
  const devUrl = async (id: string): Promise<string> => {
    const client = server!.environments.client;
    // The pre-bundling scan decides which URL an import gets; resolving before it ends could
    // name the unbundled file while the app imports the bundle.
    await (client.depsOptimizer as { scanProcessing?: Promise<void> } | undefined)?.scanProcessing;
    const resolved = await client.pluginContainer.resolveId(id, `${root}/index.html`);
    if (!resolved) throw new Error(`[fluixi] share: the dev server cannot resolve ${id}.`);
    const file = resolved.id;
    const inside = !relative(root, file).startsWith('..') && !isAbsolute(relative(root, file));
    return base + (inside ? relative(root, file) : `@fs${file}`);
  };

  /** The import map, read from the chunks this build wrote. */
  const importMap = (bundle: Record<string, { type: string; name?: string; fileName: string; isEntry?: boolean }>) => {
    const imports: Record<string, string> = {};
    for (const file of Object.values(bundle)) {
      if (file.type !== 'chunk' || !file.name) continue;
      const id = names.get(file.name);
      if (id) imports[id] = base + file.fileName;
    }
    const missing = modules.filter((id) => !imports[id]);
    if (missing.length) throw new Error(`[fluixi] share: no chunk was written for ${missing.join(', ')}.`);
    return { imports } satisfies ShareManifest;
  };

  return {
    name: 'fluixi:share',
    config(_, env) {
      // Pre-bundled on a dev server: one URL per module, the same for the app and the map.
      return env.command === 'serve' ? { optimizeDeps: { include: [...modules] } } : undefined;
    },
    configResolved(config) {
      serving = config.command === 'serve';
      root = config.root;
      browser = !config.build.ssr;
      // A relative base cannot address a chunk from an import map, which resolves against the
      // page: the deployment's absolute base is what it needs.
      base = config.base.startsWith('/') ? config.base : '/';
    },
    configureServer(devServer) {
      server = devServer;
    },
    buildStart() {
      if (serving || !browser) return;
      for (const id of modules) {
        this.emitFile({ type: 'chunk', id, name: chunkName(id), preserveSignature: 'strict' });
      }
    },
    generateBundle(_, bundle) {
      if (serving || !browser) return;
      this.emitFile({
        type: 'asset',
        fileName: options.manifest ?? 'share.json',
        source: `${JSON.stringify(importMap(bundle as never), null, 2)}\n`,
      });
    },
    transformIndexHtml: {
      order: 'post',
      async handler(_html, ctx) {
        if (serving && server) {
          const imports: Record<string, string> = {};
          for (const id of modules) imports[id] = await devUrl(id);
          return [{ tag: 'script', attrs: { type: 'importmap' }, children: JSON.stringify({ imports }), injectTo: 'head-prepend' }];
        }
        if (!browser || !ctx.bundle) return;
        // First in <head>: a module script or preload before it would resolve without the map.
        return [{ tag: 'script', attrs: { type: 'importmap' }, children: JSON.stringify(importMap(ctx.bundle as never)), injectTo: 'head-prepend' }];
      },
    },
  };
}
