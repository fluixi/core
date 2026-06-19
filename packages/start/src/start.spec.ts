import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { defineConfig, resolveConfig, loadConfig } from './config.js';
import { injectApp } from './internal.js';
import {
  defineMiddleware,
  composeMiddleware,
  normalizeMiddleware,
  type Middleware,
} from './middleware.js';

// Temp config dirs live INSIDE the package — vitest's vite-node only loads files
// under the project root, and `loadConfig` import()s the config by absolute path.
const baseDir = dirname(fileURLToPath(import.meta.url));

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
