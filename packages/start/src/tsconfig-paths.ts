/**
 * `compilerOptions.paths` from tsconfig.json, as bundler aliases.
 *
 * TypeScript's `paths` only tells the type checker where a specifier lives. The bundler
 * knows nothing about it, so an app that adds `"@/auth": ["./src/services/auth"]` gets a
 * clean typecheck and a build that fails to resolve the import. That split is the whole
 * reason this file exists: read the paths once and give the same answer to both.
 *
 * Read at config time, so editing tsconfig.json means restarting the dev server. That is
 * the same rule the type checker follows and the tradeoff every framework doing this
 * makes; watching it would rebuild the module graph on a keystroke in a file that
 * changes twice a year.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';

/** What vite wants: longest prefix first, so `a/b` is not eaten by `a`. */
export interface AliasEntry {
  find: string | RegExp;
  replacement: string;
}

/**
 * tsconfig.json is JSON with comments and trailing commas, which `JSON.parse` refuses.
 *
 * A real parser is not worth a dependency here: strip what the format allows and parse
 * the rest. A tsconfig that defeats this is malformed for every other tool too.
 */
function parseJsonc(text: string): Record<string, unknown> {
  const withoutComments = text
    // Block comments, but not a `/*` inside a string: the string case is rare enough in
    // a tsconfig that the simple form has not been wrong in practice.
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:"'\\])\/\/.*$/gm, '$1');
  const withoutTrailingCommas = withoutComments.replace(/,(\s*[}\]])/g, '$1');
  return JSON.parse(withoutTrailingCommas) as Record<string, unknown>;
}

/**
 * The tsconfig at `file`, with anything it extends merged underneath it.
 *
 * `extends` is followed because a monorepo usually keeps the paths in a base config, and
 * ignoring it would silently drop every alias such an app declared.
 */
function readTsconfig(file: string, seen = new Set<string>()): Record<string, unknown> {
  if (!existsSync(file) || seen.has(file)) return {};
  seen.add(file);

  let own: Record<string, unknown>;
  try {
    own = parseJsonc(readFileSync(file, 'utf8'));
  } catch {
    // A tsconfig this cannot read is one the type checker cannot read either. Saying so
    // here would duplicate an error the app already gets, in a worse place.
    return {};
  }

  const extend = own.extends;
  if (typeof extend !== 'string') return own;

  const from = extend.startsWith('.')
    ? resolve(dirname(file), extend)
    : // A package: `@tsconfig/node20/tsconfig.json`. Resolved from the config's own
      // directory so a nested app finds its own copy.
      resolve(dirname(file), 'node_modules', extend);
  const base = readTsconfig(from.endsWith('.json') ? from : `${from}.json`, seen);

  return {
    ...base,
    ...own,
    compilerOptions: {
      ...((base.compilerOptions as Record<string, unknown>) ?? {}),
      ...((own.compilerOptions as Record<string, unknown>) ?? {}),
    },
  };
}

/**
 * Aliases for every entry in `compilerOptions.paths`.
 *
 * A pattern ending in `/*` becomes a prefix alias, which is what vite resolves against a
 * subpath. An exact key becomes an exact alias, so `fluixi` does not also capture
 * `fluixi/client`.
 *
 * Only the first target of each entry is used. TypeScript tries them in order and takes
 * the first that exists; a bundler alias has one replacement, and picking the first is
 * what an app means by the order it wrote.
 *
 * @param root The directory holding tsconfig.json, which `baseUrl` is relative to.
 */
export function aliasesFromTsconfig(root: string, configName = 'tsconfig.json'): AliasEntry[] {
  const config = readTsconfig(resolve(root, configName));
  const compilerOptions = (config.compilerOptions ?? {}) as Record<string, unknown>;
  const paths = compilerOptions.paths as Record<string, string[]> | undefined;
  if (!paths) return [];

  // `baseUrl` is what unprefixed targets resolve against. Absent, they are relative to
  // the config itself, which is what `moduleResolution: bundler` assumes.
  const baseUrl = typeof compilerOptions.baseUrl === 'string' ? compilerOptions.baseUrl : '.';
  const base = resolve(root, baseUrl);

  const entries: AliasEntry[] = [];
  for (const [pattern, targets] of Object.entries(paths)) {
    const target = targets?.[0];
    if (!target) continue;

    const wildcard = pattern.endsWith('/*');
    // Only the `*` comes off, so the separator stays: `@/*` becomes the prefix `@/`, not
    // `@`, which as an alias would capture every scoped package including `@fluixi/core`.
    const find = wildcard ? pattern.slice(0, -1) : pattern;
    const cleaned = wildcard ? target.replace(/\*$/, '') : target;

    // TypeScript resolves every target against `baseUrl`, so a bare `lib/*` is a path
    // and not a package. A target that resolves to nothing on disk is taken as a package
    // specifier instead, which node resolution can still answer: that keeps the
    // package's own `exports` conditions rather than pinning a file inside it.
    const relative = cleaned.startsWith('.') || isAbsolute(cleaned);
    const asPath = resolve(base, cleaned);
    const isPackage = !relative && !existsSync(asPath.replace(/\/$/, ''));

    entries.push({
      find: wildcard ? find : new RegExp(`^${find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
      // A prefix alias keeps its trailing separator, which `resolve` strips: without it
      // `@/a` would join to `<root>/srca` rather than `<root>/src/a`.
      replacement: isPackage ? cleaned : wildcard ? `${asPath}/` : asPath,
    });
  }

  // Longest first. Vite takes the first match, so a short prefix registered ahead of a
  // longer one would swallow it: `@/` would capture `@/components/*`.
  return entries.sort((a, b) => String(b.find).length - String(a.find).length);
}
