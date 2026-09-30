import { readdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { resolve as resolvePath, relative as relativePath } from 'node:path';
import type { ResolvedConfig } from './config.js';
import type { FetchHandler } from './handler.js';

/** The virtual module that registers every `"use server"` fn + re-exports the dispatcher. */
export const SERVER_FNS_VMOD = 'virtual:fluixi-server-fns';

/** The virtual module exposing auto-discovered translations: `{ messages, locales, defaultLocale }`. */
export const I18N_VMOD = 'virtual:fluixi-i18n';

/**
 * Auto-discover translations. Scans `<dir>/<locale>.json` (e.g. `src/i18n/en.json`, `fr.json`)
 * and provides `virtual:fluixi-i18n` exporting `{ messages, locales, defaultLocale }`, wire it
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
 * Load env files into `process.env` for SERVER code, the framework's environment manager.
 *
 * SECURITY MODEL (Vite-aligned): only `VITE_`-prefixed vars are exposed to the client (via
 * `import.meta.env`, inlined into the browser bundle). Everything else is server-only. This
 * loads ALL vars (`.env`, `.env.local`, `.env.[mode]`, `.env.[mode].local`) into `process.env`
 * so loaders + `"use server"` functions can read secrets, WITHOUT ever exposing non-`VITE_`
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
 * Build the `declare module 'virtual:fluixi-i18n'` block, TYPED off the actual JSON files
 * so `createI18n({ messages })` infers translation keys end-to-end from auto-discovery.
 *
 * Instead of typing `messages` as `Record<string, unknown>` (which erases keys), we reference
 * each `<locale>.json` via `(typeof import('./i18n/en.json'))['default']`. TS reads the JSON's
 * real shape, so `t('…')` autocompletes keys discovered from `src/i18n/*.json`, no codegen of
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
 * module` blocks: the modules AND their types are both generated. Idempotent (only writes on
 * change), runs in dev + build.
 */
const ENV_TYPES = 'src/fluixi-env-vars.d.ts';
/** The file's earlier name, removed when it is ours so two declarations do not both apply. */
const OLD_ENV_TYPES = 'src/fluixi-public-env.d.ts';
const ENV_TYPES_HEADER = '// Auto-generated by @fluixi/start from fluixi.config.ts and .env files, do not edit.';
const OLD_ENV_TYPES_HEADER = '// Auto-generated by @fluixi/start from env.public in fluixi.config.ts, do not edit.';

const ENV_FILES = ['.env', '.env.local', '.env.development', '.env.development.local', '.env.production', '.env.production.local', '.env.example'];

/** Variable names in the app's env files. Names only: a value never leaves the file. */
export function envFileNames(root: string): string[] {
  const names = new Set<string>();
  for (const file of ENV_FILES) {
    let text = '';
    try {
      text = readFileSync(resolvePath(root, file), 'utf8');
    } catch {
      continue;
    }
    for (const m of text.matchAll(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm)) names.add(m[1]);
  }
  return [...names].sort();
}

/**
 * The declaration that types `publicEnv()` and `env()` with the app's own names.
 *
 * Its own file, and a module (`export {}`), because augmenting `@fluixi/start/env` needs a module
 * while the i18n block in `fluixi-start-env.d.ts` declares an ambient module, which a module file
 * cannot. `VITE_*` names are left out: the type already accepts every one.
 */
export function envTypes(publicNames: readonly string[], serverNames: readonly string[] = []): string {
  const key = (n: string) => (/^[A-Za-z_$][\w$]*$/.test(n) ? n : JSON.stringify(n));
  const server = serverNames.filter((n) => !publicNames.includes(n) && !n.startsWith('VITE_'));
  const block = (name: string, names: readonly string[]) =>
    `  interface ${name} {\n` + names.map((n) => `    ${key(n)}: string;\n`).join('') + `  }\n`;
  return (
    `${ENV_TYPES_HEADER}\nexport {};\n\ndeclare module '@fluixi/start/env' {\n` +
    block('PublicEnv', publicNames) +
    block('ServerEnv', server) +
    `}\n`
  );
}

/** Write it when there is anything to declare; remove one this wrote when there is not. Returns the file written. */
export function writeEnvTypes(root: string, publicNames: readonly string[]): string | null {
  const file = resolvePath(root, ENV_TYPES);
  const old = resolvePath(root, OLD_ENV_TYPES);
  try {
    if (existsSync(old) && readFileSync(old, 'utf8').startsWith(OLD_ENV_TYPES_HEADER)) unlinkSync(old);
    const serverNames = envFileNames(root);
    if (!publicNames.length && !serverNames.length) {
      if (existsSync(file) && readFileSync(file, 'utf8').startsWith(ENV_TYPES_HEADER)) unlinkSync(file);
      return null;
    }
    const content = envTypes(publicNames, serverNames);
    if (!existsSync(file) || readFileSync(file, 'utf8') !== content) writeFileSync(file, content);
    return file;
  } catch {
    /* read-only fs (some CI): types are a convenience, the build still works */
    return null;
  }
}

export function startTypesPlugin(cfg: ResolvedConfig): any {
  let root = process.cwd();
  return {
    name: 'fluixi-start-types',
    configResolved(config: { root?: string }) {
      root = config.root || root;
    },
    buildStart() {
      // Of the ambient declarations only i18n is left. `virtual:fluixi-server-fns` and `virtual:fluixi-api`
      // have fixed signatures, so they moved to real package entries
      // (`@fluixi/start/server-fns`, `@fluixi/start/api-routes`) whose types ship with the
      // package. i18n cannot follow: its `messages` type is derived from the app's own JSON
      // (`typeof import('./i18n/en.json')`) and its `locales` is a literal tuple, that is
      // what makes keys autocomplete, and no static entry can express it.
      writeEnvTypes(root, cfg.env?.public ?? []);
      // Loaded here, as in fluixiPlugins: api.ts brings @fluixi/server with it.
      const apiTypes = import('./api.js').then(({ writeApiTypes }) => void writeApiTypes(root, cfg.apiDir));
      const blocks: string[] = [];
      if (cfg.i18n) blocks.push(...i18nTypeBlock(root, cfg.i18n));
      if (blocks.length === 0) return apiTypes; // no i18n configured: nothing left to declare
      const content = `// Auto-generated by @fluixi/start, do not edit.\n${blocks.join('\n')}\n`;
      const file = resolvePath(root, 'src/fluixi-start-env.d.ts');
      try {
        if (!existsSync(file) || readFileSync(file, 'utf8') !== content) writeFileSync(file, content);
      } catch {
        /* read-only fs (some CI), types are a dev convenience, build still works */
      }
      return apiTypes;
    },
  };
}

/**
 * The fluixi build plugins @fluixi/start provides by default: file-based routing
 * (fluixiRoutesPlugin → virtual:fluixi-routes) + the JSX/SSR transform
 * (createVitePlugin). This is what makes start "sit on top of fluixi", apps get
 * zero-config routing + SSR. Apps using `fluixi dev|build` should therefore NOT add
 * these to their own vite.config (start owns them); keep vite.config for app-specific
 * bits only (optimizeDeps, ssr.noExternal via config, etc.).
 */
export async function fluixiPlugins(cfg: ResolvedConfig): Promise<any[]> {
  const { fluixi, fluixiRoutesPlugin } = await import('@fluixi/core/plugins');
  const { serverFunctionsVitePlugin } = await import('@fluixi/compiler/integrations');
  // polyfills:false: the meta-framework is SSR-first; the browser node-polyfill shims
  // break server rendering. Apps that need Buffer/process in the browser opt in later.
  // serverFunctionsVitePlugin applies the "use server" transform (client RPC stub /
  // server registration) per-build via the ssr flag.
  const { envVitePlugin } = await import('./env-plugin.js');
  const { appConfigVitePlugin } = await import('./app-plugin.js');
  const { serverOnlyVitePlugin } = await import('./server-only-plugin.js');
  const plugins: any[] = [
    // First: a value it defines has to be visible to everything after it.
    envVitePlugin(cfg),
    appConfigVitePlugin(cfg),
    serverOnlyVitePlugin(),
    serverFunctionsVitePlugin(),
    fluixiRoutesPlugin({ routesDir: cfg.routesDir, polyfills: false }),
    // The app's component-resolution rules reach the compiler here; without this an SSR
    // app has no way to say where an unimported tag comes from.
    //
    // `fluixi()` and not `createVitePlugin()`: the latter is the bare compiler integration,
    // and the reactive graph: agent, source marks, /__fluixi/graph, is composed on top of
    // it by the former. A start app got no graph at all until this changed.
    // Everything the app declared for the compiler, with `resolve` still usable on its
    // own because it is the one most apps set. A start app never writes
    // `fluixi()` itself, so without this passthrough the plugin's other options
    // (propsDestructure and the rest) had nowhere to be declared.
    // An API resolves no components, so no ambient types for them; an app can still ask.
    fluixi({
      ...(cfg.apiOnly ? { globals: false as const } : {}),
      ...(cfg.vitePlugin ?? {}),
      ...(cfg.resolve ? { resolve: cfg.resolve } : {}),
    }),
  ];
  // The app's own, after the framework's: a plugin that transforms css or assets runs
  // on what the framework produced rather than racing it.
  // Normal order, after the framework's own, so it reads code with the types and JSX already
  // compiled away and Rollup's parser can take it.
  const { envReferencesVitePlugin } = await import('./env-references.js');
  plugins.push(envReferencesVitePlugin(cfg));
  if (cfg.plugins?.length) plugins.push(...cfg.plugins);
  // Auto-discover translations (src/i18n/<locale>.json → virtual:fluixi-i18n) unless disabled.
  if (cfg.i18n) plugins.push(i18nVitePlugin(cfg.i18n));
  // File-based API routes (src/api/** → virtual:fluixi-api). No-op until the folder has files.
  const { apiRoutesVitePlugin } = await import('./api.js');
  plugins.push(apiRoutesVitePlugin({ dir: cfg.apiDir }));
  // Auto-generate the ambient .d.ts for the virtual modules (server-fns + i18n).
  plugins.push(startTypesPlugin(cfg));
  return plugins;
}

export {
  injectApp,
  splitTemplate,
  injectAppAndHead,
  guardHandler,
} from './document.js';

let _guardsInstalled = false;

/**
 * A render fires the route's data fetches eagerly; if the backend is down those
 * promises can reject AFTER we've already responded, with nothing awaiting them , 
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
