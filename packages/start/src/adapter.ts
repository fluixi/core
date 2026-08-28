import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import type { FluixiConfig, ResolvedConfig } from './config.js';
import { resolveConfig } from './config.js';
import { serveNode, withStaticFiles, type FetchHandler } from './handler.js';
import { createHandlerFrom } from './handler-core.js';
import { createPreloader, type RouteAssets } from './preload.js';

/**
 * Build the production SSR fetch handler from a `fluixi build` output (dist/server +
 * dist/client/index.html), reading both off disk. Runtime-neutral once assembled, but
 * the assembly is not: a worker has no filesystem, so a deploy adapter generates an
 * entry that imports the same pieces statically and calls `createHandlerFrom`.
 */
export async function createProdHandler(config: FluixiConfig = {}): Promise<FetchHandler> {
  const cfg = resolveConfig(config);
  const clientDir = resolve(cfg.root, 'dist/client');
  const template = await readTemplate(clientDir, resolve(cfg.root, 'dist/server'));
  const serverEntry = resolve(cfg.root, 'dist/server', 'entry-server.js');
  // SPA apps may ship no server entry (or one only for server functions) — import if present.
  const mod = existsSync(serverEntry)
    ? await import(/* @vite-ignore */ pathToFileURL(serverEntry).href)
    : {};

  // Optional request middleware (src/middleware.ts → dist/server/middleware.js).
  const mwFile = resolve(cfg.root, 'dist/server', 'middleware.js');
  const middleware = existsSync(mwFile)
    ? await import(/* @vite-ignore */ pathToFileURL(mwFile).href)
    : undefined;

  return createHandlerFrom({ template, mod, cfg, middleware, preload: await loadPreloader(cfg) });
}

/**
 * The shell the server renders into.
 *
 * `dist/client/index.html` is it, until the app prerenders `/` — then that path holds a
 * rendered page and the build stashes the shell in `dist/server/template.html` first.
 * Rendering into the page instead puts the home page's markup and head around every
 * SSR response, and leaves hydration two mount elements to choose between.
 */
export async function readTemplate(clientDir: string, serverDir: string): Promise<string> {
  const stashed = join(serverDir, 'template.html');
  return readFile(existsSync(stashed) ? stashed : join(clientDir, 'index.html'), 'utf-8');
}

/**
 * The preloader for a filesystem host, from the route→files map `fluixi build` leaves
 * in `dist/server`. Absent or unreadable means no hints and an unchanged page, never a
 * failed request. A deploy adapter inlines the same map, because a worker cannot read
 * it at runtime.
 */
async function loadPreloader(cfg: ResolvedConfig): Promise<((pathname: string) => string[]) | undefined> {
  const file = resolve(cfg.root, 'dist/server', 'route-assets.json');
  if (!existsSync(file)) return undefined;

  try {
    return createPreloader(JSON.parse(await readFile(file, 'utf-8')) as RouteAssets);
  } catch {
    // A map that cannot be read is a reason to skip preloading, not to refuse to serve.
    return undefined;
  }
}

export interface AdapterContext {
  handler: FetchHandler;
  cfg: ResolvedConfig;
  /** Built client assets dir (dist/client). */
  clientDir: string;
}

/** What an adapter is given after `fluixi build` has produced its output. */
export interface AdapterBuildContext {
  cfg: ResolvedConfig;
  /** App root. */
  root: string;
  /** Client assets and prerendered HTML (dist/client). */
  clientDir: string;
  /** The built server entry and middleware (dist/server). */
  serverDir: string;
  /** False for a fully static SPA, which ships no server entry to wrap. */
  hasServer: boolean;
  /**
   * Bundle a generated entry into one self-contained file. Adapters emit a small
   * platform entry — the worker's `fetch` export, the function's handler — and this
   * pulls the server bundle and the template into it, because none of these
   * platforms can resolve a module or read a file at runtime.
   */
  bundleEntry(source: string, outFile: string): Promise<void>;
}

/**
 * A deploy target.
 *
 * The runtime-neutral fetch handler is the portable core; an adapter packages it for a
 * platform — how the server is bundled (`bundle`), how it is served in development or
 * on a long-running host (`serve`), and what a deploy actually needs on disk
 * (`build`): a worker entry, a function manifest, a routing config.
 */
export interface Adapter {
  name: string;
  /**
   * How `fluixi build` bundles the framework into the server output. The choice is a
   * property of the deploy target, not of the app:
   *
   * - `'external'` — `@fluixi/*` stays as bare imports, resolved from `node_modules` at
   *   runtime. Smaller output, faster build; requires the dependencies to be installed
   *   next to it. Right for a long-running Node/Bun/Deno process.
   * - `'inline'` — everything is bundled into one self-contained file that resolves
   *   nothing at runtime. Right for edge/serverless, where there is no `node_modules`.
   *
   * Unset leaves Vite's own heuristic alone (installed deps external, linked ones bundled).
   */
  bundle?: 'external' | 'inline';
  serve(ctx: AdapterContext): Promise<void> | { fetch: FetchHandler };
  /**
   * Emit the platform's output layout. Runs after the client and server builds and
   * after prerendering, so everything it copies or wraps already exists.
   */
  build?(ctx: AdapterBuildContext): Promise<void> | void;
}

/** Reference filesystem adapter — Node `http` + static files from dist/client. */
export const nodeAdapter: Adapter = {
  name: 'node',
  // A Node server runs from the app directory, so node_modules is right there: keep the
  // framework as imports instead of copying it into the bundle.
  bundle: 'external',
  async serve({ handler, cfg, clientDir }) {
    serveNode(withStaticFiles(handler, clientDir), {
      port: cfg.port,
      onListen: (p) => console.log(`  fluixi start (node) → http://localhost:${p}`),
    });
  },
};

export { cloudflareAdapter, netlifyAdapter, vercelAdapter } from './adapters/platforms.js';

/** Reference edge/web adapter — export `{ fetch }`; the platform serves assets. */
export const webAdapter: Adapter = {
  name: 'web',
  // An edge/serverless runtime uploads a file, not an install: nothing may be left to
  // resolve at runtime, so everything goes in the bundle.
  bundle: 'inline',
  serve({ handler }) {
    return { fetch: handler };
  },
};

/**
 * Subpaths that only look like package entries: a Vite plugin replaces them with the
 * app's generated route/server-fn/API tables, and the real file in the package is a stub
 * that throws. Externalizing one would ship the stub. The plugins run with
 * `enforce: 'pre'` so they win anyway — this list is the second lock on that door.
 */
const GENERATED_SUBPATHS = new Set(['./routes', './server-fns', './api-routes']);

/**
 * The Vite `ssr` options for a build, given the configured adapter's `bundle` mode.
 * Shared by the server and middleware builds so the two cannot disagree.
 *
 * `'external'` lists the app's own `fluixi` and `@fluixi/*` dependencies rather than externalizing
 * everything: under a strict `node_modules` layout (pnpm) only what the app itself
 * declares is resolvable from its root, so externalizing a merely transitive package
 * would produce a bundle that imports something Node cannot find.
 *
 * Each package is listed with every subpath its `exports` map publishes, because Vite
 * only honours an *exact* id in `ssr.external`. A bare package name falls through to a
 * resolvability probe that does not externalize deep imports here, and the result is the
 * worst of both worlds: `fluixi` an import, `fluixi/router` copied into
 * the bundle — two routers, two sets of module state, in one server.
 *
 * `ssrNoExternal` always wins — it is the app saying "this one must be bundled".
 */
export function ssrBuildOptions(cfg: ResolvedConfig): {
  noExternal?: string[] | true;
  external?: string[];
} {
  const noExternal = cfg.ssrNoExternal.length ? cfg.ssrNoExternal : undefined;
  const mode = cfg.adapter?.bundle;

  if (mode === 'inline') return { noExternal: true };
  if (mode !== 'external') return { noExternal };

  const external = frameworkDeps(cfg.root)
    .filter((name) => !cfg.ssrNoExternal.includes(name))
    .flatMap((name) => withSubpaths(cfg.root, name));

  if (!external.length) {
    // Silently building an inlined bundle here would look identical to a working one
    // until someone measures it, so say why nothing was externalized.
    console.warn(
      `  fluixi: adapter "${cfg.adapter?.name}" builds an externalized server, but no ` +
        `fluixi or @fluixi/* dependency was found in ${join(cfg.root, 'package.json')} — bundling everything.`,
    );
  }
  return { noExternal, external: external.length ? external : undefined };
}

/** The app's own `fluixi` and `@fluixi/*` dependencies, read from its package.json. */
function frameworkDeps(root: string): string[] {
  const pkg = readPackage(join(root, 'package.json'));
  if (!pkg) return [];
  const declared = { ...pkg.dependencies, ...pkg.peerDependencies, ...pkg.optionalDependencies };
  // `fluixi` is the front door and carries the router and the runtime, so missing it here
  // inlines the largest package of the set.
  return Object.keys(declared).filter((id) => id === 'fluixi' || id.startsWith('@fluixi/'));
}

/**
 * `['fluixi', 'fluixi/router', …]` — the package plus every static subpath it
 * exports. Wildcard entries (`./lib/*`) cannot be enumerated and are left to Vite; an
 * app importing through one gets it bundled, which is the safe direction.
 */
function withSubpaths(root: string, name: string): string[] {
  const exports = resolvePackage(root, name)?.exports;
  if (!exports || typeof exports !== 'object') return [name];

  const ids = [name];
  for (const key of Object.keys(exports)) {
    if (!key.startsWith('./') || key.includes('*')) continue;
    if (key === './package.json' || GENERATED_SUBPATHS.has(key)) continue;
    ids.push(`${name}/${key.slice(2)}`);
  }
  return ids;
}

/**
 * A dependency's package.json, read from where the app would resolve it. `require.resolve`
 * covers the normal case; packages that do not export `./package.json` (a package may
 * legitimately keep it private) need the node_modules walk, which also handles hoisting.
 */
function resolvePackage(root: string, name: string): any | undefined {
  try {
    return readPackage(createRequire(join(root, 'index.js')).resolve(`${name}/package.json`));
  } catch {
    /* not exported — fall through */
  }
  for (let dir = root; ; dir = dirname(dir)) {
    const pkg = readPackage(join(dir, 'node_modules', name, 'package.json'));
    if (pkg) return pkg;
    if (dirname(dir) === dir) return undefined;
  }
}

function readPackage(file: string): any | undefined {
  if (!existsSync(file)) return undefined;
  try {
    return JSON.parse(readFileSync(file, 'utf-8'));
  } catch {
    return undefined;
  }
}
