import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { add, channelOf, installCommand } from './add.js';

let root: string;
const put = (rel: string, text: string) => {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), text);
};
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');
// The scaffold's config: no env block yet.
const CONFIG = `import { defineConfig } from '@fluixi/start/config';\n\nexport default defineConfig({\n  port: 3000,\n});\n`;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'fx-add-'));
  put('package.json', '{ "name": "app" }');
  put('tsconfig.json', '{ "compilerOptions": { "jsx": "preserve" } }');
  put('fluixi.config.ts', CONFIG);
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('fluixi add auth', () => {
  it('wires oauth2 from flags, giving a config with no env block one', async () => {
    await add('auth', ['auth', 'oauth2', '--provider', 'keycloak', '--tokens', 'server', '--no-install'], root);

    expect(read('fluixi.config.ts')).toBe(
      `import { defineConfig } from '@fluixi/start/config';\n\nexport default defineConfig({\n  env: {\n    public: [\n` +
        `      'AUTH_PROVIDER',\n      'AUTH_CLIENT_ID',\n      'AUTH_TOKENS',\n      'AUTH_BASE_URL',\n      'AUTH_REALM',\n      'APP_URL',\n` +
        `    ],\n  },\n  port: 3000,\n});\n`,
    );
    expect(read('src/services/auth.ts')).toContain(`tokens: 'server'`);
    expect(read('src/app.config.server.ts')).toContain('imports: [authServer()]');
    expect(read('.env.example')).toMatch(/^AUTH_REALM=master$/m);
    // --no-install leaves package.json alone.
    expect(read('package.json')).toBe('{ "name": "app" }');
  });

  it('reads a provider given without the kind, and defaults to oauth2 when nobody can be asked', async () => {
    await add('auth', ['auth', '--provider', 'google', '--no-install'], root);
    expect(read('src/services/auth.ts')).toContain(`tokens: 'server'`);
    expect(read('.env.example')).toMatch(/^AUTH_PROVIDER=google$/m);
  });

  it('refuses a provider that cannot keep tokens in the browser, writing nothing', async () => {
    const code = process.exitCode;
    await add('auth', ['auth', 'oauth2', '--provider', 'dex', '--tokens', 'browser', '--no-install'], root);
    expect(process.exitCode).toBe(1);
    process.exitCode = code;
    expect(existsSync(join(root, 'src'))).toBe(false);
  });

  it('sets up better-auth', async () => {
    await add('auth', ['auth', 'better-auth', '--no-install'], root);
    expect(read('src/api/auth/[...all].ts')).toContain(`import '../../auth.config.js';`);
    expect(read('src/middleware.ts')).toContain('authMiddleware()');
  });
});

describe('installing', () => {
  it('uses the package manager the lockfile names', () => {
    expect(installCommand(root, ['a@1'])).toEqual(['npm', ['install', 'a@1']]);
    put('pnpm-lock.yaml', '');
    expect(installCommand(root, ['a@1'])).toEqual(['pnpm', ['add', 'a@1']]);
  });

  it('takes the dist-tag from the installed framework', () => {
    expect(channelOf(root)).toBe('alpha');
    put('node_modules/@fluixi/start/package.json', '{ "version": "0.1.0-beta.3" }');
    expect(channelOf(root)).toBe('beta');
    put('node_modules/@fluixi/start/package.json', '{ "version": "1.2.0" }');
    expect(channelOf(root)).toBe('latest');
  });
});
