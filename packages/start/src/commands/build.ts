import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { FluixiConfig } from '../config.js';
import { resolveConfig } from '../config.js';
import { fluixiPlugins } from '../internal.js';
import { wordmark, step, done, c } from '../ui.js';

/**
 * Production build: a client bundle (browser, with an SSR manifest) and a server
 * bundle (the entry that renders HTML). @fluixi/start provides the fluixi plugins
 * (file routing + JSX/SSR transform), so the app's vite.config keeps only app bits.
 */
export async function build(config: FluixiConfig = {}): Promise<void> {
  const startedAt = Date.now();
  const cfg = resolveConfig(config);
  const { build: viteBuild } = await import('vite');
  const plugins = await fluixiPlugins(cfg);

  process.stdout.write(`\n  ${wordmark()}  ${c.gray('building for production')}\n\n`);

  step('client bundle');
  await viteBuild({
    root: cfg.root,
    plugins,
    logLevel: 'warn',
    build: { outDir: 'dist/client', ssrManifest: true, emptyOutDir: true },
  });

  step('server bundle');
  await viteBuild({
    root: cfg.root,
    plugins,
    ssr: { noExternal: cfg.ssrNoExternal.length ? cfg.ssrNoExternal : undefined },
    build: {
      outDir: 'dist/server',
      ssr: resolve(cfg.root, cfg.serverEntry),
      emptyOutDir: true,
    },
  });

  // Optional request middleware → its own server entry (emptyOutDir:false keeps
  // entry-server.js). createProdHandler picks up dist/server/middleware.js if present.
  const middlewareSrc = resolve(cfg.root, cfg.middleware);
  if (existsSync(middlewareSrc)) {
    step('middleware');
    await viteBuild({
      root: cfg.root,
      plugins,
      logLevel: 'warn',
      ssr: { noExternal: cfg.ssrNoExternal.length ? cfg.ssrNoExternal : undefined },
      build: {
        outDir: 'dist/server',
        ssr: middlewareSrc,
        emptyOutDir: false,
      },
    });
  }

  const ms = Date.now() - startedAt;
  process.stdout.write('\n');
  done(`${c.bold('built')} in ${c.bold(String(ms))} ms  ${c.gray('→ dist/client + dist/server')}\n`);
}
