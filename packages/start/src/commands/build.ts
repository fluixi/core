import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { FluixiConfig } from '../config.js';
import { resolveConfig } from '../config.js';
import { fluixiPlugins } from '../internal.js';

/**
 * Production build: a client bundle (browser, with an SSR manifest) and a server
 * bundle (the entry that renders HTML). @fluixi/start provides the kettlejs plugins
 * (file routing + JSX/SSR transform), so the app's vite.config keeps only app bits.
 */
export async function build(config: FluixiConfig = {}): Promise<void> {
  const cfg = resolveConfig(config);
  const { build: viteBuild } = await import('vite');
  const plugins = await fluixiPlugins(cfg);

  console.log('  fluixi build → client');
  await viteBuild({
    root: cfg.root,
    plugins,
    build: { outDir: 'dist/client', ssrManifest: true, emptyOutDir: true },
  });

  console.log('  fluixi build → server');
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
    console.log('  fluixi build → middleware');
    await viteBuild({
      root: cfg.root,
      plugins,
      ssr: { noExternal: cfg.ssrNoExternal.length ? cfg.ssrNoExternal : undefined },
      build: {
        outDir: 'dist/server',
        ssr: middlewareSrc,
        emptyOutDir: false,
      },
    });
  }

  console.log('  fluixi build → done (dist/client + dist/server)');
}
