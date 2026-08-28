/**
 * @fileoverview Vite/Rollup plugin for file-system routing
 * @module fluixi/plugins/fluixi-routes-plugin
 *
 * Scans a routes directory at build time and generates a virtual module
 * (virtual:fluixi-routes) containing the route tree. Replaces import.meta.glob.
 */

import * as fs from 'fs';
import * as path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { scanRoutes, type ScanOptions } from './route-scanner.js';
import { generateRouteModule } from './route-codegen.js';

export interface FluixiRoutesPluginOptions {
  /** Path to routes directory, relative to project root. Default: 'src/routes' */
  routesDir?: string;
  /** File extensions to scan. Default: ['.tsx', '.ts', '.jsx', '.js'] */
  extensions?: string[];
  /**
   * Inject browser polyfills for Node built-ins (Buffer/process/global/fs/path) via
   * vite-plugin-node-polyfills. Default `true` (back-compat). Set `false` for SSR
   * (the injected shims break server rendering); `@fluixi/start` passes `false`.
   */
  polyfills?: boolean;
}

const VIRTUAL_MODULE_ID = 'virtual:fluixi-routes';
const RESOLVED_VIRTUAL_ID = '\0' + VIRTUAL_MODULE_ID;

/**
 * The public specifier. A real module in this package, so its types come from here and an
 * app needs no generated `declare module` in its own `src/`. The plugin swaps in the
 * scanned tree; the shipped file is a typed empty array.
 *
 * `virtual:fluixi-routes` stays resolvable so existing apps keep working.
 */
const PUBLIC_MODULE_ID = 'fluixi/routes';

export function fluixiRoutesPlugin(
  options: FluixiRoutesPluginOptions = {}
): any[] {
  const routesDir = options.routesDir ?? 'src/routes';
  const extensions = options.extensions ?? ['.tsx', '.ts', '.jsx', '.js'];

  let projectRoot = '';
  /** The module body most recently served, so the watcher can tell a real change from a save. */
  let lastGenerated: string | null = null;

  function generateModule(root: string): string {
    const absRoutesDir = path.resolve(root, routesDir);
    const scanOpts: ScanOptions = { extensions };
    const routes = scanRoutes(absRoutesDir, scanOpts);
    // Import paths are relative to project root, prefixed with ./
    return generateRouteModule(routes, './' + routesDir);
  }

  // nodePolyfills injects `vite-plugin-node-polyfills/shims/*` (browser polyfills for
  // Buffer/process/global/fs/path) into transformed modules. It's needed by some apps
  // for the BROWSER, but it BREAKS SSR — Node already has those globals, and the
  // injected CJS shim can't be ESM-evaluated (and often can't be resolved at all:
  // "Cannot find module .../shims/buffer"). So it's opt-out: on by default for
  // back-compat, but SSR-first setups (e.g. @fluixi/start) pass `polyfills: false`.
  const usePolyfills = options.polyfills !== false;
  const polyfillsPlugin = usePolyfills
    ? Object.assign({}, nodePolyfills({ include: ['fs', 'path'] }), { apply: 'serve' as const })
    : null;

  const routesPlugin = {
    name: 'fluixi-routes',
    enforce: 'pre' as const,

    configResolved(config: any) {
      projectRoot = config.root || process.cwd();
    },

    resolveId(id: string) {
      if (id === VIRTUAL_MODULE_ID || id === PUBLIC_MODULE_ID) {
        return RESOLVED_VIRTUAL_ID;
      }
      return null;
    },

    load(id: string) {
      if (id !== RESOLVED_VIRTUAL_ID) return null;
      lastGenerated = generateModule(projectRoot || process.cwd());
      return lastGenerated;
    },

    // Vite dev server: watch routes directory for changes
    configureServer(server: any) {
      const root = projectRoot || process.cwd();
      const absRoutesDir = path.resolve(root, routesDir);

      // Watch the routes directory
      server.watcher.add(absRoutesDir);

      server.watcher.on('all', (event: string, filePath: string) => {
        if (!filePath.startsWith(absRoutesDir)) return;

        // `change` matters as much as add/unlink. The route tree is not only a list of
        // files: `routeData` is detected by reading each file at scan time, so EDITING a
        // route — adding a `routeData` export, or changing one — changes the generated
        // module even though no file appeared or vanished. Leaving `change` out meant
        // those edits needed a dev-server restart to take effect.
        if (!['add', 'unlink', 'addDir', 'unlinkDir', 'change'].includes(event)) return;

        // Check if the file has a valid extension
        if (
          event !== 'addDir' &&
          event !== 'unlinkDir' &&
          !extensions.some((ext) => filePath.endsWith(ext))
        ) {
          return;
        }

        // Regenerate and compare before invalidating. Every save of a route component now
        // reaches this handler, and most change nothing about the tree — reloading the
        // page on each of them would undo the point of HMR. A full reload is only correct
        // when the generated module actually differs.
        const next = generateModule(root);
        if (next === lastGenerated) return;
        lastGenerated = next;

        const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ID);
        if (mod) {
          server.moduleGraph.invalidateModule(mod);
          server.ws.send({ type: 'full-reload' });
        }
      });
    },
  };

  // Vite flattens plugin arrays automatically — consumers just use:
  //   plugins: [fluixiRoutesPlugin({ routesDir: 'src/routes' })]
  return polyfillsPlugin ? [polyfillsPlugin, routesPlugin] : [routesPlugin];
}
