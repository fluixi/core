import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import type { FluixiConfig, ResolvedConfig } from './config.js';
import { resolveConfig } from './config.js';
import { injectAppAndHead, splitTemplate, guardHandler } from './internal.js';
import {
  createRequestHandler,
  serveNode,
  streamDocument,
  withStaticFiles,
  type FetchHandler,
} from './handler.js';
import { composeMiddleware, normalizeMiddleware } from './middleware.js';

/**
 * Build the production SSR fetch handler from a `fluixi build` output (dist/server +
 * dist/client/index.html). It's runtime-neutral — the SAME handler runs on Node, Bun,
 * Deno, and edge/worker runtimes. Adapters decide how to serve it + assets.
 */
export async function createProdHandler(config: FluixiConfig = {}): Promise<FetchHandler> {
  const cfg = resolveConfig(config);
  const clientDir = resolve(cfg.root, 'dist/client');
  const template = await readFile(join(clientDir, 'index.html'), 'utf-8');
  const serverEntry = resolve(cfg.root, 'dist/server', 'entry-server.js');
  // SPA apps may ship no server entry (or one only for server functions) — import if present.
  const mod = existsSync(serverEntry)
    ? await import(/* @vite-ignore */ pathToFileURL(serverEntry).href)
    : {};

  // Streaming when the entry exports `renderStream` (a body stream): flush the split
  // template head first, pipe the body, then the tail. Else inject the string render.
  let core: FetchHandler;
  if (!cfg.ssr) {
    // SPA: the page is the static shell; the client entry renders it. Server functions +
    // middleware still run through this handler — there's just no SSR render pass.
    core = createRequestHandler(async () => template);
  } else if (typeof mod.renderStream === 'function') {
    const { head, tail } = splitTemplate(template, cfg.mountId);
    core = async (request) => {
      const url = new URL(request.url);
      const body = await mod.renderStream(url.pathname + url.search, request);
      return streamDocument(head, body, tail);
    };
  } else {
    const render = mod.render ?? mod.default;
    core = createRequestHandler(async (url, request) =>
      injectAppAndHead(template, await render(url, request), cfg.mountId),
    );
  }

  // Server-function RPC dispatch. The entry-server module re-exports the dispatcher, so
  // it shares the registry that the app's "use server" modules populated (a separate
  // node-imported copy would have an empty registry).
  if (typeof mod.handleServerFn === 'function' && typeof mod.isServerFnRequest === 'function') {
    const render = core;
    core = (request) => (mod.isServerFnRequest(request) ? mod.handleServerFn(request) : render(request));
  }

  // File-based API routes — the entry-server re-exports them from virtual:fluixi-api.
  if (typeof mod.handleApiRequest === 'function' && typeof mod.isApiRequest === 'function') {
    const next = core;
    core = (request) => (mod.isApiRequest(request) ? mod.handleApiRequest(request) : next(request));
  }

  // Optional request middleware (src/middleware.ts → dist/server/middleware.js).
  const mwFile = resolve(cfg.root, 'dist/server', 'middleware.js');
  if (!existsSync(mwFile)) return guardHandler(core);
  const mwMod = await import(/* @vite-ignore */ pathToFileURL(mwFile).href);
  return guardHandler(composeMiddleware(normalizeMiddleware(mwMod), core));
}

export interface AdapterContext {
  handler: FetchHandler;
  cfg: ResolvedConfig;
  /** Built client assets dir (dist/client). */
  clientDir: string;
}

/**
 * A deploy target. The runtime-neutral fetch handler is the portable core; an adapter
 * packages it for a platform: filesystem runtimes (node) listen on a port and serve
 * static files from disk; edge/serverless runtimes return a `{ fetch }` export the
 * platform invokes (assets served by the platform/CDN). Build-time artifact emission
 * (worker bundle, function manifest) is a later increment.
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
 * `'external'` lists the app's own `@fluixi/*` dependencies rather than externalizing
 * everything: under a strict `node_modules` layout (pnpm) only what the app itself
 * declares is resolvable from its root, so externalizing a merely transitive package
 * would produce a bundle that imports something Node cannot find.
 *
 * Each package is listed with every subpath its `exports` map publishes, because Vite
 * only honours an *exact* id in `ssr.external`. A bare package name falls through to a
 * resolvability probe that does not externalize deep imports here, and the result is the
 * worst of both worlds: `@fluixi/core` an import, `@fluixi/core/router-next` copied into
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
        `@fluixi/* dependency was found in ${join(cfg.root, 'package.json')} — bundling everything.`,
    );
  }
  return { noExternal, external: external.length ? external : undefined };
}

/** The app's own `@fluixi/*` dependencies, read from its package.json. */
function frameworkDeps(root: string): string[] {
  const pkg = readPackage(join(root, 'package.json'));
  if (!pkg) return [];
  const declared = { ...pkg.dependencies, ...pkg.peerDependencies, ...pkg.optionalDependencies };
  return Object.keys(declared).filter((id) => id.startsWith('@fluixi/'));
}

/**
 * `['@fluixi/core', '@fluixi/core/rx', …]` — the package plus every static subpath it
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
