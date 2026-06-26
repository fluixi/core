import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve as resolvePath, relative as relativePath } from 'node:path';
import type { ResolvedConfig } from './config.js';
import type { FetchHandler } from './handler.js';

/** The virtual module that registers every `"use server"` fn + re-exports the dispatcher. */
export const SERVER_FNS_VMOD = 'virtual:fluixi-server-fns';

/** The virtual module exposing auto-discovered translations: `{ messages, locales, defaultLocale }`. */
export const I18N_VMOD = 'virtual:fluixi-i18n';

/**
 * Auto-discover translations. Scans `<dir>/<locale>.json` (e.g. `src/i18n/en.json`, `fr.json`)
 * and provides `virtual:fluixi-i18n` exporting `{ messages, locales, defaultLocale }` — wire it
 * into the built-in i18n in one line:
 *
 *   import { createI18n } from '@fluixi/core/i18n';
 *   import { messages, locales, defaultLocale } from 'virtual:fluixi-i18n';
 *   export const { t, locale, setLocale } = createI18n({ locale: defaultLocale, locales, messages });
 *
 * Configured via `fluixi.config`'s `i18n` (folder / locales / defaultLocale); `i18n: false` disables it.
 */
export function i18nVitePlugin(opts: { dir: string; defaultLocale?: string; locales?: string[] }): any {
  let root = process.cwd();
  const id = '\0' + I18N_VMOD;
  return {
    name: 'fluixi-i18n',
    configResolved(config: { root?: string }) {
      root = config.root || root;
    },
    resolveId(source: string) {
      return source === I18N_VMOD ? id : null;
    },
    load(source: string) {
      if (source !== id) return null;
      const dir = resolvePath(root, opts.dir);
      let files: string[] = [];
      try {
        files = readdirSync(dir).filter((f) => f.endsWith('.json'));
      } catch {
        /* folder doesn't exist → empty bundle (i18n stays a no-op until you add files) */
      }
      const discovered = files.map((f) => f.replace(/\.json$/, '')).sort();
      const locales = opts.locales?.length ? opts.locales : discovered;
      const defaultLocale = opts.defaultLocale ?? locales[0] ?? 'en';
      // Static JSON imports so Vite bundles + watches them; `messages` keyed by locale.
      const imports = locales
        .map((l, i) => `import _${i} from ${JSON.stringify(resolvePath(dir, l + '.json'))};`)
        .join('\n');
      const messages = `export const messages = {${locales.map((l, i) => `${JSON.stringify(l)}:_${i}`).join(',')}};`;
      return (
        `${imports}\n` +
        `export const locales = ${JSON.stringify(locales)};\n` +
        `export const defaultLocale = ${JSON.stringify(defaultLocale)};\n` +
        `${messages}\n`
      );
    },
  };
}

/**
 * Load env files into `process.env` for SERVER code — the framework's environment manager.
 *
 * SECURITY MODEL (Vite-aligned): only `VITE_`-prefixed vars are exposed to the client (via
 * `import.meta.env`, inlined into the browser bundle). Everything else is server-only. This
 * loads ALL vars (`.env`, `.env.local`, `.env.[mode]`, `.env.[mode].local`) into `process.env`
 * so loaders + `"use server"` functions can read secrets — WITHOUT ever exposing non-`VITE_`
 * vars to the browser. A real (OS) env var always wins, so deploys/secret managers override files.
 *
 * Result: `process.env.STRIPE_SECRET` works on the server and never ships to the web; only
 * `VITE_*` reaches the client. Apps stop hand-rolling dotenv loaders + risking secret leaks.
 */
export async function loadServerEnv(root: string, mode: string): Promise<void> {
  const { loadEnv } = await import('vite');
  const env = loadEnv(mode, root, ''); // '' prefix = ALL vars (server-only via process.env)
  for (const [k, v] of Object.entries(env)) {
    if (process.env[k] === undefined) process.env[k] = v; // real env wins
  }
}

/**
 * Build the `declare module 'virtual:fluixi-i18n'` block — TYPED off the actual JSON files
 * so `createI18n({ messages })` infers translation keys end-to-end from auto-discovery.
 *
 * Instead of typing `messages` as `Record<string, unknown>` (which erases keys), we reference
 * each `<locale>.json` via `(typeof import('./i18n/en.json'))['default']`. TS reads the JSON's
 * real shape, so `t('…')` autocompletes keys discovered from `src/i18n/*.json` — no codegen of
 * the key union, the compiler derives it. Falls back to the loose shape when no files exist yet
 * (or a configured locale has no file), keeping the module typed-but-open rather than broken.
 *
 * NOTE: relies on `resolveJsonModule` (Vite's default tsconfig has it).
 */
function i18nTypeBlock(
  root: string,
  i18n: { dir: string; defaultLocale?: string; locales?: string[] },
): string[] {
  const dir = resolvePath(root, i18n.dir);
  let discovered: string[] = [];
  try {
    discovered = readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''))
      .sort();
  } catch {
    /* folder absent → fall through to the loose block */
  }
  const locales = i18n.locales?.length ? i18n.locales : discovered;
  const defaultLocale = i18n.defaultLocale ?? locales[0] ?? 'en';

  // Typed only when every locale we'd export has a backing JSON file (else `import()` would error).
  const typed = locales.length > 0 && locales.every((l) => discovered.includes(l));
  if (!typed) {
    return [
      `declare module 'virtual:fluixi-i18n' {`,
      `  export const messages: Record<string, Record<string, unknown>>;`,
      `  export const locales: string[];`,
      `  export const defaultLocale: string;`,
      `}`,
    ];
  }

  const srcDir = resolvePath(root, 'src'); // the .d.ts lives in src/, so import paths are relative to it
  const toSpec = (l: string) => {
    const rel = relativePath(srcDir, resolvePath(dir, l + '.json')).split(/[\\/]/).join('/');
    return rel.startsWith('.') ? rel : './' + rel;
  };
  const entries = locales.map((l) => `    ${JSON.stringify(l)}: (typeof import(${JSON.stringify(toSpec(l))}))['default'];`);
  const tuple = locales.map((l) => JSON.stringify(l)).join(', ');
  return [
    `declare module 'virtual:fluixi-i18n' {`,
    `  export const messages: {`,
    ...entries,
    `  };`,
    `  export const locales: readonly [${tuple}];`,
    `  export const defaultLocale: ${JSON.stringify(defaultLocale)};`,
    `}`,
  ];
}

/**
 * Auto-generate ambient TypeScript declarations for @fluixi/start's virtual modules
 * (`virtual:fluixi-server-fns`, `virtual:fluixi-i18n`) into `src/fluixi-start-env.d.ts`, the
 * way the routes plugin writes `fluixi-env.d.ts`. So apps NEVER hand-write these `declare
 * module` blocks — the modules AND their types are both generated. Idempotent (only writes on
 * change), runs in dev + build.
 */
export function startTypesPlugin(cfg: ResolvedConfig): any {
  let root = process.cwd();
  return {
    name: 'fluixi-start-types',
    configResolved(config: { root?: string }) {
      root = config.root || root;
    },
    buildStart() {
      const blocks = [
        `declare module 'virtual:fluixi-server-fns' {`,
        `  export function isServerFnRequest(request: Request): boolean;`,
        `  export function handleServerFn(request: Request): Promise<Response>;`,
        `}`,
      ];
      if (cfg.i18n) blocks.push(...i18nTypeBlock(root, cfg.i18n));
      const content = `// Auto-generated by @fluixi/start — do not edit.\n${blocks.join('\n')}\n`;
      const file = resolvePath(root, 'src/fluixi-start-env.d.ts');
      try {
        if (!existsSync(file) || readFileSync(file, 'utf8') !== content) writeFileSync(file, content);
      } catch {
        /* read-only fs (some CI) — types are a dev convenience, build still works */
      }
    },
  };
}

/**
 * The fluixi build plugins @fluixi/start provides by default: file-based routing
 * (fluixiRoutesPlugin → virtual:fluixi-routes) + the JSX/SSR transform
 * (createVitePlugin). This is what makes start "sit on top of fluixi" — apps get
 * zero-config routing + SSR. Apps using `fluixi dev|build` should therefore NOT add
 * these to their own vite.config (start owns them); keep vite.config for app-specific
 * bits only (optimizeDeps, ssr.noExternal via config, etc.).
 */
export async function fluixiPlugins(cfg: ResolvedConfig): Promise<any[]> {
  const { createVitePlugin, fluixiRoutesPlugin } = await import('@fluixi/core/plugins');
  const { serverFunctionsVitePlugin } = await import('@fluixi/compiler/integrations');
  // polyfills:false — the meta-framework is SSR-first; the browser node-polyfill shims
  // break server rendering. Apps that need Buffer/process in the browser opt in later.
  // serverFunctionsVitePlugin applies the "use server" transform (client RPC stub /
  // server registration) per-build via the ssr flag.
  const plugins: any[] = [
    serverFunctionsVitePlugin(),
    fluixiRoutesPlugin({ routesDir: cfg.routesDir, polyfills: false }),
    createVitePlugin(),
  ];
  // Auto-discover translations (src/i18n/<locale>.json → virtual:fluixi-i18n) unless disabled.
  if (cfg.i18n) plugins.push(i18nVitePlugin(cfg.i18n));
  // Auto-generate the ambient .d.ts for the virtual modules (server-fns + i18n).
  plugins.push(startTypesPlugin(cfg));
  return plugins;
}

/**
 * Inject server-rendered app HTML into the template's mount element
 * (`<div id="root"></div>`). Falls back to a `<!--ssr-outlet-->` marker, then to
 * just before `</body>`.
 */
export function injectApp(template: string, appHtml: string, mountId = 'root'): string {
  const mount = new RegExp(`<div id=["']${mountId}["']\\s*>\\s*</div>`);
  if (mount.test(template)) {
    return template.replace(mount, `<div id="${mountId}">${appHtml}</div>`);
  }
  if (template.includes('<!--ssr-outlet-->')) {
    return template.replace('<!--ssr-outlet-->', appHtml);
  }
  return template.replace('</body>', `<div id="${mountId}">${appHtml}</div></body>`);
}

/**
 * Split the template at the mount point for streaming: `head` is everything up to and
 * including the open mount tag (flushed first so the browser fetches assets while the
 * server awaits data); `tail` is the close tag onward (client script + `</body>`).
 * Mirrors injectApp's three cases (mount div, `<!--ssr-outlet-->`, before `</body>`).
 */
export function splitTemplate(template: string, mountId = 'root'): { head: string; tail: string } {
  const mount = new RegExp(`<div id=["']${mountId}["']\\s*>\\s*</div>`);
  const m = template.match(mount);
  if (m && m.index !== undefined) {
    return {
      head: template.slice(0, m.index) + `<div id="${mountId}">`,
      tail: `</div>` + template.slice(m.index + m[0].length),
    };
  }
  const outlet = template.indexOf('<!--ssr-outlet-->');
  if (outlet !== -1) {
    return {
      head: template.slice(0, outlet),
      tail: template.slice(outlet + '<!--ssr-outlet-->'.length),
    };
  }
  const body = template.indexOf('</body>');
  if (body !== -1) {
    return {
      head: template.slice(0, body) + `<div id="${mountId}">`,
      tail: `</div>` + template.slice(body),
    };
  }
  return { head: template, tail: '' };
}

/**
 * Wrap a fetch handler so a thrown/rejected error becomes a 500 instead of an
 * unhandled rejection. `createRequestHandler` already guards the renderer; this
 * covers the middleware chain that wraps it. `onError` lets dev map the stack first.
 */
export function guardHandler(
  handler: FetchHandler,
  onError?: (e: unknown) => void,
): FetchHandler {
  return async (request) => {
    try {
      return await handler(request);
    } catch (e: any) {
      onError?.(e);
      return new Response(String(e?.stack || e), {
        status: 500,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      });
    }
  };
}

let _guardsInstalled = false;

/**
 * A render fires the route's data fetches eagerly; if the backend is down those
 * promises can reject AFTER we've already responded, with nothing awaiting them —
 * a floating rejection would kill the dev server. Swallow + log instead.
 */
export function installCrashGuards(): void {
  if (_guardsInstalled) return;
  _guardsInstalled = true;
  process.on('unhandledRejection', (reason: any) =>
    console.warn('[fluixi] unhandled rejection (backend likely down) —', reason?.message || reason),
  );
  process.on('uncaughtException', (err: any) =>
    console.warn('[fluixi] uncaught exception —', err?.message || err),
  );
}
