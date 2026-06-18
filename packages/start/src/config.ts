import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Fluixi app config. Place in `fluixi.config.{ts,js,mjs}` at the app root and wrap
 * with `defineConfig` for types. Everything is optional — the defaults match the
 * conventional layout (src/entry-server.ts, src/entry-client.ts, index.html).
 */
export interface FluixiConfig {
  /** App root directory. Default: process.cwd(). */
  root?: string;
  /** Dev/prod server port. Default: 3000. */
  port?: number;
  /** Server entry exporting `render(url): string | Promise<string>`. Default: src/entry-server.ts */
  serverEntry?: string;
  /** Client hydration entry. Default: src/entry-client.ts */
  clientEntry?: string;
  /** HTML template. Default: index.html */
  template?: string;
  /** Element id the app HTML is injected into (`<div id="…"></div>`). Default: root */
  mountId?: string;
  /** File-routes directory (passed to kettleRoutesPlugin). Default: src/routes */
  routesDir?: string;
  /** SSR deps Vite must bundle (no-external) — e.g. ESM packages without file extensions. */
  ssrNoExternal?: string[];
}

export type ResolvedConfig = Required<Omit<FluixiConfig, 'ssrNoExternal'>> & {
  ssrNoExternal: string[];
};

/** Identity helper for editor types in `fluixi.config.ts`. */
export function defineConfig(config: FluixiConfig): FluixiConfig {
  return config;
}

/** Apply defaults. */
export function resolveConfig(config: FluixiConfig = {}): ResolvedConfig {
  const root = resolve(config.root ?? process.cwd());
  return {
    root,
    port: config.port ?? 3000,
    serverEntry: config.serverEntry ?? 'src/entry-server.ts',
    clientEntry: config.clientEntry ?? 'src/entry-client.ts',
    template: config.template ?? 'index.html',
    mountId: config.mountId ?? 'root',
    routesDir: config.routesDir ?? 'src/routes',
    ssrNoExternal: config.ssrNoExternal ?? [],
  };
}

/**
 * Load `fluixi.config.{mjs,js}` from the app root. TS config support (via a
 * loader) is a follow-up; for now an mjs/js config or no config both work.
 */
export async function loadConfig(root = process.cwd()): Promise<FluixiConfig> {
  for (const name of ['fluixi.config.mjs', 'fluixi.config.js']) {
    const file = resolve(root, name);
    if (existsSync(file)) {
      const mod = await import(pathToFileURL(file).href);
      return (mod.default ?? mod) as FluixiConfig;
    }
  }
  return {};
}
