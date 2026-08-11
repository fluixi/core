/**
 * What each platform reads to route a request.
 *
 * The handler is shared and tested elsewhere; what is specific to a deploy target
 * is the layout on disk, and getting that wrong fails at deploy time rather than
 * here. So these assert the files, their locations, and the routing they declare.
 *
 * `bundleEntry` is stubbed: bundling is Vite's job and slow, and what matters is
 * that each adapter asks for its entry in the right place with the right shape.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cloudflareAdapter, netlifyAdapter, vercelAdapter } from './platforms.js';
import { resolveConfig } from '../config.js';
import type { AdapterBuildContext } from '../adapter.js';

const read = (file: string) => readFileSync(file, 'utf-8');
const readJson = (file: string) => JSON.parse(read(file));

/** A finished `fluixi build`: client assets, a prerendered page, a server entry. */
function buildOutput({ hasServer = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'fx-deploy-'));
  const clientDir = join(root, 'dist/client');
  const serverDir = join(root, 'dist/server');
  mkdirSync(join(clientDir, 'assets'), { recursive: true });
  mkdirSync(serverDir, { recursive: true });
  writeFileSync(join(clientDir, 'index.html'), '<!doctype html><div id="root"></div>');
  writeFileSync(join(clientDir, 'assets', 'app-abc123.js'), 'console.log(1)');
  if (hasServer) writeFileSync(join(serverDir, 'entry-server.js'), 'export const render = () => "";');

  const entries: Array<{ source: string; outFile: string }> = [];
  const ctx: AdapterBuildContext = {
    cfg: resolveConfig({ root }),
    root,
    clientDir,
    serverDir,
    hasServer,
    async bundleEntry(source, outFile) {
      entries.push({ source, outFile });
      mkdirSync(join(outFile, '..'), { recursive: true });
      writeFileSync(outFile, source);
    },
  };
  return { root, clientDir, serverDir, ctx, entries };
}

describe('cloudflare', () => {
  it('puts the worker in the published directory', async () => {
    const { clientDir, ctx, entries } = buildOutput();
    await cloudflareAdapter.build!(ctx);

    expect(entries[0].outFile).toBe(join(clientDir, '_worker.js'));
    // Pages stops serving assets itself in advanced mode, so the worker has to.
    expect(entries[0].source).toContain('env.ASSETS');
    expect(entries[0].source).toContain('export default');
  });

  it('keeps the worker off hashed assets, and off itself', async () => {
    const { clientDir, ctx } = buildOutput();
    await cloudflareAdapter.build!(ctx);

    const routes = readJson(join(clientDir, '_routes.json'));
    expect(routes.include).toEqual(['/*']);
    // Without the second entry Pages would route the worker to itself.
    expect(routes.exclude).toContain('/assets/*');
    expect(routes.exclude).toContain('/_worker.js');
  });

  it('excludes prerendered pages, so serving a file does not cost an invocation', async () => {
    const { clientDir, ctx } = buildOutput();
    mkdirSync(join(clientDir, 'v1/en/async'), { recursive: true });
    mkdirSync(join(clientDir, 'about'), { recursive: true });
    writeFileSync(join(clientDir, 'v1/en/async/index.html'), '<html>');
    writeFileSync(join(clientDir, 'about/index.html'), '<html>');
    await cloudflareAdapter.build!(ctx);

    const { exclude } = readJson(join(clientDir, '_routes.json'));
    expect(exclude).toContain('/v1/en/async');
    expect(exclude).toContain('/about');
    // `index.html` here is the shell, not a page: excluding `/` would publish an
    // empty mount element as the home page.
    expect(exclude).not.toContain('/');
  });

  it('serves a prerendered home page as a file', async () => {
    const { clientDir, ctx, entries } = buildOutput();
    writeFileSync(join(clientDir, 'index.html'), '<!doctype html><div id="root"><h1>home</h1></div>');
    await cloudflareAdapter.build!(ctx);

    // The same file means two different things depending on what is inside the mount
    // element, and only one of them is the platform's to serve.
    expect(readJson(join(clientDir, '_routes.json')).exclude).toContain('/');
    expect(entries[0].source).toContain('"/"');
  });

  it('asks the ASSETS binding only about what is static', async () => {
    const { clientDir, ctx, entries } = buildOutput();
    mkdirSync(join(clientDir, 'about'), { recursive: true });
    writeFileSync(join(clientDir, 'about/index.html'), '<html>');
    await cloudflareAdapter.build!(ctx);

    // ASSETS answers `/` with index.html whether or not it is a page, so an
    // unconditional lookup is what costs an SSR app its home page. The worker asks
    // only about a prerendered path or a path with a file extension.
    const { source } = entries[0];
    expect(source).toContain('const prerendered = new Set(["/about"])');
    expect(source).toContain('prerendered.has(pathname) || /\\.[^/]+$/.test(pathname)');
  });

  it('stops at Cloudflare\'s rule limit rather than emitting an invalid file', async () => {
    const { clientDir, ctx } = buildOutput();
    for (let i = 0; i < 120; i++) {
      mkdirSync(join(clientDir, `p${i}`), { recursive: true });
      writeFileSync(join(clientDir, `p${i}/index.html`), '<html>');
    }
    await cloudflareAdapter.build!(ctx);

    const { exclude } = readJson(join(clientDir, '_routes.json'));
    expect(exclude.length).toBeLessThanOrEqual(100);
    // Past the cap the extra routes still work — they just wake the worker.
    expect(exclude).toContain('/assets/*');
  });

  it('inlines the template — a worker cannot read index.html', async () => {
    const { ctx, entries } = buildOutput();
    await cloudflareAdapter.build!(ctx);
    expect(entries[0].source).toContain('<div id=\\"root\\"></div>');
  });
});

describe('netlify', () => {
  it('writes an internal function, out of the app\'s own functions directory', async () => {
    const { root, ctx, entries } = buildOutput();
    await netlifyAdapter.build!(ctx);

    const dir = join(root, '.netlify/functions-internal');
    expect(entries[0].outFile).toBe(join(dir, 'fluixi-server.mjs'));
    expect(existsSync(join(dir, 'fluixi-server.json'))).toBe(true);
  });

  it('claims every route but lets a static file win', async () => {
    const { root, ctx, entries } = buildOutput();
    await netlifyAdapter.build!(ctx);

    expect(entries[0].source).toContain("config = { path: '/*', preferStatic: true }");
    const manifest = readJson(join(root, '.netlify/functions-internal/fluixi-server.json'));
    expect(manifest.config.path).toBe('/*');
    expect(manifest.config.preferStatic).toBe(true);
  });

  it('forces `/` to the function, which a static file would otherwise win', async () => {
    const { clientDir, ctx } = buildOutput();
    await netlifyAdapter.build!(ctx);

    // `preferStatic` is right for every path except this one, where the file is the
    // shell. A forced redirect is what the CDN honours over a file.
    expect(read(join(clientDir, '_redirects'))).toContain('/  /.netlify/functions/fluixi-server  200!');
  });

  it('leaves a prerendered home page alone', async () => {
    const { clientDir, ctx } = buildOutput();
    writeFileSync(join(clientDir, 'index.html'), '<!doctype html><div id="root"><h1>home</h1></div>');
    await netlifyAdapter.build!(ctx);

    expect(existsSync(join(clientDir, '_redirects'))).toBe(false);
  });

  it('keeps an app\'s own redirects ahead of ours', async () => {
    const { clientDir, ctx } = buildOutput();
    writeFileSync(join(clientDir, '_redirects'), '/old  /new  301');
    await netlifyAdapter.build!(ctx);

    const rules = read(join(clientDir, '_redirects')).trim().split('\n');
    expect(rules[0]).toBe('/old  /new  301');
    expect(rules[1]).toContain('fluixi-server');
  });
});

describe('vercel', () => {
  it('lays out the build output API', async () => {
    const { root, ctx, entries } = buildOutput();
    await vercelAdapter.build!(ctx);

    const out = join(root, '.vercel/output');
    expect(read(join(out, 'static/assets/app-abc123.js'))).toBe('console.log(1)');
    expect(entries[0].outFile).toBe(join(out, 'functions/index.func/index.mjs'));

    const fn = readJson(join(out, 'functions/index.func/.vc-config.json'));
    expect(fn.handler).toBe('index.mjs');
    expect(fn.runtime).toMatch(/^nodejs/);
  });

  it('serves a prerendered page as a file before reaching the function', async () => {
    const { root, ctx } = buildOutput();
    await vercelAdapter.build!(ctx);

    const config = readJson(join(root, '.vercel/output/config.json'));
    expect(config.version).toBe(3);
    // Order is the contract: filesystem before the catch-all, or every prerendered
    // page would be re-rendered by the function on every request. `/` is claimed
    // ahead of it because the file sitting there is the shell.
    expect(config.routes[0]).toEqual({ src: '/', dest: '/index' });
    expect(config.routes[1]).toEqual({ handle: 'filesystem' });
    expect(config.routes[2]).toEqual({ src: '/(.*)', dest: '/index' });
  });

  it('speaks the launcher\'s signature, not the handler\'s', async () => {
    const { ctx, entries } = buildOutput();
    await vercelAdapter.build!(ctx);

    // The Nodejs launcher calls the export as `(req, res)`. Exporting a fetch handler
    // reads correctly and hangs: nothing ever writes a response.
    expect(entries[0].source).toContain('export default async (req, res) =>');
    expect(entries[0].source).toContain('res.end()');
  });

  it('leaves a prerendered home page to the filesystem', async () => {
    const { root, clientDir, ctx } = buildOutput();
    writeFileSync(join(clientDir, 'index.html'), '<!doctype html><div id="root"><h1>home</h1></div>');
    await vercelAdapter.build!(ctx);

    const config = readJson(join(root, '.vercel/output/config.json'));
    expect(config.routes[0]).toEqual({ handle: 'filesystem' });
  });

  it('emits static-only output for an app with no server entry', async () => {
    const { root, ctx, entries } = buildOutput({ hasServer: false });
    await vercelAdapter.build!(ctx);

    expect(entries).toHaveLength(0);
    expect(existsSync(join(root, '.vercel/output/functions'))).toBe(false);
    const config = readJson(join(root, '.vercel/output/config.json'));
    expect(config.routes).toEqual([{ handle: 'filesystem' }]);
  });
});

describe('every deploy adapter', () => {
  const all = [cloudflareAdapter, netlifyAdapter, vercelAdapter];

  it('inlines the framework — none of these can resolve a module at runtime', () => {
    for (const adapter of all) expect(adapter.bundle).toBe('inline');
  });

  it('exposes a fetch handler rather than listening on a port', () => {
    for (const adapter of all) {
      const served = adapter.serve({ handler: (async () => new Response('')) as never, cfg: {} as never, clientDir: '' });
      expect(served).toHaveProperty('fetch');
    }
  });

  it('does nothing but the static output when there is no server', async () => {
    for (const adapter of all) {
      const { entries, ctx } = buildOutput({ hasServer: false });
      await adapter.build!(ctx);
      expect(entries).toHaveLength(0);
    }
  });
});
