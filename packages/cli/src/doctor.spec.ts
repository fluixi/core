import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { diagnose, installedCopies, resolvedVersions } from './doctor.js';

let root: string;
const file = (rel: string, text: string) => {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), text);
};
const pkg = (dir: string, name: string, version: string) => file(`${dir}/package.json`, JSON.stringify({ name, version }));

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'fx-doctor-'));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('installedCopies', () => {
  it('finds a copy npm nested under another package', () => {
    pkg('node_modules/@fluixi/start', '@fluixi/start', '0.1.0-alpha.82');
    pkg('node_modules/@fluixi/cli', '@fluixi/cli', '0.1.0-alpha.82');
    pkg('node_modules/@fluixi/cli/node_modules/@fluixi/start', '@fluixi/start', '0.1.0-alpha.81');

    expect(installedCopies(root)['@fluixi/start']).toEqual(['0.1.0-alpha.81', '0.1.0-alpha.82']);
    expect(resolvedVersions(root)).toEqual({ '@fluixi/cli': '0.1.0-alpha.82', '@fluixi/start': '0.1.0-alpha.82' });
  });

  it('finds two versions in the pnpm store and counts a symlinked one once', () => {
    pkg('node_modules/.pnpm/@fluixi+start@0.1.0-alpha.82/node_modules/@fluixi/start', '@fluixi/start', '0.1.0-alpha.82');
    pkg('node_modules/.pnpm/@fluixi+start@0.1.0-alpha.80/node_modules/@fluixi/start', '@fluixi/start', '0.1.0-alpha.80');
    mkdirSync(join(root, 'node_modules/@fluixi'), { recursive: true });
    symlinkSync(join(root, 'node_modules/.pnpm/@fluixi+start@0.1.0-alpha.82/node_modules/@fluixi/start'), join(root, 'node_modules/@fluixi/start'));

    expect(installedCopies(root)['@fluixi/start']).toEqual(['0.1.0-alpha.80', '0.1.0-alpha.82']);
  });
});

describe('diagnose', () => {
  it('reports duplicates as errors and a missing editor plugin as a warning', () => {
    pkg('node_modules/@fluixi/start', '@fluixi/start', '2.0.0');
    pkg('node_modules/@fluixi/cli/node_modules/@fluixi/start', '@fluixi/start', '1.0.0');
    file('tsconfig.json', '{ "compilerOptions": { "strict": true } }');

    const problems = diagnose(root);
    expect(problems.map((p) => p.severity)).toEqual(['error', 'warning']);
    expect(problems[0].message).toMatch(/@fluixi\/start is installed 2 times \(1\.0\.0, 2\.0\.0\)/);
    expect(problems[1].message).toMatch(/does not load @fluixi\/ts-plugin/);
  });

  it('is quiet when the plugin is configured and installed', () => {
    pkg('node_modules/@fluixi/ts-plugin', '@fluixi/ts-plugin', '1.0.0');
    file('tsconfig.json', '{ "compilerOptions": { "plugins": [{ "name": "@fluixi/ts-plugin" }] } }');
    expect(diagnose(root)).toEqual([]);
  });
});
