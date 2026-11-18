import { existsSync } from 'node:fs';
import { aliasesFromTsconfig } from '../tsconfig-paths.js';
import { mkdir, writeFile, rm, copyFile, readFile } from 'node:fs/promises';
import { resolve, dirname, join, basename } from 'node:path';
import type { FluixiConfig, ResolvedConfig } from '../config.js';
import { clientEntryFile, resolveConfig } from '../config.js';
import { fluixiPlugins, loadServerEnv, singleFileOutput } from '../internal.js';
import { DOCUMENT_ASSETS_FILE, ssrBuildOptions } from '../adapter.js';
import { buildWebComponents } from './web-component.js';
import { prerender } from './prerender.js';
import type { ScannedRoute } from '../route-scanner.js';
import { wordmark, step, done, c } from '../ui.js';
import { withImports, type ManifestChunk } from './route-imports.js';

/**
 * Production build: a client bundle (browser, with an SSR manifest) and a server
 * bundle (the entry that renders HTML). @fluixi/start provides the fluixi plugins
 * (file routing + JSX/SSR transform), so the app's vite.config keeps only app bits.
 */
export async function build(
  config: FluixiConfig = {},
  options: { format?: 'app' | 'web-component' | 'fluixi' } = {},
): Promise<void> {
  const startedAt = Date.now();
  const cfg = resolveConfig(config);
  checkServerModule(cfg);

  // `--format=web-component` builds the elements and stops. A package that publishes
  // elements has no app to build, and running the client and server passes for it would
  // emit two bundles nobody loads.
  const elementsOnly = options.format === 'web-component' || options.format === 'fluixi';
  if (elementsOnly) {
    if (!cfg.webComponents) {
      throw new Error(
        `[fluixi] build --format=${options.format} needs a \`webComponents\` block in ` +
          'fluixi.config.ts naming the entries to build.',
      );
    }
    process.stdout.write(`\n  ${wordmark()}  ${c.gray('building custom elements')}\n\n`);
    step(options.format === 'fluixi' ? 'elements (shared runtime)' : 'elements (standalone)');
    const written = await buildWebComponents(
      { ...cfg.webComponents, mode: options.format === 'fluixi' ? 'shared' : 'standalone' },
      config,
    );
    for (const file of written) process.stdout.write(`  ${c.gray('›')} ${file}\n`);
    process.stdout.write('\n');
    return;
  }
  await loadServerEnv(cfg.root, 'production'); // .env → process.env (server-only secrets)

  // Before anything is written. A client-prefixed secret is published by the bundle
  // itself, so a warning after the fact is read too late.
  const { assertNoExposedSecrets } = await import('../env-guard.js');
  assertNoExposedSecrets(cfg.root);
  const { build: viteBuild } = await import('vite');
  // The deploy target decides whether the framework is bundled in or imported at runtime.
  const ssr = ssrBuildOptions(cfg);

  process.stdout.write(`\n  ${wordmark()}  ${c.gray('building for production')}\n\n`);

  if (cfg.apiOnly) {
    await buildApi(cfg, ssr);
    await writePublicEnv(cfg);
    const ms = Date.now() - startedAt;
    process.stdout.write('\n');
    done(`${c.bold('built')} in ${c.bold(String(ms))} ms  ${c.gray('→ dist/server')}\n`);
    return;
  }
  const plugins = await fluixiPlugins(cfg);

  step('client bundle');
  await viteBuild({
    root: cfg.root,
    resolve: { alias: aliasesFromTsconfig(cfg.root) },
    plugins,
    logLevel: 'warn',
    build: {
      outDir: 'dist/client',
      ssrManifest: true,
      manifest: true,
      emptyOutDir: true,
      // A document component is the page: the bundle starts from the client entry, not index.html.
      ...(cfg.document ? { rollupOptions: { input: resolve(cfg.root, clientEntryFile(cfg)) } } : {}),
    },
  });

  // SSR builds a server bundle that renders HTML. A SPA may still ship one, only for server
  // functions / middleware: so build it when the entry exists; a pure static SPA skips it.
  const serverEntrySrc = resolve(cfg.root, cfg.serverEntry);
  if (cfg.ssr || existsSync(serverEntrySrc)) {
    // Before the bundle, so the message names the file to edit rather than arriving as a
    // 200 on a route that was supposed to refuse the request.
    const { assertApiRoutesReachable } = await import('../api.js');
    assertApiRoutesReachable({
      root: cfg.root,
      apiDir: cfg.apiDir,
      serverEntry: cfg.serverEntry,
    });
    step(`server bundle${bundleNote(cfg)}`);
    await viteBuild({
      root: cfg.root,
    resolve: { alias: aliasesFromTsconfig(cfg.root) },
      plugins,
      ssr,
      build: {
        outDir: 'dist/server',
        emptyOutDir: true,
        ...serverInputs(serverEntrySrc, middlewareOf(cfg)),
      },
    });
    await writePublicEnv(cfg);
  }

  // Request middleware with no server bundle to join: its own build. With one, it is an input
  // of that build (see serverInputs). createProdHandler picks up dist/server/middleware.js.
  const middlewareSrc = resolve(cfg.root, cfg.middleware);
  if (existsSync(middlewareSrc) && !(cfg.ssr || existsSync(serverEntrySrc))) {
    step('middleware');
    await viteBuild({
      root: cfg.root,
    resolve: { alias: aliasesFromTsconfig(cfg.root) },
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

  await buildJobs(cfg, ssr, plugins);
  await buildServerHooks(cfg, ssr, plugins);

  // An app that also publishes elements gets them beside its own bundles.
  if (cfg.webComponents) {
    step('custom elements');
    await buildWebComponents(cfg.webComponents, config);
  }

  await collectRouteAssets(cfg);

  // SSG: prerender routes to static HTML in dist/client (config-driven).
  if (cfg.prerender) {
    // Prerendering `/` writes over the built `index.html`, and that file is also the
    // template the server renders into. Keep the shell before it goes: without this a
    // prerendered home page becomes the template, so every SSR response carries the
    // home page's markup and head around the app it just rendered. A document component
    // has no such file: it renders the shell per request.
    if (!cfg.document) {
      await copyFile(
        resolve(cfg.root, 'dist/client', 'index.html'),
        resolve(cfg.root, 'dist/server', 'template.html'),
      );
    }
    process.stdout.write('\n');
    await prerender(config);
  }

  // The deploy target's own output layout: a worker entry, a function manifest, a
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
 * Turn Vite's SSR manifest into the map the server needs, and stop publishing the
 * manifest itself.
 *
 * The manifest is keyed by module id and the server only has a path, so the join
 * happens here: scan the routes the way the plugin does, resolve each to its files,
 * write a map the runtime can look a URL up in.
 *
 * Only routes are kept, and it goes to `dist/server`: `dist/client` is published, and
 * a full manifest there maps every source path to its chunk for no reader.
 */
async function collectRouteAssets(cfg: ResolvedConfig): Promise<void> {
  const clientDir = resolve(cfg.root, 'dist/client');
  const manifestFile = join(clientDir, '.vite', 'ssr-manifest.json');
  if (!existsSync(manifestFile)) return;

  const serverDir = resolve(cfg.root, 'dist/server');
  if (cfg.document && existsSync(serverDir)) await writeDocumentAssets(cfg, clientDir, serverDir);
  const routesDir = resolve(cfg.root, cfg.routesDir);
  if (existsSync(serverDir) && existsSync(routesDir)) {
    const manifest: Record<string, string[]> = JSON.parse(await readFile(manifestFile, 'utf-8'));
    // The build manifest, for what each route's chunk imports (see route-imports.ts).
    const chunksFile = join(clientDir, '.vite', 'manifest.json');
    const chunks: Record<string, ManifestChunk> = existsSync(chunksFile) ? JSON.parse(await readFile(chunksFile, 'utf-8')) : {};
    const { scanRoutes } = await import('../route-scanner.js');
    const base = cfg.routesDir.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '');

    // Keyed by URL pattern: the runtime has a path, and resolving it here leaves it a
    // lookup and nothing else.
    const assets: Record<string, string[]> = {};
    const walk = (routes: ScannedRoute[], inherited: string[]): void => {
      for (const route of routes) {
        // A match renders every layer, so layouts fold in here rather than being
        // unioned per request.
        const files = [...new Set([...inherited, ...withImports(manifest[`${base}/${route.filePath}`] ?? [], chunks)])];
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
 * resolves, then removed: a stray `.fluixi-entry.js` in dist would be served as a
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
    resolve: { alias: aliasesFromTsconfig(cfg.root) },
      plugins: plugins as never,
      logLevel: 'warn',
      // Nothing may be left to resolve: these run as an uploaded file, not an install.
      ssr: { noExternal: true },
      build: {
        outDir: dir,
        emptyOutDir: false,
        // Vite copies `public/` into every output folder by default, which put the whole of it
        // inside each function. The platform serves those files itself, and the function
        // reads none of them.
        copyPublicDir: false,
        ssr: temp,
        rollupOptions: {
          output: {
            entryFileNames: basename(outFile),
            // One file, no chunks. A lazy route would otherwise be split out beside
            // the entry: and for Cloudflare that directory is the published one, so
            // every server chunk would be a public download.
            ...(await singleFileOutput()),
          },
        },
      },
    });
  } finally {
    await rm(temp, { force: true });
  }
}

/**
 * An API-only app: no client bundle, and a server entry the build writes itself.
 *
 * The entry only re-exports the API routes; the app config's providers and middleware are
 * injected into it the way they are into any server entry, because `serverEntry` names it.
 * It lives in `.fluixi/`, next to nothing the app owns, and is bundled as
 * `dist/server/entry-server.js`, where `fluixi start` and the adapters already look.
 */
async function buildApi(cfg: ResolvedConfig, ssr: unknown): Promise<void> {
  const { build: viteBuild } = await import('vite');
  const entry = resolve(cfg.root, '.fluixi', 'api-entry.ts');
  await mkdir(dirname(entry), { recursive: true });
  await writeFile(
    entry,
    '// Written by `fluixi build` for an API-only app. Not to be edited: it is rewritten on every build.\n' +
      "export { isApiRequest, handleApiRequest } from '@fluixi/start/api-routes';\n",
  );
  const apiCfg = { ...cfg, serverEntry: '.fluixi/api-entry.ts' };
  const apiPlugins = await fluixiPlugins(apiCfg);

  step(`api server bundle${bundleNote(cfg)}`);
  await viteBuild({
    root: cfg.root,
    resolve: { alias: aliasesFromTsconfig(cfg.root) },
    plugins: apiPlugins,
    logLevel: 'warn',
    ssr: ssr as never,
    build: {
      outDir: 'dist/server',
      emptyOutDir: true,
      ...serverInputs(entry, middlewareOf(cfg), 'entry-server'),
    },
  });
  if (cfg.adapter?.build) {
    step(`${cfg.adapter.name} output`);
    await cfg.adapter.build({
      cfg,
      root: cfg.root,
      clientDir: resolve(cfg.root, 'dist/client'),
      serverDir: resolve(cfg.root, 'dist/server'),
      hasServer: true,
      bundleEntry: (source, outFile) => bundleEntry(cfg, apiPlugins, source, outFile),
    });
  }

  await buildJobs(cfg, ssr, apiPlugins);
  await buildServerHooks(cfg, ssr, apiPlugins);
}

/** `server bundle (node · external)`: the output shape is not obvious from the file. */
function bundleNote(cfg: ResolvedConfig): string {
  const adapter = cfg.adapter;
  if (!adapter?.bundle) return '';
  return c.gray(` (${adapter.name} · ${adapter.bundle})`);
}

/** The jobs module (`src/jobs.ts`), when the app has one → dist/server/jobs.js, what `fluixi worker` runs. */
function buildJobs(cfg: ResolvedConfig, ssr: unknown, plugins: unknown[]): Promise<void> {
  return buildServerModule(cfg, ssr, plugins, cfg.jobs, 'jobs');
}

/**
 * The server module (`src/server.ts`), when the app has one → dist/server/server.js, what
 * `fluixi start` runs beside the handler. A serverless target has no process for it to live in.
 */
function buildServerHooks(cfg: ResolvedConfig, ssr: unknown, plugins: unknown[]): Promise<void> {
  return buildServerModule(cfg, ssr, plugins, cfg.server, 'server');
}

/** Refuses, before anything is built, a server module the target has no process for. */
export function checkServerModule(cfg: ResolvedConfig): void {
  if (!cfg.adapter?.serverless || !existsSync(resolve(cfg.root, cfg.server))) return;
  throw new Error(
    `fluixi build: ${cfg.server} needs a long-running server, and the "${cfg.adapter.name}" adapter ` +
      `has none (no WebSocket upgrades, no start or shutdown). Deploy with the node adapter, or remove it.`,
  );
}

async function buildServerModule(cfg: ResolvedConfig, ssr: unknown, plugins: unknown[], file: string, name: string): Promise<void> {
  const source = resolve(cfg.root, file);
  if (!existsSync(source)) return;
  const { build: viteBuild } = await import('vite');
  step(name);
  await viteBuild({
    root: cfg.root,
    resolve: { alias: aliasesFromTsconfig(cfg.root) },
    plugins: plugins as never,
    logLevel: 'warn',
    ssr: ssr as never,
    build: {
      outDir: 'dist/server',
      ssr: source,
      emptyOutDir: false,
      rollupOptions: { output: { entryFileNames: `${name}.js` } },
    },
  });
}

/**
 * The public set this build put in the browser bundle, for a server that imports the framework
 * from node_modules and so never sees the build-time define: it serves these values rather than
 * its own environment, and the page hydrates with what it was rendered with.
 */
async function writePublicEnv(cfg: ResolvedConfig): Promise<void> {
  const { PUBLIC_ENV_FILE, selectPublic } = await import('../env.js');
  const keys = cfg.env?.public ?? [];
  const values = selectPublic(process.env as Record<string, string | undefined>, keys);
  await writeFile(join(resolve(cfg.root, 'dist/server'), PUBLIC_ENV_FILE), JSON.stringify({ keys, values }) + '\n');
}

/** The app's middleware file, when it has one. */
function middlewareOf(cfg: { root: string; middleware: string }): string | undefined {
  const file = resolve(cfg.root, cfg.middleware);
  return existsSync(file) ? file : undefined;
}

/**
 * The server entry and the middleware as inputs of one build. Built apart, a module both of
 * them import (a service, a session store) was bundled twice, each copy with its own state, so
 * middleware and the page saw two instances per request in production and one in dev. One
 * build turns what they share into a shared chunk. The files keep their names:
 * `entry-server.js`, `middleware.js`.
 */
function serverInputs(entry: string, middleware: string | undefined, entryName = basename(entry).replace(/\.[cm]?[jt]sx?$/, '')) {
  return {
    ssr: true,
    rollupOptions: {
      input: { [entryName]: entry, ...(middleware ? { middleware } : {}) },
      output: { entryFileNames: '[name].js' },
    },
  };
}

/**
 * The client entry's files, for the document's `<Head />` and `<Scripts />`: the entry chunk,
 * the styles it and its imports carry, and the chunks it imports, to preload. From the build
 * manifest, before it is deleted from the published output.
 */
async function writeDocumentAssets(cfg: ResolvedConfig, clientDir: string, serverDir: string): Promise<void> {
  const chunksFile = join(clientDir, '.vite', 'manifest.json');
  const chunks: Record<string, ManifestChunk> = existsSync(chunksFile) ? JSON.parse(await readFile(chunksFile, 'utf-8')) : {};
  const entry = chunks[clientEntryFile(cfg).replace(/\\/g, '/').replace(/^\.\//, '')];
  if (!entry) throw new Error(`[fluixi] the client build has no chunk for ${clientEntryFile(cfg)}, so the document has no script to load.`);
  const files = withImports(['/' + entry.file], chunks);
  // The event capture the Vite HTML hook puts in index.html; a document has no index.html.
  const capture = cfg.ssr && cfg.eventReplay ? (await import('@fluixi/server')).eventCaptureScript().replace(/^<script>|<\/script>$/g, '') : null;
  const assets = {
    ...(capture ? { inline: [capture] } : {}),
    scripts: ['/' + entry.file],
    styles: [...new Set([...(entry.css ?? []).map((css) => '/' + css), ...files.filter((f) => f.endsWith('.css'))])],
    preloads: files.filter((f) => f.endsWith('.js') && f !== '/' + entry.file),
  };
  await writeFile(join(serverDir, DOCUMENT_ASSETS_FILE), JSON.stringify(assets, null, 2) + '\n');
}
