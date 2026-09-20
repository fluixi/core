import { resolve } from 'node:path';
import type { FluixiConfig } from '../config.js';
import { resolveConfig } from '../config.js';
import { installCrashGuards, loadServerEnv } from '../internal.js';
import { createProdHandler, nodeAdapter } from '../adapter.js';

/**
 * Production server: build the runtime-neutral SSR fetch handler from the `fluixi
 * build` output and serve it via the Node adapter (static files from dist/client +
 * SSR for everything else). Other runtimes (edge/Bun/Deno) use the same
 * `createProdHandler` with their own adapter: `export default { fetch }`.
 */
export async function start(config: FluixiConfig = {}): Promise<void> {
  const cfg = resolveConfig(config);
  installCrashGuards();
  await loadServerEnv(cfg.root, 'production'); // .env → process.env (server-only secrets)

  const clientDir = resolve(cfg.root, 'dist/client');
  const handler = await createProdHandler(cfg);

  // The configured adapter, or node when there is none. An adapter that returns
  // `{ fetch }` has no process to run: its output is a module the platform imports , 
  // so say that instead of exiting as if the server had started.
  const adapter = cfg.adapter ?? nodeAdapter;
  const served = await adapter.serve({ handler, cfg, clientDir });
  if (served && typeof served === 'object' && 'fetch' in served) {
    console.log(
      `  fluixi: the "${adapter.name}" adapter exports a fetch handler — there is no server ` +
        `to start. Deploy dist/ and let the platform invoke it, or run \`fluixi start\` with ` +
        `a filesystem adapter (nodeAdapter).`,
    );
  }
}
