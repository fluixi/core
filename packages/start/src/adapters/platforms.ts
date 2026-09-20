/**
 * Deploy adapters for the three hosts that expect a specific output layout.
 *
 * Each one bundles the same generated entry and then writes whatever the platform
 * reads to route a request. What differs is only that layout, the handler, the
 * dispatch order and the render are shared.
 *
 * All three inline the framework: a worker or a serverless function is a file that
 * gets uploaded, not an install, so nothing may be left to resolve at runtime.
 */
import { mkdir, writeFile, readFile, cp, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { readTemplate, type Adapter, type AdapterBuildContext } from '../adapter.js';
import { cloudflareEntry, netlifyEntry, vercelEntry, type EntrySource } from './entry.js';

/** What the generated entry needs to know about this build. */
async function entrySource(
  ctx: AdapterBuildContext,
  from: string,
  prerendered: string[],
): Promise<EntrySource> {
  const template = await readTemplate(ctx.clientDir, ctx.serverDir);
  // Written by the build from Vite's SSR manifest; absent for an app with no file routes.
  const assetFile = join(ctx.serverDir, 'route-assets.json');
  const routeAssets = existsSync(assetFile) ? JSON.parse(await readFile(assetFile, 'utf-8')) : {};
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
    prerendered,
    routeAssets,
  };
}

/**
 * Is `dist/client/index.html` a page, or the shell the server renders into?
 *
 * Vite writes the shell at the path a prerendered `/` would occupy, and every one of
 * these platforms serves a matching file before invoking anything, so `/` is the one
 * route an SSR app cannot render, and the CDN answers it with an empty mount element.
 * No other route is affected: nothing exists at `/about` unless it was prerendered.
 */
function indexIsPage(template: string, mountId: string): boolean {
  const mount = new RegExp(`<([a-z-]+)[^>]*\\sid=["']${mountId}["'][^>]*>`, 'i').exec(template);
  if (!mount) return false;
  return !template.slice(mount.index + mount[0].length).trimStart().startsWith('</');
}

/** Nothing to wrap: a fully static SPA has no server entry, and that is not a failure. */
function skipWhenStatic(ctx: AdapterBuildContext, name: string): boolean {
  if (ctx.hasServer) return false;
  console.log(`  fluixi: no server entry — ${name} gets the static output alone.`);
  return true;
}

/**
 * Add a rule to `_redirects` without taking the file over. Apps ship their own (the
 * docs site redirects `/` to its default locale), so ours goes last, first match
 * wins, so the app's rules are reached first.
 */
async function appendRedirect(clientDir: string, rule: string): Promise<void> {
  const file = join(clientDir, '_redirects');
  const existing = await readFile(file, 'utf-8').catch(() => '');
  if (existing.includes(rule)) return;
  const separator = existing && !existing.endsWith('\n') ? '\n' : '';
  await writeFile(file, `${existing}${separator}${rule}\n`);
}

/**
 * A SPA routes in the browser, but a cold request for `/settings/profile` finds no
 * file, so the host has to hand back the shell for anything it cannot match.
 *
 * Cloudflare Pages already does this for a project with no `_worker.js` (checked on a
 * deployed build), so its adapter writes nothing. Netlify and Vercel both 404.
 */
const SPA_FALLBACK = '/*  /index.html  200';

/** Cloudflare caps `_routes.json` at 100 rules. */
const CF_MAX_RULES = 100;

/**
 * The routes a prerendered page is served at, from the HTML on disk.
 *
 * `/` is in the list only when `index.html` holds a rendered page rather than the
 * shell, because that is the difference between a file the platform should serve and
 * a route the app has to render.
 */
async function prerenderedRoutes(dir: string, mountId: string): Promise<string[]> {
  const out: string[] = [];
  const walk = async (current: string): Promise<void> => {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'assets' || entry.name.startsWith('.')) continue;
        await walk(path);
      } else if (entry.name.endsWith('.html')) {
        const rel = relative(dir, path).replace(/\\/g, '/').replace(/index\.html$/, '').replace(/\.html$/, '');
        out.push('/' + rel.replace(/\/$/, ''));
      }
    }
  };
  await walk(dir);
  const index = await readFile(join(dir, 'index.html'), 'utf-8').catch(() => '');
  const root = indexIsPage(index, mountId);
  return out.filter((r) => r !== '/' || root).sort();
}

/**
 * Cloudflare Pages. `_worker.js` at the root of the published directory takes every
 * request; `_routes.json` is what decides whether a request costs an invocation.
 *
 * In advanced mode the worker sees everything not excluded, so a prerendered page
 * would wake it just to proxy the file back through the ASSETS binding. On a plan
 * metered by request that is the whole page view budget spent on static files, so
 * every prerendered path is excluded by name.
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
    const prerendered = await prerenderedRoutes(ctx.clientDir, ctx.cfg.mountId);
    await ctx.bundleEntry(cloudflareEntry(await entrySource(ctx, out, prerendered)), out);

    // Everything under /assets is content-hashed and immutable, so it never needs the
    // worker. `_worker.js` itself must be excluded or Pages would route it to itself.
    // `/` is excluded only when it was prerendered, otherwise the worker is the only
    // thing that can answer it, and excluding it would serve the shell instead.
    const base = ['/assets/*', '/_worker.js'];
    const room = CF_MAX_RULES - base.length;
    const exclude = [...base, ...prerendered.slice(0, room)];
    if (prerendered.length > room) {
      // Past the cap the remainder still works: it just wakes the worker to hand
      // back a file. Worth saying, because the symptom is a bill, not an error.
      console.warn(
        `  fluixi: ${prerendered.length} prerendered routes exceed Cloudflare's ${CF_MAX_RULES}-rule ` +
          `limit for _routes.json; ${prerendered.length - room} will invoke the worker to serve a static file.`,
      );
    }
    await writeFile(
      join(ctx.clientDir, '_routes.json'),
      JSON.stringify({ version: 1, include: ['/*'], exclude }, null, 2) + '\n',
    );
  },
};

/**
 * Netlify. The function is a v2 fetch handler under `.netlify/functions-internal/`,
 * which is where a framework: as opposed to the user, puts one, so it cannot
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
    // A SPA has no function to fall back to, so the CDN has to hand back the shell.
    if (skipWhenStatic(ctx, 'netlify')) return appendRedirect(ctx.clientDir, SPA_FALLBACK);
    const dir = join(ctx.root, '.netlify', 'functions-internal');
    await mkdir(dir, { recursive: true });
    const out = join(dir, 'fluixi-server.mjs');
    const prerendered = await prerenderedRoutes(ctx.clientDir, ctx.cfg.mountId);
    await ctx.bundleEntry(netlifyEntry(await entrySource(ctx, out, prerendered)), out);

    // v2 functions declare their own routing, but the manifest is what makes Netlify
    // load an internal function at all.
    await writeFile(
      join(dir, 'fluixi-server.json'),
      JSON.stringify({ config: { path: '/*', preferStatic: true }, version: 1 }, null, 2) + '\n',
    );

    // `preferStatic` is what keeps assets, prerendered pages and files like
    // `favicon.ico` off the function: and it is also what would hand back the shell
    // for `/`. A forced redirect is the one exception the CDN honours over a file, so
    // it claims exactly that path and nothing else. Appended, so an app's own rules in
    // `public/_redirects` still match first.
    if (!prerendered.includes('/')) {
      await appendRedirect(ctx.clientDir, '/  /.netlify/functions/fluixi-server  200!');
    }
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
        JSON.stringify(
          {
            version: 3,
            // The filesystem phase alone answers 404 for a client route, since nothing
            // is on disk at that path; the catch-all is what makes it a SPA.
            routes: [{ handle: 'filesystem' }, { src: '/(.*)', dest: '/index.html' }],
          },
          null,
          2,
        ) + '\n',
      );
      return;
    }

    const fn = join(output, 'functions', 'index.func');
    await mkdir(fn, { recursive: true });
    const out = join(fn, 'index.mjs');
    const prerendered = await prerenderedRoutes(ctx.clientDir, ctx.cfg.mountId);
    await ctx.bundleEntry(vercelEntry(await entrySource(ctx, out, prerendered)), out);

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
            // The filesystem holds a shell at `/index.html`, so `/` has to be claimed
            // before that phase or it is served unrendered. Skipped when `/` really is
            // a prerendered page, which the filesystem should answer.
            ...(prerendered.includes('/') ? [] : [{ src: '/', dest: '/index' }]),
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
