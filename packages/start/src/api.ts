// File-based API routes. Files under `apiDir` (default src/api) export HTTP-method handlers
// (GET/POST/PUT/PATCH/DELETE) that take (request, { params }) and return a Web Response. They map
// to `/api/<path>` ([id] → param, [...rest] → catch-all). A scan plugin emits `virtual:fluixi-api`
// (isApiRequest + handleApiRequest); dev auto-wires it, prod gets it via the entry-server re-export.
import { existsSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve as resolvePath, relative as relativePath, join, dirname } from 'node:path';
import { createRequestContext, endRequestContext, runWithRequestContext } from '@fluixi/server';
import { refusalResponse } from './refusal.js';

const API_VMOD = 'virtual:fluixi-api';
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'] as const;

export interface ApiRoute {
  /** Regex source matching the pathname. */
  source: string;
  /** Param names, in capture-group order. */
  keys: string[];
  /** The route module (its method exports). */
  mod: Record<string, unknown>;
  /** Higher = more specific (static beats dynamic beats catch-all). */
  rank: number;
  /** The route as a path template, `/api/v1/projects/{id}`: what an API description names it by. */
  path?: string;
}

/** A file path relative to the api dir, as a path template: `projects/[id]` is `/api/projects/{id}`. */
export function pathTemplate(rel: string, prefix = '/api'): string {
  const segs = rel.split('/').filter(Boolean);
  if (segs[segs.length - 1] === 'index') segs.pop();
  const parts = segs.map((seg) => seg.replace(/^\[\.\.\.(.+)\]$/, '{$1}').replace(/^\[(.+)\]$/, '{$1}'));
  return [prefix.replace(/\/$/, ''), ...parts].join('/') || '/';
}

/** Derive a route pattern from a file path relative to the api dir (no extension). */
export function derivePattern(rel: string, prefix = '/api'): { source: string; keys: string[]; rank: number } {
  const segs = rel.split('/').filter(Boolean);
  if (segs[segs.length - 1] === 'index') segs.pop();
  const keys: string[] = [];
  let rank = 0;
  const parts = segs.map((seg) => {
    const catchAll = seg.match(/^\[\.\.\.(.+)\]$/);
    if (catchAll) {
      keys.push(catchAll[1]);
      return '(.+)';
    }
    const param = seg.match(/^\[(.+)\]$/);
    if (param) {
      keys.push(param[1]);
      rank += 1;
      return '([^/]+)';
    }
    rank += 10;
    return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });
  return { source: `^${prefix}${parts.length ? '/' + parts.join('/') : ''}/?$`, keys, rank };
}

/** Whether a pathname falls under the api prefix (so a miss 404s as API, not SSR). */
export function isApiPath(pathname: string, prefix = '/api'): boolean {
  return pathname === prefix || pathname.startsWith(prefix + '/');
}

/** First matching route (by rank) for a pathname, with decoded params. */
export function matchApiRoutes(routes: ApiRoute[], pathname: string): { mod: Record<string, unknown>; params: Record<string, string> } | null {
  for (const r of [...routes].sort((a, b) => b.rank - a.rank)) {
    const m = new RegExp(r.source).exec(pathname);
    if (!m) continue;
    const params: Record<string, string> = {};
    r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1] ?? '')));
    return { mod: r.mod, params };
  }
  return null;
}

/** Match + invoke the method handler. 404 outside any route, 405 when the method is missing. */
export async function handleApi(routes: ApiRoute[], request: Request, prefix = '/api'): Promise<Response> {
  const pathname = new URL(request.url).pathname;
  const match = matchApiRoutes(routes, pathname);
  if (!match) return new Response('Not Found', { status: 404 });
  const fn = match.mod[request.method];
  if (typeof fn !== 'function') {
    const allow = METHODS.filter((m) => typeof match.mod[m] === 'function').join(', ');
    return new Response('Method Not Allowed', { status: 405, headers: allow ? { allow } : undefined });
  }
  let out: unknown;
  try {
    // Inside a request context, as server functions are: `getLocals()` then finds what
    // middleware wrote for this request (the session, the tenant), so `requireUser()` works in
    // an API route. Without it every guard read an empty bag and answered 401.
    const context = createRequestContext({ request, url: pathname, responseHeaders: {} });
    try {
      out = await runWithRequestContext(context, () =>
        (fn as (req: Request, ctx: { params: Record<string, string> }) => unknown)(request, { params: match.params }),
      );
    } finally {
      endRequestContext(context);
    }
  } catch (error) {
    const refused = refusalResponse(error);
    if (refused) return refused;
    throw error;
  }
  if (out instanceof Response) return out;
  return new Response(JSON.stringify(out ?? null), { headers: { 'content-type': 'application/json; charset=utf-8' } });
}

/** A route module: source, not a spec or test beside it. */
function isRouteFile(name: string): boolean {
  return /\.(ts|tsx|js|mjs)$/.test(name) && !/\.(spec|test)\./.test(name);
}

function scanFiles(dir: string, base = dir): string[] {
  let out: string[] = [];
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out = out.concat(scanFiles(full, base));
    else if (isRouteFile(name)) out.push(full);
  }
  return out;
}

/**
 * Scan `dir` for API route files → `virtual:fluixi-api` exporting `isApiRequest(request)` +
 * `handleApiRequest(request)`. Files are statically imported so they bundle for prod.
 */
export function apiRoutesVitePlugin(opts: { dir: string; prefix?: string }): any {
  let root = process.cwd();
  const prefix = opts.prefix ?? '/api';
  const id = '\0' + API_VMOD;
  return {
    name: 'fluixi-api',
    // Must beat node resolution: '@fluixi/start/api-routes' is a real file in this package,
    // so without `pre` Vite resolves the typed stub and the generated table never loads , 
    // the app builds and every API route 404s.
    enforce: 'pre' as const,
    configResolved(config: { root?: string }) {
      root = config.root || root;
    },
    // The table is built once, when first loaded. A route file added or removed while the dev
    // server runs changes it: drop the cached table and rewrite the route map, or the new
    // route answers 404 and the client's types miss it until a restart.
    configureServer(server: {
      watcher: { add(path: string): void; on(event: 'add' | 'unlink', fn: (file: string) => void): void };
      moduleGraph: { getModuleById(id: string): unknown; invalidateModule(mod: never): void };
    }) {
      const dir = resolvePath(root, opts.dir);
      const onChange = (file: string) => {
        if (!resolvePath(file).startsWith(dir) || !isRouteFile(file)) return;
        const mod = server.moduleGraph.getModuleById(id);
        if (mod) server.moduleGraph.invalidateModule(mod as never);
        writeApiTypes(root, opts.dir, prefix);
      };
      server.watcher.add(dir);
      server.watcher.on('add', onChange);
      server.watcher.on('unlink', onChange);
    },
    resolveId(source: string) {
      // The public specifier is a real module so its types ship with the package; both
      // resolve to the generated table.
      return source === API_VMOD || source === '@fluixi/start/api-routes' ? id : null;
    },
    load(source: string) {
      if (source !== id) return null;
      const dir = resolvePath(root, opts.dir);
      const files = scanFiles(dir);
      const imports: string[] = [];
      const entries: string[] = [];
      files.forEach((file, i) => {
        const rel = relativePath(dir, file).replace(/\.(ts|tsx|js|mjs)$/, '').split(/[\\/]/).join('/');
        const { source: src, keys, rank } = derivePattern(rel, prefix);
        imports.push(`import * as _${i} from ${JSON.stringify(file)};`);
        entries.push(
          `{ source: ${JSON.stringify(src)}, keys: ${JSON.stringify(keys)}, rank: ${rank}, path: ${JSON.stringify(pathTemplate(rel, prefix))}, mod: _${i} }`,
        );
      });
      return (
        `import { isApiPath, handleApi } from '@fluixi/start/api';\n` +
        `${imports.join('\n')}\n` +
        `const routes = [${entries.join(',')}];\n` +
        `export const isApiRequest = (request) => isApiPath(new URL(request.url).pathname, ${JSON.stringify(prefix)});\n` +
        `export const handleApiRequest = (request) => handleApi(routes, request, ${JSON.stringify(prefix)});\n` +
        // The table itself, for whatever describes the API: an OpenAPI document, a client.
        `export const apiRoutes = routes;\n`
      );
    },
  };
}

export const API_VIRTUAL_MODULE = API_VMOD;

/** The generated route map, beside the api dir: `src/api.gen.ts` for `src/api`. */
export const API_TYPES_FILE = 'api.gen.ts';
const API_TYPES_HEADER = '// Generated by @fluixi/start from the API route files. Do not edit; commit it.';

/**
 * The API's routes as a type, path template to route module, for `createClient<ApiRoutes>()`
 * in `@fluixi/api/client`. Committed with the app, so another app (the web app, a widget) types
 * its client from it without running this one's dev server first.
 */
export function apiTypesSource(dir: string, file: string, prefix = '/api'): string {
  const lines = scanFiles(dir)
    .map((route) => {
      const rel = relativePath(dir, route).replace(/\.(ts|tsx|js|mjs)$/, '').split(/[\\/]/).join('/');
      let spec = relativePath(dirname(file), route).split(/[\\/]/).join('/').replace(/\.(ts|tsx)$/, '.js');
      if (!spec.startsWith('.')) spec = './' + spec;
      return [pathTemplate(rel, prefix), spec] as const;
    })
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([path, spec]) => `  ${JSON.stringify(path)}: typeof import(${JSON.stringify(spec)});\n`);
  return `${API_TYPES_HEADER}\nexport interface ApiRoutes {\n${lines.join('')}}\n`;
}

/** Writes the route map when there are routes; removes one this wrote when there are none. */
export function writeApiTypes(root: string, apiDir: string, prefix = '/api'): string | null {
  const dir = resolvePath(root, apiDir);
  const file = resolvePath(dir, '..', API_TYPES_FILE);
  try {
    if (!scanFiles(dir).length) {
      if (existsSync(file) && readFileSync(file, 'utf8').startsWith(API_TYPES_HEADER)) unlinkSync(file);
      return null;
    }
    const content = apiTypesSource(dir, file, prefix);
    if (!existsSync(file) || readFileSync(file, 'utf8') !== content) writeFileSync(file, content);
    return file;
  } catch {
    /* read-only fs (some CI): the committed file is still there */
    return null;
  }
}

/**
 * Fail a build whose API routes would never be reached.
 *
 * A production server dispatches to them only when the server entry re-exports the
 * handlers; without that every `/api/*` request falls through to the page renderer and
 * comes back as a rendered page with a 200. For a route that guards something, that is a
 * 200 where a 401 belongs, and nothing says so at runtime.
 *
 * The dev server wires this itself, so the gap only appears once an app is built, which
 * is the worst moment to discover it. Checked here instead.
 */
export function assertApiRoutesReachable(options: {
  root: string;
  apiDir: string;
  serverEntry: string;
}): void {
  const dir = resolvePath(options.root, options.apiDir);
  if (!collectRoutes(dir).length) return;

  const entry = resolvePath(options.root, options.serverEntry);
  let source: string;
  try {
    source = readFileSync(entry, 'utf8');
  } catch {
    // No server entry at all is a different problem, reported elsewhere.
    return;
  }

  if (source.includes('@fluixi/start/api-routes')) return;

  throw new Error(
    `[fluixi] ${options.apiDir} has API routes, but ${options.serverEntry} does not re-export them, ` +
      `so a built server would answer every /api request with a rendered page instead.

` +
      `  Add to ${options.serverEntry}:
` +
      `    export { isApiRequest, handleApiRequest } from '@fluixi/start/api-routes';
`,
  );
}

/** Route files under `dir`, without loading them. */
function collectRoutes(dir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  const found: string[] = [];
  for (const name of entries) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) found.push(...collectRoutes(full));
    else if (/\.[jt]sx?$/.test(name) && !/\.(spec|test)\./.test(name)) found.push(full);
  }
  return found;
}
