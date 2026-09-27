/**
 * `fluixi info`: what the app is made of, read from its files without building it.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { resolveConfig, type FluixiConfig } from '../config.js';
import { c } from '../ui.js';

export interface ApiRoute {
  path: string;
  file: string;
  methods: string[];
}

export interface AppInfo {
  adapter: string;
  pages: string[];
  api: ApiRoute[];
  /** Module names in `imports: [...]`, per app config file that exists. */
  modules: Record<string, string[]>;
}

const METHODS = /export\s+(?:const|(?:async\s+)?function)\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g;
const SOURCE = /\.[cm]?[jt]sx?$/;

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (SOURCE.test(name) && !/\.(spec|test|d)\.[cm]?[jt]sx?$/.test(name)) out.push(path);
  }
  return out;
}

/** `users/[id].ts` → `/api/users/:id`, `auth/[...all].ts` → `/api/auth/*all`. */
export function apiPath(rel: string, prefix = '/api'): string {
  const segs = rel.replace(SOURCE, '').split('/').filter(Boolean);
  if (segs[segs.length - 1] === 'index') segs.pop();
  const parts = segs.map((s) => s.replace(/^\[\.\.\.(.+)\]$/, '*$1').replace(/^\[(.+)\]$/, ':$1'));
  return `${prefix}${parts.length ? '/' + parts.join('/') : ''}`;
}

/** The entries of `imports: [...]` as written; any other expression comes back whole. */
export function moduleNames(source: string): string[] {
  const start = source.match(/\bimports\s*:\s*/);
  if (!start) return [];
  const text = source.slice(start.index! + start[0].length).replace(/\/\/.*$/gm, '');
  const items: string[] = [];
  let depth = 0;
  let item = '';
  for (const ch of text) {
    if ('([{'.includes(ch)) depth++;
    if (')]}'.includes(ch)) depth--;
    if (depth < 0 || (depth === 0 && ch === ',')) break;
    item += ch;
  }
  const expr = item.replace(/\s+/g, ' ').trim();
  if (!/^\[.*\]$/.test(expr)) return expr ? [expr] : [];
  depth = 0;
  item = '';
  for (const ch of expr.slice(1, -1)) {
    if ('([{'.includes(ch)) depth++;
    if (')]}'.includes(ch)) depth--;
    if (depth === 0 && ch === ',') {
      items.push(item.trim());
      item = '';
    } else item += ch;
  }
  items.push(item.trim());
  return items.filter(Boolean);
}

export async function appInfo(config: FluixiConfig): Promise<AppInfo> {
  const cfg = resolveConfig(config);
  const root = cfg.root;
  const { scanRoutes } = await import('@fluixi/core/plugins');
  const pages: string[] = [];
  const visit = (routes: any[]) => {
    for (const r of routes) {
      if (!r.isLayout) pages.push(r.urlPath || '/');
      visit(r.children ?? []);
    }
  };
  visit(scanRoutes(resolve(root, cfg.routesDir)));

  const apiDir = resolve(root, cfg.apiDir);
  const api = walk(apiDir).map((file) => ({
    path: apiPath(relative(apiDir, file).replace(/\\/g, '/')),
    file: relative(root, file),
    methods: [...readFileSync(file, 'utf8').matchAll(METHODS)].map((m) => m[1]),
  }));

  const modules: Record<string, string[]> = {};
  for (const name of ['src/app.config.ts', 'src/app.config.server.ts']) {
    const file = resolve(root, name);
    if (existsSync(file)) modules[name] = moduleNames(readFileSync(file, 'utf8'));
  }
  return { adapter: cfg.adapter?.name ?? 'node', pages: [...new Set(pages)].sort(), api, modules };
}

export async function info(config: FluixiConfig, versions: Record<string, string>): Promise<void> {
  const r = await appInfo(config);
  const out: string[] = [''];
  const head = (s: string) => out.push(`  ${c.bold(s)}`);
  const row = (k: string, v: string) => out.push(`    ${c.gray(k.padEnd(28))}${v}`);

  head('Packages');
  for (const [name, version] of Object.entries(versions)) row(name, version);
  row('adapter', r.adapter);

  out.push('');
  head('Modules');
  if (!Object.keys(r.modules).length) out.push(`    ${c.gray('no src/app.config.ts')}`);
  for (const [file, names] of Object.entries(r.modules)) row(file, names.join(', ') || c.gray('none'));

  out.push('');
  head(`Pages (${r.pages.length})`);
  for (const p of r.pages) out.push(`    ${p}`);

  out.push('');
  head(`API routes (${r.api.length})`);
  for (const a of r.api) row(a.path, `${a.methods.join(' ') || c.gray('no methods')}  ${c.dim(a.file)}`);
  out.push('');
  console.log(out.join('\n'));
}
