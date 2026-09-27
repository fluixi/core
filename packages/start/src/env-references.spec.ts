import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { build } from 'vite';
import { envReferencesVitePlugin } from './env-references.js';

let root: string;
afterEach(() => rmSync(root, { recursive: true, force: true }));

function app(source: string): void {
  root = mkdtempSync(join(tmpdir(), 'fluixi-env-refs-'));
  const file = join(root, 'src/main.ts');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, source);
}

const bundle = (declared: string[], ssr = false) =>
  build({
    root,
    logLevel: 'silent',
    configFile: false,
    plugins: [envReferencesVitePlugin({ root, env: { public: declared } } as never)],
    build: {
      write: false,
      ssr: ssr ? 'src/main.ts' : undefined,
      rollupOptions: { input: join(root, 'src/main.ts'), external: ['@fluixi/start/env'] },
    },
  });

const header = "import { publicEnv } from '@fluixi/start/env';\n";

describe('a read the browser cannot satisfy', () => {
  it('refuses publicEnv().X, naming the file, the line and the variable', async () => {
    app(header + '\nexport const url = publicEnv().API_URL;\nexport const key = publicEnv().SESSION_KEY;\n');
    await expect(bundle(['API_URL'])).rejects.toThrow(/main\.ts: line 4 reads SESSION_KEY from publicEnv\(\)/);
  });

  it("refuses publicEnv()['X']", async () => {
    app(header + "export const key = publicEnv()['SESSION_KEY'];\n");
    await expect(bundle(['API_URL'])).rejects.toThrow(/reads SESSION_KEY/);
  });

  it('refuses a destructured name', async () => {
    app(header + 'const { API_URL, TYPO_URL } = publicEnv();\nexport { API_URL, TYPO_URL };\n');
    await expect(bundle(['API_URL'])).rejects.toThrow(/reads TYPO_URL/);
  });

  it('refuses a read through a name bound to publicEnv()', async () => {
    app(header + 'const env = publicEnv();\nexport const secret = env.CLIENT_SECRET;\n');
    await expect(bundle(['API_URL'])).rejects.toThrow(/reads CLIENT_SECRET/);
  });

  it('follows publicEnv imported under another name', async () => {
    app("import { publicEnv as pe } from '@fluixi/start/env';\nexport const x = pe().NOPE;\n");
    await expect(bundle(['API_URL'])).rejects.toThrow(/reads NOPE/);
  });
});

describe('what it leaves alone', () => {
  it('passes declared names and VITE_ names', async () => {
    app(header + 'const { API_URL } = publicEnv();\nexport const both = [API_URL, publicEnv().VITE_LEGACY];\n');
    await expect(bundle(['API_URL'])).resolves.toBeDefined();
  });

  it('passes a key computed at run time, which cannot be known', async () => {
    app(header + 'export const read = (k: string) => publicEnv()[k];\n');
    await expect(bundle(['API_URL'])).resolves.toBeDefined();
  });

  it('does not check the server build, where every variable is readable', async () => {
    app(header + 'export const key = publicEnv().SESSION_KEY;\n');
    await expect(bundle(['API_URL'], true)).resolves.toBeDefined();
  });

  it('is off for an app that declares no env.public', async () => {
    app(header + 'export const key = publicEnv().ANYTHING;\n');
    await expect(bundle([])).resolves.toBeDefined();
  });

  it('ignores a publicEnv that is not the framework one', async () => {
    app('const publicEnv = () => ({ X: 1 });\nexport const x = publicEnv().X;\n');
    await expect(bundle(['API_URL'])).resolves.toBeDefined();
  });
});
