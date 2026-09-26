import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { startMismatch } from './start-copy.js';

let root: string;
afterEach(() => rmSync(root, { recursive: true, force: true }));

const pkg = (dir: string, name: string, version: string) => {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, version }));
};

function app(nested: boolean) {
  root = mkdtempSync(join(tmpdir(), 'fluixi-cli-'));
  pkg(root, 'app', '0.0.0');
  pkg(join(root, 'node_modules/@fluixi/start'), '@fluixi/start', '0.1.0-alpha.75');
  const cli = join(root, 'node_modules/@fluixi/cli');
  pkg(cli, '@fluixi/cli', '0.1.0-alpha.77');
  if (nested) pkg(join(cli, 'node_modules/@fluixi/start'), '@fluixi/start', '0.1.0-alpha.76');
  return join(cli, 'dist/cli.js');
}

describe('startMismatch', () => {
  it('names both copies when the package manager nested one under the CLI', () => {
    const cliFile = app(true);
    const found = startMismatch(root, cliFile);
    expect(found?.cli.version).toBe('0.1.0-alpha.76');
    expect(found?.app.version).toBe('0.1.0-alpha.75');
  });

  it('is quiet when both resolve the same copy', () => {
    expect(startMismatch(root, app(false))).toBeNull();
  });
});
