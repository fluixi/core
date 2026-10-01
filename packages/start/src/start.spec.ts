import { describe, it, expect, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { defineConfig, resolveConfig, loadConfig } from './config.js';
import { injectApp, injectAppAndHead, splitTemplate } from './internal.js';
import { encodeHeadMarker } from '@fluixi/head';
import { streamDocument } from './handler.js';
import {
  defineMiddleware,
  composeMiddleware,
  normalizeMiddleware,
  type Middleware,
} from './middleware.js';

const streamOf = (s: string) =>
  new ReadableStream<Uint8Array>({
    start(c) { c.enqueue(new TextEncoder().encode(s)); c.close(); },
  });

// Temp config dirs live INSIDE the package: vitest's vite-node only loads files
// under the project root, and `loadConfig` import()s the config by absolute path.
// Inside the package, where the test runner will import from, but outside src/: a folder
// there is part of the typecheck, and tsc run in parallel with these tests failed on one it
// listed and then found deleted. `tmp/` is gitignored.
const baseDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'tmp');
mkdirSync(baseDir, { recursive: true });

describe('@fluixi/start config', () => {
  it('defineConfig is identity', () => {
    const c = { port: 4000 };
    expect(defineConfig(c)).toBe(c);
  });

  it('resolveConfig applies the conventional defaults', () => {
    const c = resolveConfig();
    expect(c.port).toBe(3000);
    expect(c.serverEntry).toBe('src/entry-server.ts');
    expect(c.clientEntry).toBe('src/entry-client.ts');
    expect(c.template).toBe('index.html');
    expect(c.mountId).toBe('root');
    expect(c.ssrNoExternal).toEqual([]);
    expect(c.root).toBe(process.cwd());
  });

  it('resolveConfig keeps overrides', () => {
    const c = resolveConfig({ port: 3010, mountId: 'app', ssrNoExternal: ['x'] });
    expect(c.port).toBe(3010);
    expect(c.mountId).toBe('app');
    expect(c.ssrNoExternal).toEqual(['x']);
  });
});

describe('@fluixi/start loadConfig', () => {
  const dirs: string[] = [];
  function makeDir(files: Record<string, string>): string {
    const dir = mkdtempSync(join(baseDir, 'fluixi-cfg-'));
    dirs.push(dir);
    for (const [name, content] of Object.entries(files)) {
      writeFileSync(join(dir, name), content);
    }
    return dir;
  }
  afterEach(() => {
    while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
  });

  it('returns {} when no config file exists', async () => {
    const dir = makeDir({});
    expect(await loadConfig(dir)).toEqual({});
  });

  it('loads a plain .mjs config', async () => {
    const dir = makeDir({ 'fluixi.config.mjs': `export default { port: 4100 };` });
    expect((await loadConfig(dir)).port).toBe(4100);
  });

  it('loads a TypeScript config (strips TS-only syntax)', async () => {
    const dir = makeDir({
      'fluixi.config.ts': [
        `interface Cfg { port: number }`,
        `const c: Cfg = { port: 4123 };`,
        `export default { port: c.port, routesDir: 'src/pages' as string };`,
      ].join('\n'),
    });
    const cfg = await loadConfig(dir);
    expect(cfg.port).toBe(4123);
    expect(cfg.routesDir).toBe('src/pages');
  });

  it('bundles relative imports in a TS config and leaves no temp files', async () => {
    const dir = makeDir({
      '_routes.ts': `export const ROUTES = 'src/views';`,
      'fluixi.config.ts': [
        `import { ROUTES } from './_routes.js';`,
        `export default { routesDir: ROUTES, port: 4200 as const };`,
      ].join('\n'),
    });
    const cfg = await loadConfig(dir);
    expect(cfg.routesDir).toBe('src/views');
    expect(cfg.port).toBe(4200);
    // the temp `.timestamp-*.mjs` is cleaned up
    expect(readdirSync(dir).some((f) => f.includes('.timestamp-'))).toBe(false);
  });

  it('prefers .ts over .mjs when both exist', async () => {
    const dir = makeDir({
      'fluixi.config.ts': `export default { port: 1 };`,
      'fluixi.config.mjs': `export default { port: 2 };`,
    });
    expect((await loadConfig(dir)).port).toBe(1);
  });
});

describe('@fluixi/start injectApp', () => {
  it('injects into the mount div', () => {
    expect(injectApp('<body><div id="root"></div></body>', 'APP')).toBe(
      '<body><div id="root">APP</div></body>',
    );
  });

  it('respects a custom mountId', () => {
    expect(injectApp('<div id="app"></div>', 'APP', 'app')).toBe('<div id="app">APP</div>');
  });

  it('falls back to the ssr-outlet marker', () => {
    expect(injectApp('<body><!--ssr-outlet--></body>', 'APP')).toBe('<body>APP</body>');
  });

  it('falls back to before </body>', () => {
    expect(injectApp('<body></body>', 'APP')).toBe('<body><div id="root">APP</div></body>');
  });
});

describe('@fluixi/start injectAppAndHead', () => {
  const tpl = '<html lang="en"><head><title>Old</title></head><body><div id="root"></div></body></html>';

  it('lifts the head marker into <head> + <html>, dropping the template title', () => {
    const marker = encodeHeadMarker({
      headHtml: '<title data-fh>P</title><meta name="description" content="d" data-fh>',
      htmlAttrs: { lang: 'fr' },
    });
    const html = injectAppAndHead(tpl, marker + 'APP');
    expect(html).toContain('<html lang="fr">');
    expect(html).not.toContain('<title>Old</title>');
    expect(html).toContain('<title data-fh>P</title>');
    expect(html).toContain('name="description"');
    expect(html).toContain('<div id="root">APP</div>');
  });

  it('equals injectApp when there is no head marker', () => {
    expect(injectAppAndHead('<body><div id="root"></div></body>', 'APP')).toBe(
      '<body><div id="root">APP</div></body>',
    );
  });
});

describe('@fluixi/start middleware', () => {
  const req = () => new Request('http://x/admin');
  const core = async () => new Response('RENDERED', { status: 200 });

  it('defineMiddleware normalizes single + array', () => {
    const a: Middleware = (_r, n) => n();
    expect(defineMiddleware(a)).toEqual([a]);
    expect(defineMiddleware([a, a])).toHaveLength(2);
  });

  it('normalizeMiddleware reads the default export (array / fn / none)', () => {
    const a: Middleware = (_r, n) => n();
    expect(normalizeMiddleware({ default: [a] })).toEqual([a]);
    expect(normalizeMiddleware({ default: a })).toEqual([a]);
    expect(normalizeMiddleware({ default: undefined })).toEqual([]);
    expect(normalizeMiddleware(null)).toEqual([]);
  });

  it('empty chain returns the core handler unchanged', () => {
    expect(composeMiddleware([], core)).toBe(core);
  });

  it('runs middleware in order, then the core', async () => {
    const order: string[] = [];
    const mw: Middleware[] = [
      async (_r, next) => { order.push('a:before'); const res = await next(); order.push('a:after'); return res; },
      async (_r, next) => { order.push('b:before'); const res = await next(); order.push('b:after'); return res; },
    ];
    const res = await composeMiddleware(mw, async () => { order.push('core'); return core(req()); })(req());
    expect(await res.text()).toBe('RENDERED');
    expect(order).toEqual(['a:before', 'b:before', 'core', 'b:after', 'a:after']);
  });

  it('short-circuits without calling the core (guard/redirect)', async () => {
    let coreRan = false;
    const redirect: Middleware = () => new Response(null, { status: 302, headers: { location: '/login' } });
    const res = await composeMiddleware([redirect], async () => { coreRan = true; return core(req()); })(req());
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/login');
    expect(coreRan).toBe(false);
  });

  it('can adjust the downstream response (add a header)', async () => {
    const addHeader: Middleware = async (_r, next) => {
      const res = await next();
      res.headers.set('x-powered-by', 'fluixi');
      return res;
    };
    const res = await composeMiddleware([addHeader], core)(req());
    expect(res.headers.get('x-powered-by')).toBe('fluixi');
    expect(await res.text()).toBe('RENDERED');
  });

  it('rejects if a middleware calls next() twice', async () => {
    const bad: Middleware = async (_r, next) => { await next(); return next(); };
    await expect(composeMiddleware([bad], core)(req())).rejects.toThrow(/more than once/);
  });
});

describe('@fluixi/start streaming', () => {
  const doc = '<html><head><title>Default</title></head><body><div id="root">';
  const marker = encodeHeadMarker({ headHtml: '<title>Sign in</title>', htmlAttrs: { lang: 'fr' } });
  const chunks = (...parts: (string | Uint8Array)[]) =>
    new ReadableStream<Uint8Array>({
      start(c) {
        for (const p of parts) c.enqueue(typeof p === 'string' ? new TextEncoder().encode(p) : p);
        c.close();
      },
    });
  const text = (res: Response) => res.text();

  it("puts seo()'s title in the streamed head, not the template's", async () => {
    const html = await text(await streamDocument(doc, chunks(marker + '<p>app</p>'), '</div></body></html>'));
    expect(html).toContain('<head><title>Sign in</title></head>');
    expect(html).toContain('<html lang="fr">');
    expect(html).not.toContain('<!--fh:');
    expect(html).toContain('<div id="root"><p>app</p></div>');
  });

  it('finds a marker split across chunks', async () => {
    const cut = 12;
    const html = await text(await streamDocument(doc, chunks(marker.slice(0, 3), marker.slice(3, cut), marker.slice(cut) + 'x'), ''));
    expect(html).toContain('<title>Sign in</title>');
    expect(html.endsWith('<div id="root">x')).toBe(true);
  });

  it('leaves a body without a marker untouched, a split multibyte character included', async () => {
    const e = new TextEncoder().encode('é'); // two bytes
    const html = await text(await streamDocument(doc, chunks('<p>caf', e.subarray(0, 1), e.subarray(1), '</p>'), ''));
    expect(html).toBe(doc + '<p>café</p>');
  });

  it('still sends the document when the body is empty (a failed render)', async () => {
    expect(await text(await streamDocument(doc, chunks(), '</div>'))).toBe(doc + '</div>');
  });

  it('splits at the mount div (head ends with open tag, tail starts with close)', () => {
    const { head, tail } = splitTemplate('<body><div id="root"></div><script src="/c.js"></script></body>');
    expect(head).toBe('<body><div id="root">');
    expect(tail).toBe('</div><script src="/c.js"></script></body>');
  });

  it('splits at a custom mountId', () => {
    const { head, tail } = splitTemplate('<div id="app"></div>', 'app');
    expect(head).toBe('<div id="app">');
    expect(tail).toBe('</div>');
  });

  it('splits at the <!--ssr-outlet--> marker (no wrapping div)', () => {
    const { head, tail } = splitTemplate('<body><!--ssr-outlet--></body>');
    expect(head).toBe('<body>');
    expect(tail).toBe('</body>');
  });

  it('falls back to before </body>', () => {
    const { head, tail } = splitTemplate('<body>x</body>');
    expect(head).toBe('<body>x<div id="root">');
    expect(tail).toBe('</div></body>');
  });

  it('re-injecting split parts equals injectApp', () => {
    const tpl = '<html><body><div id="root"></div><script src="/c.js"></script></body></html>';
    const { head, tail } = splitTemplate(tpl);
    expect(head + 'APP' + tail).toBe(injectApp(tpl, 'APP'));
  });

  it('streamDocument flushes head, pipes body, then tail (200, text/html)', async () => {
    const res = await streamDocument('<head></head><div id="root">', streamOf('BODY'), '</div></body>');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(await res.text()).toBe('<head></head><div id="root">BODY</div></body>');
  });

  it('streamDocument rejects when the body fails before the head goes out', async () => {
    const bad = new ReadableStream<Uint8Array>({ start(c) { c.error(new Error('boom')); } });
    await expect(streamDocument('<head>', bad, '</body>')).rejects.toThrow('boom');
  });

  it('streamDocument errors the stream when the body fails after the head', async () => {
    const late = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new TextEncoder().encode('<p>first</p>'));
        setTimeout(() => c.error(new Error('late')), 0);
      },
    });
    const res = await streamDocument('<head>', late, '</body>');
    await expect(res.text()).rejects.toThrow();
  });
});
