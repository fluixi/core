/**
 * The built binary, run the way a script runs it: every answer on the command line, stdin
 * closed. What lands on disk is the contract.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INTRINSICS, TAG_INTRINSICS } from '@fluixi/compiler/intrinsics';

const bin = fileURLToPath(new URL('../dist/index.js', import.meta.url));
let cwd: string;
const create = (...args: string[]) =>
  execFileSync('node', [bin, 'app', '--jsx', '--no-ui', '--no-css', ...args], { cwd, input: '', encoding: 'utf8' });
const read = (rel: string) => readFileSync(join(cwd, 'app', rel), 'utf8');

beforeEach(() => {
  cwd = mkdtempSync(join(tmpdir(), 'fx-create-'));
});
afterEach(() => rmSync(cwd, { recursive: true, force: true }));

describe('create-fluixi --auth', () => {
  it('wires oauth2 into an SSR app, with its dependency and variables', () => {
    const out = create('--ssr', '--auth=oauth2', '--provider=keycloak', '--tokens=server');
    expect(out).toContain('OAuth2 keycloak');
    expect(JSON.parse(read('package.json')).dependencies['@fluixi/oauth2']).toBe('alpha');
    expect(read('fluixi.config.ts')).toContain(`env: {\n    public: [\n      'AUTH_PROVIDER',`);
    expect(read('src/app.config.ts')).toContain('imports: [AuthModule]');
    expect(read('src/app.config.server.ts')).toContain('imports: [authServer()]');
    expect(read('.env.example')).toMatch(/^SESSION_SECRET=$/m);
    expect(existsSync(join(cwd, 'app/src/routes/login.tsx'))).toBe(true);
  });

  it('adds nothing without --auth', () => {
    create('--ssr');
    expect(existsSync(join(cwd, 'app/src/services'))).toBe(false);
    expect(JSON.parse(read('package.json')).dependencies['@fluixi/oauth2']).toBeUndefined();
  });

  it('refuses auth for an SPA, which has no server to hold it', () => {
    expect(() => create('--spa', '--auth=oauth2')).toThrow(/needs an SSR app/);
    expect(existsSync(join(cwd, 'app'))).toBe(false);
  });

  it('declares every reactive and storage intrinsic the compiler knows in the new app\'s fluixi.d.ts', () => {
    create();
    const dts = read('fluixi.d.ts');
    const reactive = Object.entries(INTRINSICS).filter(([, i]) => /^@fluixi\/(reactive|core)\//.test(i.module));
    for (const [name] of reactive) expect(dts).toContain(`const ${name}: typeof `);
    expect(dts).toContain('const $cleanup: typeof __fluixi_reactive_signal.onCleanup;');
    expect(dts).toContain('const $persisted: typeof __fluixi_core_storage.persisted;');
    expect(dts).toContain("import * as __fluixi_core_storage from '@fluixi/core/storage';");
  });

  it('declares the template intrinsics too: $html, $svg, $css', () => {
    create();
    const dts = read('fluixi.d.ts');
    for (const [name, tag] of Object.entries(TAG_INTRINSICS)) expect(dts).toContain(`const ${name}: typeof __fluixi_core.${tag.export};`);
    expect(dts).toContain("import * as __fluixi_core from '@fluixi/core';");
  });

  it('prints its usage for --help and creates nothing', () => {
    for (const flag of ['--help', '-h']) {
      const out = execFileSync('node', [bin, flag], { cwd, input: '', encoding: 'utf8' });
      expect(out).toMatch(/^Usage: create-fluixi/);
      expect(out).toContain('--auth=oauth2|better-auth');
    }
    expect(existsSync(join(cwd, 'fluixi-app'))).toBe(false);
  });

  it('refuses an option it does not know before creating anything', () => {
    expect(() => create('--sap')).toThrow(/unknown option --sap/);
    expect(existsSync(join(cwd, 'app'))).toBe(false);
  });
});
