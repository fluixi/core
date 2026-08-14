import { existsSync } from 'node:fs';
import { mkdir, writeFile, rm, copyFile, readFile } from 'node:fs/promises';
import { resolve, dirname, join, basename } from 'node:path';
import type { FluixiConfig, ResolvedConfig } from '../config.js';
import { resolveConfig } from '../config.js';
import { fluixiPlugins, loadServerEnv } from '../internal.js';
import { ssrBuildOptions } from '../adapter.js';
import { prerender } from './prerender.js';
import type { ScannedRoute } from '@fluixi/core/plugins';
import { wordmark, step, done, c } from '../ui.js';

/**
 * Production build: a client bundle (browser, with an SSR manifest) and a server
 * bundle (the entry that renders HTML). @fluixi/start provides the fluixi plugins
 * (file routing + JSX/SSR transform), so the app's vite.config keeps only app bits.
 */
export async function build(config: FluixiConfig = {}): Promise<void> {
  const startedAt = Date.now();
  const cfg = resolveConfig(config);
  await loadServerEnv(cfg.root, 'production'); // .env → process.env (server-only secrets)
  const { build: viteBuild } = await import('vite');
  const plugins = await fluixiPlugins(cfg);
  // The deploy target decides whether the framework is bundled in or imported at runtime.
  const ssr = ssrBuildOptions(cfg);

  process.stdout.write(`\n  ${wordmark()}  ${c.gray('building for production')}\n\n`);

  step('client bundle');
  await viteBuild({
    root: cfg.root,
    plugins,
    logLevel: 'warn',
    build: { outDir: 'dist/client', ssrManifest: true, emptyOutDir: true },
  });

  // SSR builds a server bundle that renders HTML. A SPA may still ship one — only for server
  // functions / middleware — so build it when the entry exists; a pure static SPA skips it.
  const serverEntrySrc = resolve(cfg.root, cfg.serverEntry);
  if (cfg.ssr || existsSync(serverEntrySrc)) {
    step(`server bundle${bundleNote(cfg)}`);
    await viteBuild({
      root: cfg.root,
      plugins,
      ssr,
      build: {
        outDir: 'dist/server',
        ssr: serverEntrySrc,
        emptyOutDir: true,
      },
    });
  }

  // Optional request middleware → its own server entry (emptyOutDir:false keeps
  // entry-server.js). createProdHandler picks up dist/server/middleware.js if present.
  const middlewareSrc = resolve(cfg.root, cfg.middleware);
  if (existsSync(middlewareSrc)) {
    step('middleware');
    await viteBuild({
      root: cfg.root,
      plugins,
      logLevel: 'warn',
      ssr,
      build: {
        outDir: 'dist/server',
        ssr: middlewareSrc,
        emptyOutDir: false,
      },
    });
  }

  await collectRouteAssets(cfg);

  // SSG: prerender routes to static HTML in dist/client (config-driven).
  if (cfg.prerender) {
    // Prerendering `/` writes over the built `index.html`, and that file is also the
    // template the server renders into. Keep the shell before it goes: without this a
    // prerendered home page becomes the template, so every SSR response carries the
    // home page's markup and head around the app it just rendered.
    await copyFile(
      resolve(cfg.root, 'dist/client', 'index.html'),
      resolve(cfg.root, 'dist/server', 'template.html'),
    );
    process.stdout.write('\n');
    await prerender(config);
  }

  // The deploy target's own output layout — a worker entry, a function manifest, a
  // routing config. Last, so everything it wraps or copies already exists.
  if (cfg.adapter?.build) {
    step(`${cfg.adapter.name} output`);
    await cfg.adapter.build({
      cfg,
      root: cfg.root,
      clientDir: resolve(cfg.root, 'dist/client'),
      serverDir: resolve(cfg.root, 'dist/server'),
      hasServer: existsSync(resolve(cfg.root, 'dist/server', 'entry-server.js')),
      bundleEntry: (source, outFile) => bundleEntry(cfg, plugins, source, outFile),
    });
  }

  const ms = Date.now() - startedAt;
  process.stdout.write('\n');
  done(`${c.bold('built')} in ${c.bold(String(ms))} ms  ${c.gray('→ dist/client + dist/server')}\n`);
}

/**
 * Turn Vite's SSR manifest into the map the server actually needs, and stop shipping
 * the manifest itself.
 *
 * A lazily-imported route is its own chunk with its own CSS. Server-render that route
 * and the HTML references neither, so the browser only discovers them when hydration
 * runs the dynamic import — one waterfall, and the route's styles arrive after its
 * markup has already painted.
 *
 * The manifest is keyed by module id and the server only ever has a path, so the join
 * happens here: scan the routes the same way the plugin does, resolve each to its files,
 * and write a map the runtime can look a URL up in. Only routes are kept, and it goes to
 * `dist/server` because `dist/client` is what gets published — a full manifest on a CDN
 * is a map of every source path to its chunk, for a reader that does not exist there.
 */
async function collectRouteAssets(cfg: ResolvedConfig): Promise<void> {
  const clientDir = resolve(cfg.root, 'dist/client');
  const manifestFile = join(clientDir, '.vite', 'ssr-manifest.json');
  if (!existsSync(manifestFile)) return;

  const serverDir = resolve(cfg.root, 'dist/server');
  const routesDir = resolve(cfg.root, cfg.routesDir);
  if (existsSync(serverDir) && existsSync(routesDir)) {
    const manifest: Record<string, string[]> = JSON.parse(await readFile(manifestFile, 'utf-8'));
    const { scanRoutes } = await import('@fluixi/core/plugins');
    const base = cfg.routesDir.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '');

    // Keyed by URL pattern, not module id: the server has a path and no way to turn one
    // into a module without the app's own route table, which lives inside the bundle it
    // is serving. Resolving it here leaves the runtime a lookup and nothing else.
    const assets: Record<string, string[]> = {};
    const walk = (routes: ScannedRoute[], inherited: string[]): void => {
      for (const route of routes) {
        // A match renders every layer, so a route needs its layouts' chunks as much as
        // its own — folded in now rather than unioned per request.
        const files = [...new Set([...inherited, ...(manifest[`${base}/${route.filePath}`] ?? [])])];
        if (files.length) assets[route.urlPath] = [...new Set([...(assets[route.urlPath] ?? []), ...files])];
        walk(route.children, files);
      }
    };
    walk(scanRoutes(routesDir), []);
    await writeFile(join(serverDir, 'route-assets.json'), JSON.stringify(assets, null, 2) + '\n');
  }

  await rm(join(clientDir, '.vite'), { recursive: true, force: true });
}

/**
 * Bundle a generated platform entry into one self-contained file.
 *
 * The entry is written next to its output so a relative import of the server bundle
 * resolves, then removed — a stray `.fluixi-entry.js` in dist would be served as a
 * static asset on every one of these platforms.
 */
async function bundleEntry(
  cfg: ResolvedConfig,
  plugins: unknown[],
  source: string,
  outFile: string,
): Promise<void> {
  const { build: viteBuild } = await import('vite');
  const dir = dirname(outFile);
  const temp = join(dir, `.fluixi-entry-${Date.now()}.js`);
  await mkdir(dir, { recursive: true });
  await writeFile(temp, source);
  try {
    await viteBuild({
      root: cfg.root,
      plugins: plugins as never,
      logLevel: 'warn',
      // Nothing may be left to resolve: these run as an uploaded file, not an install.
      ssr: { noExternal: true },
      build: {
        outDir: dir,
        emptyOutDir: false,
        ssr: temp,
        rollupOptions: {
          output: {
            entryFileNames: basename(outFile),
            // One file, no chunks. A lazy route would otherwise be split out beside
            // the entry — and for Cloudflare that directory is the published one, so
            // every server chunk would be a public download.
            inlineDynamicImports: true,
          },
        },
      },
    });
  } finally {
    await rm(temp, { force: true });
  }
}

/** `server bundle (node · external)` — the output shape is not obvious from the file. */
function bundleNote(cfg: ResolvedConfig): string {
  const adapter = cfg.adapter;
  if (!adapter?.bundle) return '';
  return c.gray(` (${adapter.name} · ${adapter.bundle})`);
}
