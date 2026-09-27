/**
 * `fluixi doctor`: the install problems that make an app behave unlike its source.
 *
 * Two copies of a package mean two sets of module state: a signal written through one is not
 * seen through the other, and an injection token registered in one is missing in the other.
 * Nothing fails loudly. A missing editor plugin is quieter still: the env and auth rules
 * never run.
 */
import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

export interface Problem {
  severity: 'error' | 'warning';
  message: string;
}

const readJson = (file: string): any => JSON.parse(readFileSync(file, 'utf8'));

/** Each `@fluixi/*` package the app resolves, with its version. */
export function resolvedVersions(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  const scope = join(root, 'node_modules/@fluixi');
  if (!existsSync(scope)) return out;
  for (const name of readdirSync(scope).sort()) {
    const file = join(scope, name, 'package.json');
    if (existsSync(file)) out[`@fluixi/${name}`] = readJson(file).version;
  }
  return out;
}

/**
 * Every distinct copy of each `@fluixi/*` package installed under the app: pnpm's store
 * directories, and npm's nested `node_modules`.
 */
export function installedCopies(root: string): Record<string, string[]> {
  const found = new Map<string, Set<string>>();
  const seen = new Set<string>();
  const add = (dir: string) => {
    const file = join(dir, 'package.json');
    if (!existsSync(file)) return;
    const real = realpathSync(dir);
    if (seen.has(real)) return;
    seen.add(real);
    const { name, version } = readJson(file);
    if (!found.has(name)) found.set(name, new Set());
    found.get(name)!.add(version);
  };
  const scan = (modules: string, depth: number) => {
    const scope = join(modules, '@fluixi');
    if (existsSync(scope)) {
      for (const name of readdirSync(scope)) {
        add(join(scope, name));
        if (depth > 0) scan(join(scope, name, 'node_modules'), depth - 1);
      }
    }
  };
  const top = join(root, 'node_modules');
  scan(top, 2);
  const store = join(top, '.pnpm');
  if (existsSync(store)) {
    for (const entry of readdirSync(store)) {
      if (entry.startsWith('@fluixi+')) scan(join(store, entry, 'node_modules'), 0);
    }
  }
  return Object.fromEntries([...found].map(([k, v]) => [k, [...v].sort()]));
}

/** Whether tsconfig names the ts-plugin, read through the app's TypeScript for its comment syntax. */
function pluginConfigured(root: string): boolean | null {
  const file = join(root, 'tsconfig.json');
  if (!existsSync(file)) return null;
  let config: any;
  try {
    const ts = createRequire(join(root, 'package.json'))('typescript');
    config = ts.readConfigFile(file, ts.sys.readFile).config;
  } catch {
    try {
      config = readJson(file);
    } catch {
      return null;
    }
  }
  return (config?.compilerOptions?.plugins ?? []).some((p: { name?: string }) => p.name === '@fluixi/ts-plugin');
}

export function diagnose(root: string): Problem[] {
  const problems: Problem[] = [];
  for (const [name, versions] of Object.entries(installedCopies(root))) {
    if (versions.length > 1) {
      problems.push({ severity: 'error', message: `${name} is installed ${versions.length} times (${versions.join(', ')}); each copy keeps its own state` });
    }
  }

  const pkg = existsSync(join(root, 'package.json')) ? readJson(join(root, 'package.json')) : {};
  const declared = { ...pkg.dependencies, ...pkg.devDependencies } as Record<string, string>;
  const prerelease = Object.entries(declared)
    .filter(([n]) => n.startsWith('@fluixi/'))
    .map(([, v]) => v.match(/-(alpha|beta|rc)\.\d+/)?.[1])
    .filter(Boolean);
  if (new Set(prerelease).size > 1) {
    problems.push({ severity: 'warning', message: `@fluixi/* dependencies mix prerelease tags (${[...new Set(prerelease)].join(', ')})` });
  }

  const plugin = pluginConfigured(root);
  if (plugin === false) {
    problems.push({
      severity: 'warning',
      message: 'tsconfig.json does not load @fluixi/ts-plugin: the editor shows no env or auth warnings. Add { "name": "@fluixi/ts-plugin" } to compilerOptions.plugins',
    });
  } else if (plugin && !existsSync(join(root, 'node_modules/@fluixi/ts-plugin'))) {
    problems.push({ severity: 'warning', message: 'tsconfig.json names @fluixi/ts-plugin, which is not installed' });
  }
  return problems;
}
