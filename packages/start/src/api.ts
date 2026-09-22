// File-based API routes. Files under `apiDir` (default src/api) export HTTP-method handlers
// (GET/POST/PUT/PATCH/DELETE) that take (request, { params }) and return a Web Response. They map
// to `/api/<path>` ([id] → param, [...rest] → catch-all). A scan plugin emits `virtual:fluixi-api`
// (isApiRequest + handleApiRequest); dev auto-wires it, prod gets it via the entry-server re-export.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve as resolvePath, relative as relativePath, join } from 'node:path';

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
  const out = await (fn as (req: Request, ctx: { params: Record<string, string> }) => unknown)(request, { params: match.params });
  if (out instanceof Response) return out;
  return new Response(JSON.stringify(out ?? null), { headers: { 'content-type': 'application/json; charset=utf-8' } });
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
    else if (/\.(ts|tsx|js|mjs)$/.test(name) && !/\.(spec|test)\./.test(name)) out.push(full);
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
        entries.push(`{ source: ${JSON.stringify(src)}, keys: ${JSON.stringify(keys)}, rank: ${rank}, mod: _${i} }`);
      });
      return (
        `import { isApiPath, handleApi } from '@fluixi/start/api';\n` +
        `${imports.join('\n')}\n` +
        `const routes = [${entries.join(',')}];\n` +
        `export const isApiRequest = (request) => isApiPath(new URL(request.url).pathname, ${JSON.stringify(prefix)});\n` +
        `export const handleApiRequest = (request) => handleApi(routes, request, ${JSON.stringify(prefix)});\n`
      );
    },
  };
}

export const API_VIRTUAL_MODULE = API_VMOD;

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
