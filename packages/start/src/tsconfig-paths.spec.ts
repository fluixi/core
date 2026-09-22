/**
 * tsconfig `paths` becoming bundler aliases.
 *
 * Any alias an app declares, not a fixed list: the point is that the type checker and the
 * bundler read the same file, so an import that typechecks is one the build can resolve.
 * What is worth asserting is the places the two formats do not line up, ordering,
 * wildcards, `extends`, and a target naming a package rather than a file.
 */
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { aliasesFromTsconfig } from './tsconfig-paths.js';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'fx-tsconfig-'));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

const write = (name: string, value: unknown) =>
  writeFileSync(join(root, name), typeof value === 'string' ? value : JSON.stringify(value));

/**
 * The replacement for a `find`, whether it came back as a prefix string or an anchored
 * RegExp. Written once here so each test names the specifier the app wrote.
 */
const find = (list: ReturnType<typeof aliasesFromTsconfig>, needle: string) =>
  list.find((a) =>
    a.find instanceof RegExp ? a.find.test(needle) : a.find === needle,
  )?.replacement;

describe('an app with no paths', () => {
  it('gets no aliases rather than an error', () => {
    write('tsconfig.json', { compilerOptions: {} });
    expect(aliasesFromTsconfig(root)).toEqual([]);
  });

  it('survives a missing tsconfig', () => {
    expect(aliasesFromTsconfig(root)).toEqual([]);
  });

  it('survives a tsconfig it cannot parse', () => {
    write('tsconfig.json', '{ this is not json');
    expect(aliasesFromTsconfig(root)).toEqual([]);
  });
});

describe('the aliases an app actually writes', () => {
  it('maps a wildcard to a directory prefix', () => {
    mkdirSync(join(root, 'src'), { recursive: true });
    write('tsconfig.json', { compilerOptions: { paths: { '@/*': ['./src/*'] } } });
    expect(find(aliasesFromTsconfig(root), '@/')).toBe(`${resolve(root, 'src')}/`);
  });

  it('maps an exact specifier to one file', () => {
    write('tsconfig.json', {
      compilerOptions: { paths: { '@/auth': ['./src/services/auth/index.ts'] } },
    });
    expect(find(aliasesFromTsconfig(root), '@/auth')).toBe(
      resolve(root, 'src/services/auth/index.ts'),
    );
  });

  it('anchors an exact specifier, so it does not capture a subpath', () => {
    write('tsconfig.json', { compilerOptions: { paths: { '@/auth': ['./src/auth.ts'] } } });
    const entry = aliasesFromTsconfig(root)[0];
    expect(entry.find).toBeInstanceOf(RegExp);
    expect('@/auth').toMatch(entry.find as RegExp);
    // Without the anchor this alias would also swallow `@/auth/session`.
    expect('@/auth/session').not.toMatch(entry.find as RegExp);
  });

  it('resolves against baseUrl when one is set', () => {
    mkdirSync(join(root, 'src', 'lib'), { recursive: true });
    write('tsconfig.json', {
      compilerOptions: { baseUrl: './src', paths: { 'lib/*': ['lib/*'] } },
    });
    expect(find(aliasesFromTsconfig(root), 'lib/')).toBe(`${resolve(root, 'src/lib')}/`);
  });
});

describe('ordering', () => {
  it('puts the longest prefix first, so a short one does not swallow it', () => {
    write('tsconfig.json', {
      compilerOptions: {
        paths: {
          '@/*': ['./src/*'],
          '@/components/*': ['./src/ui/*'],
        },
      },
    });
    const list = aliasesFromTsconfig(root);
    // Vite takes the first match. `@/` registered first would capture
    // `@/components/Button` and resolve it under src/ instead of src/ui/.
    expect(String(list[0].find)).toBe('@/components/');
  });
});

describe('a target naming a package', () => {
  it('is left for node resolution rather than rewritten to a file', () => {
    write('tsconfig.json', { compilerOptions: { paths: { shared: ['@acme/shared'] } } });
    // Rewriting it to a path would bypass the package's own `exports` map, losing the
    // import/require and browser/server conditions it declares.
    expect(find(aliasesFromTsconfig(root), 'shared')).toBe('@acme/shared');
  });
});

describe('a config that extends another', () => {
  it('picks up paths from the base', () => {
    mkdirSync(join(root, 'src'), { recursive: true });
    write('tsconfig.base.json', { compilerOptions: { paths: { '@/*': ['./src/*'] } } });
    write('tsconfig.json', { extends: './tsconfig.base.json' });
    // A monorepo usually keeps the paths in a base config; ignoring `extends` would drop
    // every alias such an app declared.
    expect(find(aliasesFromTsconfig(root), '@/')).toBe(`${resolve(root, 'src')}/`);
  });

  it('lets the child override the base', () => {
    mkdirSync(join(root, 'src'), { recursive: true });
    write('tsconfig.base.json', { compilerOptions: { paths: { '@/*': ['./base/*'] } } });
    write('tsconfig.json', {
      extends: './tsconfig.base.json',
      compilerOptions: { paths: { '@/*': ['./src/*'] } },
    });
    expect(find(aliasesFromTsconfig(root), '@/')).toBe(`${resolve(root, 'src')}/`);
  });

  it('does not loop on a config that extends itself', () => {
    write('tsconfig.json', { extends: './tsconfig.json' });
    expect(aliasesFromTsconfig(root)).toEqual([]);
  });
});

describe('the format tsconfig actually uses', () => {
  it('reads comments and trailing commas, which JSON.parse refuses', () => {
    mkdirSync(join(root, 'src'), { recursive: true });
    write(
      'tsconfig.json',
      `{
        // the app's own source
        "compilerOptions": {
          /* both comment styles appear in a real tsconfig */
          "paths": {
            "@/*": ["./src/*"],
          },
        },
      }`,
    );
    expect(find(aliasesFromTsconfig(root), '@/')).toBe(`${resolve(root, 'src')}/`);
  });
});

describe('several targets for one specifier', () => {
  it('takes the first, which is the one the app meant', () => {
    mkdirSync(join(root, 'src'), { recursive: true });
    write('tsconfig.json', {
      compilerOptions: { paths: { '@/*': ['./src/*', './legacy/*'] } },
    });
    // TypeScript tries each until one exists. A bundler alias has a single replacement,
    // so the fallbacks cannot be honoured and the first is what applies.
    expect(find(aliasesFromTsconfig(root), '@/')).toBe(`${resolve(root, 'src')}/`);
  });

  it('skips an entry with no target at all', () => {
    write('tsconfig.json', { compilerOptions: { paths: { '@/*': [] } } });
    expect(aliasesFromTsconfig(root)).toEqual([]);
  });
});

describe('a nested app inside a workspace', () => {
  it('resolves its own paths relative to its own directory', () => {
    const app = join(root, 'apps', 'admin');
    mkdirSync(join(app, 'src'), { recursive: true });
    writeFileSync(
      join(app, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { paths: { '@/*': ['./src/*'] } } }),
    );
    expect(find(aliasesFromTsconfig(app), '@/')).toBe(`${resolve(app, 'src')}/`);
  });
});
