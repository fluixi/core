/**
 * Registers `src/app.config.ts` (and, on the server, `src/app.config.server.ts`) ahead of
 * the app's own code.
 *
 * `virtual:fluixi-app` imports the config files, flattens them with `collectApp` and hands
 * the providers to `provideRoot`. Both entries get an import of it on their first line, so
 * it runs before anything the entry imports. The server entry also re-exports the
 * collected middleware for `createHandlerFrom`; dev loads the module itself, since an API
 * route or server function there never goes through the server entry.
 *
 * An app with neither file is left exactly as it was: no import, no module.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ResolvedConfig } from './config.js';

export const APP_VMOD = 'virtual:fluixi-app';

/** What the server entry re-exports, read by `createHandlerFrom`. */
export const APP_MIDDLEWARE_EXPORT = '__fluixiAppMiddleware';

const RESOLVED = '\0' + APP_VMOD;
const SOURCE = /\.[cm]?[jt]sx?$/;

export interface AppConfigFiles {
  shared?: string;
  server?: string;
}

/** The config files present under `root`, as absolute paths. */
export function findAppConfig(root: string): AppConfigFiles {
  const find = (base: string) =>
    ['.ts', '.tsx', '.js', '.mjs'].map((ext) => resolve(root, 'src', base + ext)).find((f) => existsSync(f));
  return { shared: find('app.config'), server: find('app.config.server') };
}

export const hasAppConfig = (files: AppConfigFiles): boolean => Boolean(files.shared || files.server);

/** The generated module. Exported for tests. */
export function appModuleSource(files: AppConfigFiles, ssr: boolean): string {
  const imports: string[] = [];
  const names: string[] = [];
  const add = (file: string | undefined, name: string) => {
    if (!file) return;
    imports.push(`import * as ${name} from ${JSON.stringify(file)};`);
    names.push(name);
  };
  add(files.shared, 'shared');
  if (ssr) add(files.server, 'server');

  return [
    `import { provideRoot } from '@fluixi/start/di';`,
    `import { collectApp } from '@fluixi/start/app';`,
    ...imports,
    `const app = collectApp([${names.join(', ')}]);`,
    `provideRoot(app.providers);`,
    ssr
      ? ''
      : // The code has already shipped by the time this runs; saying so is what is left.
        `if (import.meta.env.DEV && app.withMiddleware.length) console.warn('[fluixi/app] ' + app.withMiddleware.join(', ') + ' carries middleware, which only runs on the server. Import it from src/app.config.server.ts so it stays out of the browser bundle.');`,
    `export const middleware = ${ssr ? 'app.middleware' : '[]'};`,
    `export const modules = app.modules;`,
  ].join('\n');
}

const stripExt = (file: string) => file.replace(/\?.*$/, '').replace(SOURCE, '');

export function appConfigVitePlugin(cfg: Pick<ResolvedConfig, 'root' | 'clientEntry' | 'serverEntry'>): any {
  const clientEntry = stripExt(resolve(cfg.root, cfg.clientEntry));
  const serverEntry = stripExt(resolve(cfg.root, cfg.serverEntry));

  return {
    name: 'fluixi-app-config',
    enforce: 'pre',
    resolveId(source: string) {
      return source === APP_VMOD ? RESOLVED : null;
    },
    load(id: string, options?: { ssr?: boolean }) {
      if (id !== RESOLVED) return null;
      const files = findAppConfig(cfg.root);
      return appModuleSource(files, Boolean(options?.ssr));
    },
    transform(code: string, id: string, options?: { ssr?: boolean }) {
      if (!SOURCE.test(id.replace(/\?.*$/, ''))) return null;
      const file = stripExt(id);
      const ssr = Boolean(options?.ssr);
      const isClient = !ssr && file === clientEntry;
      const isServer = ssr && file === serverEntry;
      if (!isClient && !isServer) return null;
      if (!hasAppConfig(findAppConfig(cfg.root))) return null;

      // On line 1 without a newline, so every later line keeps its number and the
      // entry's existing source map stays right. Appending at the end shifts nothing.
      let out = `import '${APP_VMOD}';` + code;
      if (isServer) out += `\nexport { middleware as ${APP_MIDDLEWARE_EXPORT} } from '${APP_VMOD}';\n`;
      return { code: out, map: null };
    },
  };
}

const ELEMENT_HYDRATION = '@fluixi/web-components/hydrate';

/**
 * Element hydration for apps that use Fluixi custom elements: the client entry imports
 * `@fluixi/web-components/hydrate` when the package is installed, so an element the server
 * rendered adopts its markup. Elements leave that code out unless something installs it, which
 * keeps it out of elements used in other frameworks; a start app server-renders its elements.
 */
export function elementHydrationVitePlugin(cfg: Pick<ResolvedConfig, 'root' | 'clientEntry'>): any {
  const clientEntry = stripExt(resolve(cfg.root, cfg.clientEntry));
  return {
    name: 'fluixi-element-hydration',
    enforce: 'pre',
    async transform(this: { resolve(source: string, importer: string): Promise<unknown> }, code: string, id: string, options?: { ssr?: boolean }) {
      if (options?.ssr || !SOURCE.test(id.replace(/\?.*$/, '')) || stripExt(id) !== clientEntry) return null;
      if (!(await this.resolve(ELEMENT_HYDRATION, id))) return null;
      // On line 1 without a newline, as the app config import: no later line moves.
      return { code: `import '${ELEMENT_HYDRATION}';` + code, map: null };
    },
  };
}

