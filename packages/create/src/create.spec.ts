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
import { INTRINSICS } from '@fluixi/compiler/intrinsics';

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

  it('declares every reactive intrinsic the compiler knows in the new app\'s fluixi.d.ts', () => {
    create();
    const dts = read('fluixi.d.ts');
    const reactive = Object.entries(INTRINSICS).filter(([, i]) => i.module.startsWith('@fluixi/reactive/'));
    for (const [name, i] of reactive) expect(dts).toContain(`const ${name}: typeof `);
    expect(dts).toContain('const $cleanup: typeof __fluixi_reactive_signal.onCleanup;');
  });
});
