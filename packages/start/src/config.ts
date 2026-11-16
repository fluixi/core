import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { writeFile, unlink } from 'node:fs/promises';
import { resolve, isAbsolute } from 'node:path';
import type { Adapter } from './adapter.js';
import type { ComponentResolverRule } from '@fluixi/compiler';

/**
 * Fluixi app config. Place in `fluixi.config.{ts,js,mjs}` at the app root and wrap
 * with `defineConfig` for types. Everything is optional, the defaults match the
 * conventional layout (src/entry-server.ts, src/entry-client.ts, index.html).
 */
export interface FluixiConfig {
  /** App root directory. Default: process.cwd(). */
  root?: string;
  /**
   * Render mode. `true` (default) = SSR: the server entry renders HTML per request. `false`
   * = SPA: the server serves the static shell and the client renders, but you still get the
   * full @fluixi/start server (file routing, middleware, env, and `/_server` server functions).
   * The same app code runs either way; flip this to choose where the first paint happens.
   */
  ssr?: boolean;
  /**
   * An API service: only `src/api` routes (plus the app config's providers and middleware), no
   * pages. No `index.html`, no entries to write; `fluixi build` generates the server entry and
   * `fluixi dev` and `fluixi start` answer anything outside the API with a JSON 404.
   */
  apiOnly?: boolean;
  /** Dev/prod server port. Default: 3000. */
  port?: number;
  /**
   * Reverse proxies in front of the Node server (a load balancer, a platform router), as a count.
   * Their `x-forwarded-for`, `-proto` and `-host` are then believed: `clientAddress()` is the
   * address that many hops back, and the request URL has the scheme and host the client used.
   * `true` believes every hop, which only holds when nothing reaches the server except through
   * the proxy. Default: 0, the socket's peer, since anyone can send those headers.
   */
  trustProxy?: number | boolean;
  /** Server entry exporting `render(url): string | Promise<string>`. Default: src/entry-server.ts */
  serverEntry?: string;
  /** Client hydration entry. Default: src/entry-client.ts */
  clientEntry?: string;
  /** HTML template. Default: index.html */
  template?: string;
  /** Element id the app HTML is injected into (`<div id="..."></div>`). Default: root */
  mountId?: string;
  /**
   * Keep clicks, input and key presses a visitor makes on the server-rendered page before it
   * hydrates: a small inline script at the top of `<head>` records them, and the client replays
   * them once its handlers are wired. Turn it off for a Content Security Policy that refuses
   * inline scripts. Not emitted with `ssr: false`, where there is no server markup to click.
   * Default: true
   */
  eventReplay?: boolean;
  /** File-routes directory (passed to fluixiRoutesPlugin). Default: src/routes */
  routesDir?: string;
  /** File-based API routes directory; files export GET/POST/... handlers served at `/api/*`. Default: src/api */
  apiDir?: string;
  /** Request middleware module (default-exports `defineMiddleware([...])`). Default: src/middleware.ts */
  middleware?: string;
  /**
   * Background jobs module: default-exports `createJobs(...)` from `@fluixi/jobs`, schedules
   * included. `fluixi worker` runs it; `fluixi dev` runs it beside the server. Default: src/jobs.ts
   */
  jobs?: string;
  /**
   * Server module: default-exports `defineServer({ start, upgrade, shutdown })` from
   * `@fluixi/start/server`, code that lives as long as the server process (WebSocket upgrades,
   * listeners). Node adapter only. Default: src/server.ts
   */
  server?: string;
  /** How long a shutdown waits for the server hooks and open requests, in seconds. Default: 10 */
  shutdownTimeoutSeconds?: number;
  worker?: {
    /**
     * Run the jobs in the `fluixi start` process too, instead of a separate `fluixi worker`: for
     * a small deployment, or embedded PGlite, which allows one process. Default: false
     */
    inline?: boolean;
    /** Run them beside `fluixi dev`. Default: true */
    dev?: boolean;
    /** How long a stop waits for running jobs, in seconds; the rest run again later. Default: 30 */
    stopTimeoutSeconds?: number;
  };
  /**
   * SSR deps Vite must bundle rather than let node import, e.g. ESM packages without
   * file extensions.
   *
   * A RegExp covers a family at once, which is what a workspace link needs: a package
   * resolved to source pulls in its siblings, and naming them one at a time only finds
   * the next one on the next run. `[/^@acme\//]` bundles the whole scope.
   */
  ssrNoExternal?: (string | RegExp)[];
  /**
   * Packages resolved once, from the app's root, besides the framework's own: a library that
   * holds a context (a theme provider, a store) and is reached through two installs otherwise
   * gives the app two copies, and a provider in one is invisible to a reader in the other.
   *
   * @example
   * ```ts
   * dedupe: ['@fluixi-ui/theme']
   * ```
   */
  dedupe?: string[];
  /**
   * Which environment variables reach the browser.
   *
   * Declared rather than spelled. Vite's `VITE_` prefix puts that decision in a name, so moving
   * a value between server and browser renames every reference, and a secret named
   * `VITE_API_SECRET` is published whether anything reads it or not. Naming the public set
   * instead means a secret can only ship by being listed here.
   *
   * ```ts
   * env: { public: ['AUTH_ISSUER', 'AUTH_CLIENT_ID', 'API_URL'] }
   * ```
   *
   * Read them with `publicEnv()` from `@fluixi/start/env`, which works in a browser and on a
   * server. Everything not listed stays server-only, reachable through `serverEnv()`.
   *
   * `VITE_`-prefixed variables keep working and stay public, so this is additive.
   */
  env?: {
    /**
     * Variable names the browser may see.
     *
     * Written without a client prefix. A prefixed spelling in `.env` is accepted for the same
     * name, so an app can migrate one variable at a time.
     */
    public?: string[];
  };
  /**
   * Where a capitalised tag with no import in scope comes from.
   *
   * An entry per component (`{ components: { Button: '/src/components/Button.tsx' } }`) or
   * a pattern covering a family (`{ match: /^([A-Z]\w+)$/, module: '/src/components/$1.tsx' }`),
   * so a whole directory is one rule rather than a list to maintain.
   *
   * Only needed for tags you don't import. A `load:` directive works on your own import
   * too: see the docs on load strategies.
   */
  resolve?: readonly ComponentResolverRule[];
  /**
   * Options handed to the fluixi vite plugin.
   *
   * A start app does not write `fluixi()` into a vite config, the framework adds the
   * plugin itself, so this is where its options go: `propsDestructure`, and anything
   * else the compiler takes. `resolve` above is the shorthand for the one most apps
   * set, and wins over a `resolve` given here.
   */
  vitePlugin?: Record<string, unknown>;
  /**
   * Components to publish as custom elements.
   *
   * `fluixi build` emits one file per entry alongside the app. `fluixi build
   * --format=web-component` emits only those files, which is what a package that ships
   * elements and nothing else wants.
   */
  webComponents?: {
    /** The modules to build. Each one defines an element at module scope. */
    entries: string | string[];
    /** Default: `dist/elements`. */
    outDir?: string;
    /** Default: `standalone`. */
    mode?: 'standalone' | 'shared';
    /** Default: true. */
    minify?: boolean;
  };
  /**
   * Extra vite plugins, appended after the framework's own.
   *
   * A start app has no vite config of its own, so a plugin it needs but the framework
   * does not ship, a css engine for instance, is declared here instead of forcing a
   * second config file into the project.
   */
  plugins?: unknown[];
  /**
   * Modules the app shares with code it loads at run time, plugins installed into a
   * deployment rather than built with the app, each as that code imports it. A subpath is a
   * module of its own: `['@fluixi/core', '@fluixi/reactive/signal', '@acme/sdk/view']`.
   *
   * The browser build exposes them through an import map (`share.json`, and first in the
   * document's head); the server build keeps their packages external, so code imported at
   * run time from inside the app resolves the app's copies. Needs an adapter whose server
   * imports its dependencies (`nodeAdapter`). Shared modules are kept whole in the bundle.
   */
  share?: string[];
  /**
   * Deploy target. Decides how `fluixi build` bundles the server (see the adapter's
   * `bundle` mode) and how `fluixi start` serves it. Unset keeps Vite's own bundling
   * heuristic and serves with `nodeAdapter`.
   */
  adapter?: Adapter;
  /**
   * Built-in i18n auto-discovery. Scans `<dir>/<locale>.json` and exposes them as
   * `virtual:fluixi-i18n` (`{ messages, locales, defaultLocale }`) to feed `createI18n`.
   * `false` disables it; an object configures the folder / locales / default. Default: enabled
   * with `src/i18n`: a no-op until that folder has `*.json` files, so it's effectively opt-in.
   */
  i18n?: boolean | { dir?: string; defaultLocale?: string; locales?: string[] };
  /**
   * Static Site Generation. When set, `fluixi build` prerenders routes to static HTML in
   * `dist/client` (served by any static host; hydrates on the client). `true` prerenders `/`
   * and crawls internal `<a href>` links. An object sets explicit `routes` (for dynamic paths
   * with no incoming link) and toggles `crawl`. Requires `ssr: true` (it renders to prerender).
   */
  prerender?: boolean | { routes?: string[]; crawl?: boolean };
}

/** Resolved i18n discovery config (or `false` when disabled). */
export interface ResolvedI18n {
  dir: string;
  defaultLocale?: string;
  locales?: string[];
}

/** Resolved SSG config (or `false` when disabled). */
export interface ResolvedPrerender {
  routes: string[];
  crawl: boolean;
}

export type ResolvedConfig = Required<
  Omit<FluixiConfig, 'ssrNoExternal' | 'i18n' | 'prerender' | 'adapter' | 'webComponents' | 'worker'>
> & {
  ssrNoExternal: (string | RegExp)[];
  worker: Required<NonNullable<FluixiConfig['worker']>>;
  i18n: ResolvedI18n | false;
  prerender: ResolvedPrerender | false;
  /** Stays optional: an app that publishes no elements declares none. */
  webComponents?: FluixiConfig['webComponents'];
  /** Stays optional: no adapter means "Vite's defaults + serve with node". */
  adapter?: Adapter;
};

/** Identity helper for editor types in `fluixi.config.ts`. */
// One implementation, re-exported: the root entry needs it without this module's
// `node:fs`, and two copies of an identity function is how their signatures drift.
export { defineConfig } from './define-config.js';

/** Apply defaults. */
export function resolveConfig(config: FluixiConfig = {}): ResolvedConfig {
  const root = resolve(config.root ?? process.cwd());
  return {
    root,
    ssr: config.ssr ?? true,
    apiOnly: config.apiOnly ?? false,
    port: config.port ?? 3000,
    trustProxy: config.trustProxy ?? 0,
    serverEntry: config.serverEntry ?? 'src/entry-server.ts',
    clientEntry: config.clientEntry ?? 'src/entry-client.ts',
    template: config.template ?? 'index.html',
    mountId: config.mountId ?? 'root',
    eventReplay: config.eventReplay ?? true,
    routesDir: config.routesDir ?? 'src/routes',
    apiDir: config.apiDir ?? 'src/api',
    middleware: config.middleware ?? 'src/middleware.ts',
    jobs: config.jobs ?? 'src/jobs.ts',
    server: config.server ?? 'src/server.ts',
    shutdownTimeoutSeconds: config.shutdownTimeoutSeconds ?? 10,
    worker: {
      inline: config.worker?.inline ?? false,
      dev: config.worker?.dev ?? true,
      stopTimeoutSeconds: config.worker?.stopTimeoutSeconds ?? 30,
    },
    ssrNoExternal: config.ssrNoExternal ?? [],
    dedupe: config.dedupe ?? [],
    env: { public: config.env?.public ?? [] },
    resolve: config.resolve ?? [],
    vitePlugin: config.vitePlugin ?? {},
    plugins: config.plugins ?? [],
    share: config.share ?? [],
    webComponents: config.webComponents,
    adapter: config.adapter,
    i18n: resolveI18n(config.i18n),
    prerender: resolvePrerender(config.prerender),
  };
}

/** `false`/unset → disabled; `true` → crawl from `/`; object → explicit routes + crawl toggle. */
function resolvePrerender(prerender: FluixiConfig['prerender']): ResolvedPrerender | false {
  if (!prerender) return false;
  const opts = typeof prerender === 'object' ? prerender : {};
  return {
    routes: opts.routes?.length ? opts.routes : ['/'],
    crawl: opts.crawl ?? true,
  };
}

/** `false` → disabled; otherwise a folder (default `src/i18n`) + optional locales/default. */
function resolveI18n(i18n: FluixiConfig['i18n']): ResolvedI18n | false {
  if (i18n === false) return false;
  const opts = typeof i18n === 'object' ? i18n : {};
  return {
    dir: opts.dir ?? 'src/i18n',
    defaultLocale: opts.defaultLocale,
    locales: opts.locales,
  };
}

// Config filenames probed, in order. TS first so a `.ts` config wins over a stray
// build artifact; `.mts`/`.mjs`/`.js` cover plain-ESM configs.
const CONFIG_NAMES = [
  'fluixi.config.ts',
  'fluixi.config.mts',
  'fluixi.config.mjs',
  'fluixi.config.js',
] as const;

/**
 * Load `fluixi.config.{ts,mts,mjs,js}` from the app root. TypeScript configs are
 * bundled on the fly with esbuild and imported; plain ESM is imported directly.
 * No config is fine too: every field has a default.
 */
export async function loadConfig(root = process.cwd()): Promise<FluixiConfig> {
  for (const name of CONFIG_NAMES) {
    const file = resolve(root, name);
    if (existsSync(file)) return loadConfigFile(file);
  }
  return {};
}

async function loadConfigFile(file: string): Promise<FluixiConfig> {
  // Plain ESM (.mjs/.js), import directly, no transform needed.
  if (!/\.[mc]?ts$/.test(file)) {
    const mod = await import(/* @vite-ignore */ pathToFileURL(file).href);
    return (mod.default ?? mod) as FluixiConfig;
  }

  // TypeScript: bundle with esbuild, keeping bare specifiers external so
  // `import { defineConfig } from '@fluixi/start'` and node builtins resolve from
  // the app. Relative imports (shared constants, env helpers) ARE bundled in. The
  // output is written to a temp `.mjs` beside the source so those externals resolve
  // against the app's node_modules, then imported and removed.
  const esbuild = await import('esbuild');
  const { outputFiles } = await esbuild.build({
    entryPoints: [file],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    target: `node${process.versions.node.split('.')[0]}`,
    sourcemap: 'inline',
    plugins: [
      {
        name: 'fluixi:externalize-bare',
        setup(b: any) {
          b.onResolve({ filter: /.*/ }, (args: any) => {
            if (args.kind === 'entry-point') return null;
            if (args.path.startsWith('.') || isAbsolute(args.path)) return null;
            return { path: args.path, external: true };
          });
        },
      },
    ],
  });

  const tempFile = `${file}.timestamp-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}.mjs`;
  await writeFile(tempFile, outputFiles[0].text);
  try {
    const mod = await import(/* @vite-ignore */ pathToFileURL(tempFile).href);
    return (mod.default ?? mod) as FluixiConfig;
  } finally {
    await unlink(tempFile).catch(() => {});
  }
}
