/**
 * @fileoverview Vite/Rollup plugin for file-system routing
 * @module @awc/kettlejs/plugins/kettle-routes-plugin
 *
 * Scans a routes directory at build time and generates a virtual module
 * (virtual:kettle-routes) containing the route tree. Replaces import.meta.glob.
 */

import * as path from 'path';
import { scanRoutes, type ScanOptions } from './route-scanner.js';
import { generateRouteModule } from './route-codegen.js';

export interface KettleRoutesPluginOptions {
  /** Path to routes directory, relative to project root. Default: 'src/routes' */
  routesDir?: string;
  /** File extensions to scan. Default: ['.tsx', '.ts', '.jsx', '.js'] */
  extensions?: string[];
}

const VIRTUAL_MODULE_ID = 'virtual:kettle-routes';
const RESOLVED_VIRTUAL_ID = '\0' + VIRTUAL_MODULE_ID;

/**
 * Vite/Rollup plugin that generates a route manifest from the file system.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { kettleRoutesPlugin } from '@awc/kettlejs/plugins';
 *
 * export default defineConfig({
 *   plugins: [
 *     kettleRoutesPlugin({ routesDir: 'src/routes' })
 *   ]
 * });
 * ```
 *
 * Then in your app:
 * ```ts
 * import { routes } from 'virtual:kettle-routes';
 * ```
 */
export function kettleRoutesPlugin(
  options: KettleRoutesPluginOptions = {}
): any {
  const routesDir = options.routesDir ?? 'src/routes';
  const extensions = options.extensions ?? ['.tsx', '.ts', '.jsx', '.js'];

  let projectRoot = '';

  return {
    name: 'kettle-routes',
    enforce: 'pre' as const,

    configResolved(config: any) {
      projectRoot = config.root || process.cwd();
    },

    resolveId(id: string) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_ID;
      }
      return null;
    },

    load(id: string) {
      if (id !== RESOLVED_VIRTUAL_ID) return null;

      const root = projectRoot || process.cwd();
      const absRoutesDir = path.resolve(root, routesDir);
      const scanOpts: ScanOptions = { extensions };

      const routes = scanRoutes(absRoutesDir, scanOpts);

      // Import paths are relative to project root, prefixed with ./
      const importBase = './' + routesDir;
      const code = generateRouteModule(routes, importBase);
      return code;
    },

    // Vite dev server: watch routes directory for changes
    configureServer(server: any) {
      const root = projectRoot || process.cwd();
      const absRoutesDir = path.resolve(root, routesDir);

      // Watch the routes directory
      server.watcher.add(absRoutesDir);

      server.watcher.on('all', (event: string, filePath: string) => {
        // Only react to file add/remove/rename in routes dir
        if (
          !filePath.startsWith(absRoutesDir) ||
          !['add', 'unlink', 'addDir', 'unlinkDir'].includes(event)
        ) {
          return;
        }

        // Check if the file has a valid extension
        if (
          event !== 'addDir' &&
          event !== 'unlinkDir' &&
          !extensions.some((ext) => filePath.endsWith(ext))
        ) {
          return;
        }

        // Invalidate the virtual module so it regenerates
        const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ID);
        if (mod) {
          server.moduleGraph.invalidateModule(mod);
          // Trigger HMR
          server.ws.send({ type: 'full-reload' });
        }
      });
    },
  };
}
