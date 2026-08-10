/**
 * Deploy adapters for the three hosts that expect a specific output layout.
 *
 * Each one bundles the same generated entry and then writes whatever the platform
 * reads to route a request. What differs is only that layout — the handler, the
 * dispatch order and the render are shared.
 *
 * All three inline the framework: a worker or a serverless function is a file that
 * gets uploaded, not an install, so nothing may be left to resolve at runtime.
 */
import { mkdir, writeFile, readFile, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Adapter, AdapterBuildContext } from '../adapter.js';
import { cloudflareEntry, netlifyEntry, vercelEntry, type EntrySource } from './entry.js';

/** What the generated entry needs to know about this build. */
async function entrySource(ctx: AdapterBuildContext, from: string): Promise<EntrySource> {
  const template = await readFile(join(ctx.clientDir, 'index.html'), 'utf-8');
  const middleware = join(ctx.serverDir, 'middleware.js');
  const rel = (file: string) => {
    // Node resolves a relative specifier against the importer, and the entry is
    // written to `from`; keep it POSIX so the bundler reads it the same on Windows.
    const path = join(ctx.serverDir, file).replace(/\\/g, '/');
    return path.startsWith('/') ? path : `./${path}`;
  };
  return {
    serverEntry: rel('entry-server.js'),
    middleware: existsSync(middleware) ? rel('middleware.js') : null,
    template,
    ssr: ctx.cfg.ssr,
    mountId: ctx.cfg.mountId,
  };
}

/** Nothing to wrap: a fully static SPA has no server entry, and that is not a failure. */
function skipWhenStatic(ctx: AdapterBuildContext, name: string): boolean {
  if (ctx.hasServer) return false;
  console.log(`  fluixi: no server entry — ${name} gets the static output alone.`);
  return true;
}

/**
 * Cloudflare Pages. `_worker.js` at the root of the published directory takes every
 * request; `_routes.json` tells Pages not to invoke it for hashed assets, which is
 * the difference between a CDN hit and a worker invocation per image.
 *
 * Publish `dist/client`.
 */
export const cloudflareAdapter: Adapter = {
  name: 'cloudflare',
  bundle: 'inline',
  serve({ handler }) {
    return { fetch: handler };
  },
  async build(ctx) {
    if (skipWhenStatic(ctx, 'cloudflare')) return;
    const out = join(ctx.clientDir, '_worker.js');
    await ctx.bundleEntry(cloudflareEntry(await entrySource(ctx, out)), out);

    // Everything Vite emitted under /assets is content-hashed and immutable, so it
    // never needs the worker. `_worker.js` itself must be excluded or Pages would
    // route the worker to itself.
    await writeFile(
      join(ctx.clientDir, '_routes.json'),
      JSON.stringify({ version: 1, include: ['/*'], exclude: ['/assets/*', '/_worker.js'] }, null, 2) + '\n',
    );
  },
};

/**
 * Netlify. The function is a v2 fetch handler under `.netlify/functions-internal/`,
 * which is where a framework — as opposed to the user — puts one, so it cannot
 * collide with the app's own `netlify/functions`.
 *
 * Publish `dist/client`.
 */
export const netlifyAdapter: Adapter = {
  name: 'netlify',
  bundle: 'inline',
  serve({ handler }) {
    return { fetch: handler };
  },
  async build(ctx) {
    if (skipWhenStatic(ctx, 'netlify')) return;
    const dir = join(ctx.root, '.netlify', 'functions-internal');
    await mkdir(dir, { recursive: true });
    const out = join(dir, 'fluixi-server.mjs');
    await ctx.bundleEntry(netlifyEntry(await entrySource(ctx, out)), out);

    // v2 functions declare their own routing, but the manifest is what makes Netlify
    // load an internal function at all.
    await writeFile(
      join(dir, 'fluixi-server.json'),
      JSON.stringify({ config: { path: '/*', preferStatic: true }, version: 1 }, null, 2) + '\n',
    );
  },
};

/**
 * Vercel, through the Build Output API v3: `.vercel/output/` is read directly, with
 * no framework detection and no `vercel.json` to keep in sync.
 *
 * `config.json` routes the filesystem first so a prerendered page is served as a
 * file, then sends the rest to the function.
 */
export const vercelAdapter: Adapter = {
  name: 'vercel',
  bundle: 'inline',
  serve({ handler }) {
    return { fetch: handler };
  },
  async build(ctx) {
    const output = join(ctx.root, '.vercel', 'output');
    await mkdir(output, { recursive: true });

    // Static assets and prerendered HTML are served straight from here.
    await cp(ctx.clientDir, join(output, 'static'), { recursive: true });

    if (skipWhenStatic(ctx, 'vercel')) {
      await writeFile(
        join(output, 'config.json'),
        JSON.stringify({ version: 3, routes: [{ handle: 'filesystem' }] }, null, 2) + '\n',
      );
      return;
    }

    const fn = join(output, 'functions', 'index.func');
    await mkdir(fn, { recursive: true });
    const out = join(fn, 'index.mjs');
    await ctx.bundleEntry(vercelEntry(await entrySource(ctx, out)), out);

    await writeFile(
      join(fn, '.vc-config.json'),
      JSON.stringify(
        { runtime: 'nodejs20.x', handler: 'index.mjs', launcherType: 'Nodejs', shouldAddHelpers: false },
        null,
        2,
      ) + '\n',
    );
    await writeFile(
      join(output, 'config.json'),
      JSON.stringify(
        {
          version: 3,
          routes: [
            // A prerendered page or an asset wins; only a miss reaches the function.
            { handle: 'filesystem' },
            { src: '/(.*)', dest: '/index' },
          ],
        },
        null,
        2,
      ) + '\n',
    );
  },
};
