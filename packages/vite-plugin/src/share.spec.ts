/**
 * `share()` against real Vite builds: a shared module is one chunk, whole, that both the app
 * and the import map point to.
 */
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { build, type InlineConfig } from 'vite';
import { share } from './share.js';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'fluixi-share-'));
  // A "package" with an export the app never uses, which the shared chunk must keep.
  writeFileSync(join(root, 'lib.js'), "export const used = 'LIB_USED';\nexport const unused = 'LIB_UNUSED';\n");
  writeFileSync(join(root, 'main.js'), "import { used } from 'shared-lib';\ndocument.title = used;\n");
  writeFileSync(
    join(root, 'index.html'),
    '<!doctype html><html><head><title>t</title></head><body><script type="module" src="/main.js"></script></body></html>',
  );
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

const config = (over: InlineConfig = {}): InlineConfig => ({
  root,
  logLevel: 'silent',
  resolve: { alias: { 'shared-lib': join(root, 'lib.js') } },
  plugins: [share({ modules: ['shared-lib'] })],
  build: { outDir: join(root, 'dist'), emptyOutDir: true, minify: false },
  ...over,
});

const read = (file: string) => readFileSync(join(root, 'dist', file), 'utf8');

describe('share() in a browser build', () => {
  it('writes an import map naming one chunk per shared module', async () => {
    await build(config());
    const { imports } = JSON.parse(read('share.json'));
    expect(Object.keys(imports)).toEqual(['shared-lib']);
    expect(imports['shared-lib']).toMatch(/^\/assets\/.+\.js$/);
    expect(existsSync(join(root, 'dist', imports['shared-lib']))).toBe(true);
  });

  it('keeps every export of a shared module, used by the app or not', async () => {
    await build(config());
    const { imports } = JSON.parse(read('share.json'));
    const mod = await import(pathToFileURL(join(root, 'dist', imports['shared-lib'])).href);
    expect(mod).toMatchObject({ used: 'LIB_USED', unused: 'LIB_UNUSED' });
  });

  it('leaves one copy of the shared module, which the app and the import map both reach', async () => {
    await build(config());
    // The module's code may sit in the shared chunk or in a common chunk the shared one
    // re-exports; either way there is exactly one, so the app and a plugin share its state.
    const scripts = readdirSync(join(root, 'dist', 'assets')).filter((f) => f.endsWith('.js'));
    const copies = scripts.filter((f) => read(`assets/${f}`).includes('LIB_USED'));
    expect(copies).toHaveLength(1);
    const { imports } = JSON.parse(read('share.json'));
    const shared = read(imports['shared-lib'].replace(/^\//, ''));
    const app = scripts.filter((f) => read(`assets/${f}`).includes('document.title')).map((f) => read(`assets/${f}`)).join('\n');
    for (const code of [shared, app]) expect(code === read(`assets/${copies[0]}`) || code.includes(copies[0]!)).toBe(true);
  });

  it('puts the import map first in <head>, before any module script', async () => {
    await build(config());
    const html = read('index.html');
    const map = html.indexOf('<script type="importmap">');
    expect(map).toBeGreaterThan(-1);
    expect(map).toBeLessThan(html.indexOf('<script type="module"'));
    const inline = JSON.parse(html.slice(html.indexOf('>', map) + 1, html.indexOf('</script>', map)));
    expect(inline).toEqual(JSON.parse(read('share.json')));
  });

  it('addresses chunks under the deployment base', async () => {
    await build(config({ base: '/static/app/' }));
    expect(JSON.parse(read('share.json')).imports['shared-lib']).toMatch(/^\/static\/app\/assets\//);
  });

  it('refuses two ids that would share a chunk name', () => {
    expect(() => share({ modules: ['@a/b-c', '@a/b/c'] })).toThrow(/same chunk name/);
  });
});

describe('share() in a server build', () => {
  it('writes no import map and no extra chunk', async () => {
    writeFileSync(join(root, 'server.js'), "import { used } from 'shared-lib';\nexport const render = () => used;\n");
    await build(config({ build: { outDir: join(root, 'dist'), emptyOutDir: true, ssr: join(root, 'server.js') } }));
    expect(existsSync(join(root, 'dist', 'share.json'))).toBe(false);
    expect(readdirSync(join(root, 'dist')).filter((f) => /share|shared-lib/.test(f))).toEqual([]);
  });
});
