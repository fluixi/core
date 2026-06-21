import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { writeFile, unlink } from 'node:fs/promises';
import { resolve, isAbsolute } from 'node:path';

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
  /** File-routes directory (passed to fluixiRoutesPlugin). Default: src/routes */
  routesDir?: string;
  /** Request middleware module (default-exports `defineMiddleware([...])`). Default: src/middleware.ts */
  middleware?: string;
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
    middleware: config.middleware ?? 'src/middleware.ts',
    ssrNoExternal: config.ssrNoExternal ?? [],
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
 * No config is fine too — every field has a default.
 */
export async function loadConfig(root = process.cwd()): Promise<FluixiConfig> {
  for (const name of CONFIG_NAMES) {
    const file = resolve(root, name);
    if (existsSync(file)) return loadConfigFile(file);
  }
  return {};
}

async function loadConfigFile(file: string): Promise<FluixiConfig> {
  // Plain ESM (.mjs/.js) — import directly, no transform needed.
  if (!/\.[mc]?ts$/.test(file)) {
    const mod = await import(/* @vite-ignore */ pathToFileURL(file).href);
    return (mod.default ?? mod) as FluixiConfig;
  }

  // TypeScript — bundle with esbuild, keeping bare specifiers external so
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
