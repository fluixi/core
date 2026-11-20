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

describe('create-fluixi --help', () => {
  it('prints the usage and creates nothing, with the -- form npm needs', () => {
    for (const flag of ['--help', '-h']) {
      const out = execFileSync('node', [bin, flag], { cwd, input: '', encoding: 'utf8' });
      expect(out).toContain('Usage: create-fluixi [dir] [options]');
      expect(out).toContain('npm create fluixi@alpha -- my-app --spa');
      expect(out).not.toContain('SSR only');
    }
    expect(existsSync(join(cwd, 'app'))).toBe(false);
  });
});

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

  it('wires oauth2 into an SPA too: its server half runs on the @fluixi/start server', () => {
    create('--spa', '--auth=oauth2', '--provider=keycloak', '--tokens=server');
    expect(read('src/app.config.server.ts')).toContain('imports: [authServer()]');
    expect(read('fluixi.config.ts')).toContain('ssr: false');
  });

  it('makes an SPA a @fluixi/start app rendered in the browser, listing every runtime package', () => {
    create('--spa');
    const deps = JSON.parse(read('package.json')).dependencies;
    for (const name of ['start', 'core', 'di', 'dom', 'head', 'jsx', 'reactive', 'router', 'server', 'storage']) {
      expect(deps[`@fluixi/${name}`], name).toBe('alpha');
    }
    expect(read('fluixi.config.ts')).toContain('ssr: false');
    expect(existsSync(join(cwd, 'app/vite.config.ts'))).toBe(false);
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

describe('create-fluixi --document', () => {
  it('writes the page shell as src/document.tsx in place of index.html', () => {
    create('--ssr', '--document');
    expect(existsSync(join(cwd, 'app', 'index.html'))).toBe(false);
    const document = read('src/document.tsx');
    expect(document).toContain("import { Html, Head, Main, Scripts } from '@fluixi/start/document';");
    expect(document).toContain('<title>Fluixi Start Example</title>');
    expect(document).toMatch(/<body>\s*<Main \/>\s*<Scripts \/>\s*<\/body>/);
  });

  it('writes src/document.ts with an html template for an html app', () => {
    execFileSync('node', [bin, 'app', '--html', '--ssr', '--no-ui', '--no-css', '--document'], { cwd, input: '', encoding: 'utf8' });
    const document = read('src/document.ts');
    expect(document).toContain("import { html } from '@fluixi/core';");
    expect(document).toMatch(/<\$\{Main\} \/>\s*<\$\{Scripts\} \/>/);
  });

  it('keeps index.html without the flag', () => {
    create('--ssr');
    expect(existsSync(join(cwd, 'app', 'index.html'))).toBe(true);
    expect(existsSync(join(cwd, 'app', 'src', 'document.tsx'))).toBe(false);
  });
});

describe('create-fluixi agent instructions', () => {
  it('points assistants at the rules of the installed packages', () => {
    create('--ssr');
    const guide = read('AGENTS.md');
    expect(guide).toContain('node_modules/@fluixi/core/llms.txt');
    expect(guide).not.toContain('@fluixi-ui/kit/llms.txt');
    expect(guide).toContain('- `npm run dev`');
    expect(read('CLAUDE.md')).toBe('@AGENTS.md\n');
  });

  it('adds the component library rules when it is installed', () => {
    create('--ssr', '--ui');
    expect(read('AGENTS.md')).toContain('node_modules/@fluixi-ui/kit/llms.txt');
  });
});
