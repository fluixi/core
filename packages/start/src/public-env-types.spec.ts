import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { publicEnvTypes, startTypesPlugin } from './internal.js';
import { resolveConfig } from './config.js';

let root = '';
afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true });
  root = '';
});

const run = (publicNames: string[]) => {
  const plugin = startTypesPlugin(resolveConfig({ root, env: { public: publicNames }, i18n: false }));
  plugin.configResolved({ root });
  plugin.buildStart();
};
const file = () => join(root, 'src/fluixi-public-env.d.ts');

describe('the generated PublicEnv declaration', () => {
  it('augments @fluixi/start/env with each declared name, quoting one that is not an identifier', () => {
    const out = publicEnvTypes(['API_URL', 'my-flag']);
    expect(out).toContain("declare module '@fluixi/start/env'");
    expect(out).toContain('    API_URL: string;');
    expect(out).toContain('    "my-flag": string;');
    // A module, or the declaration would replace the package's types instead of adding to them.
    expect(out).toContain('export {};');
  });

  it('writes it when the app declares a public set, and rewrites it when the set changes', () => {
    root = mkdtempSync(join(tmpdir(), 'fluixi-types-'));
    mkdirSync(join(root, 'src'));
    run(['API_URL']);
    expect(readFileSync(file(), 'utf8')).toContain('API_URL: string;');
    run(['API_URL', 'APP_URL']);
    expect(readFileSync(file(), 'utf8')).toContain('APP_URL: string;');
  });

  it('removes the one it wrote once the set is gone, and never a file of the app', () => {
    root = mkdtempSync(join(tmpdir(), 'fluixi-types-'));
    mkdirSync(join(root, 'src'));
    run(['API_URL']);
    run([]);
    expect(existsSync(file())).toBe(false);

    writeFileSync(file(), '// written by hand\n');
    run([]);
    expect(readFileSync(file(), 'utf8')).toBe('// written by hand\n');
  });
});
