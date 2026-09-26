import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { build } from 'vite';
import { isServerOnlyFile, serverOnlyVitePlugin, startsWithUseServer } from './server-only-plugin.js';

let root: string;
afterEach(() => rmSync(root, { recursive: true, force: true }));

function app(files: Record<string, string>): string {
  root = mkdtempSync(join(tmpdir(), 'fluixi-server-only-'));
  for (const [name, code] of Object.entries(files)) {
    mkdirSync(dirname(join(root, name)), { recursive: true });
    writeFileSync(join(root, name), code);
  }
  return root;
}

const bundle = (entry: string, ssr = false, alias: Record<string, string> = {}) =>
  build({
    root,
    logLevel: 'silent',
    configFile: false,
    resolve: { alias: Object.fromEntries(Object.entries(alias).map(([k, v]) => [k, join(root, v)])) },
    plugins: [serverOnlyVitePlugin()],
    build: { write: false, ssr: ssr ? entry : undefined, rollupOptions: ssr ? undefined : { input: join(root, entry) } },
  });

const secret = { 'src/auth.server.ts': 'export const secret = process.env.SESSION_SECRET;' };

describe('client build', () => {
  it('refuses a static import and names both files', async () => {
    app({ ...secret, 'src/main.ts': "import { secret } from './auth.server';\nconsole.log(secret);" });
    await expect(bundle('src/main.ts')).rejects.toThrow(/src\/main\.ts imports src\/auth\.server\.ts into the browser bundle/);
  });

  it('refuses a lazy import, which would still be emitted as a chunk', async () => {
    app({ ...secret, 'src/main.ts': "export const load = () => import('./auth.server.js');" });
    await expect(bundle('src/main.ts')).rejects.toThrow(/auth\.server\.ts into the browser bundle/);
  });

  it('refuses one reached through a barrel, naming the barrel', async () => {
    app({
      ...secret,
      'src/auth/index.ts': "export * from '../auth.server';",
      'src/main.ts': "import * as a from './auth/index';\nconsole.log(a);",
    });
    await expect(bundle('src/main.ts')).rejects.toThrow(/src\/auth\/index\.ts imports src\/auth\.server\.ts/);
  });

  it('refuses one reached through an alias that hides the suffix', async () => {
    app({ ...secret, 'src/main.ts': "import { secret } from '@/secret';\nconsole.log(secret);" });
    await expect(bundle('src/main.ts', false, { '@/secret': 'src/auth.server.ts' })).rejects.toThrow(
      /src\/main\.ts imports src\/auth\.server\.ts into the browser bundle/,
    );
  });

  it('allows a file whose first statement is "use server"', async () => {
    app({
      'src/actions.server.ts': "// server functions\n'use server';\nexport async function save() {}",
      'src/main.ts': "import { save } from './actions.server';\nsave();",
    });
    await expect(bundle('src/main.ts')).resolves.toBeDefined();
  });
});

it('leaves the server build alone', async () => {
  app({ ...secret, 'src/main.ts': "import { secret } from './auth.server';\nexport default secret;" });
  await expect(bundle('src/main.ts', true)).resolves.toBeDefined();
});

describe('startsWithUseServer', () => {
  it('reads past comments and blank lines', () => {
    expect(startsWithUseServer('/** doc */\n// note\n\n"use server";\n')).toBe(true);
  });

  it('does not accept a directive inside a function', () => {
    expect(startsWithUseServer("import x from 'y';\nexport async function f() { 'use server'; }")).toBe(false);
  });
});

describe('isServerOnlyFile', () => {
  it('matches the suffix in app code only', () => {
    expect(isServerOnlyFile('/app/src/auth.server.ts')).toBe(true);
    expect(isServerOnlyFile('/app/src/auth.server.tsx?v=1')).toBe(true);
    expect(isServerOnlyFile('/app/src/server.ts')).toBe(false);
    expect(isServerOnlyFile('/app/src/observer.ts')).toBe(false);
    expect(isServerOnlyFile('/app/node_modules/pkg/x.server.js')).toBe(false);
  });
});
