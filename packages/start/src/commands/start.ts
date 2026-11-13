import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { FluixiConfig } from '../config.js';
import { resolveConfig } from '../config.js';
import { installCrashGuards, loadServerEnv } from '../internal.js';
import { createProdHandler, nodeAdapter } from '../adapter.js';
import { runWorker, stopOnSignal, withDeadline } from '../worker.js';
import { isServerHooks, type ServerHooks } from '../server.js';
import { loadBuiltJobs } from './worker.js';

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
  // The production server, unless the deployment says otherwise: libraries and the framework
  // read it to drop development output (the release in the mount element's data-fluixi).
  process.env.NODE_ENV ??= 'production';

  const clientDir = resolve(cfg.root, 'dist/client');
  const handler = await createProdHandler(cfg);

  // The configured adapter, or node when there is none. An adapter that returns
  // `{ fetch }` has no process to run: its output is a module the platform imports , 
  // so say that instead of exiting as if the server had started.
  const adapter = cfg.adapter ?? nodeAdapter;
  const hooks = await loadBuiltServerHooks(cfg.root, cfg.server);
  const served = await adapter.serve({ handler, cfg, clientDir, hooks });
  const server = served && typeof served === 'object' && 'close' in served ? served : undefined;
  const worker = cfg.worker.inline ? await runWorker(await loadBuiltJobs(cfg.root, cfg.jobs)) : undefined;
  await hooks?.start?.();
  if (server || worker) {
    // Stop accepting first, so the hooks close sockets nobody can reopen; then wait for open
    // requests. Running jobs keep their own, longer allowance.
    stopOnSignal(() => {
      const closing = server?.close() ?? Promise.resolve();
      const serving = withDeadline(Promise.all([hooks?.shutdown?.(), closing]), cfg.shutdownTimeoutSeconds, 'shutdown');
      return Promise.all([serving, worker?.stop(cfg.worker.stopTimeoutSeconds)]).then(() => undefined);
    });
  }
  if (served && typeof served === 'object' && 'fetch' in served) {
    console.log(
      `  fluixi: the "${adapter.name}" adapter exports a fetch handler — there is no server ` +
        `to start. Deploy dist/ and let the platform invoke it, or run \`fluixi start\` with ` +
        `a filesystem adapter (nodeAdapter).`,
    );
  }
}

/** Where `fluixi build` puts the server module. */
export const SERVER_OUTPUT = 'dist/server/server.js';

/** The built server module's default export, when the app has one; a clear error when it is wrong. */
export async function loadBuiltServerHooks(root: string, source: string): Promise<ServerHooks | undefined> {
  const file = resolve(root, SERVER_OUTPUT);
  if (!existsSync(file)) return undefined;
  const hooks = (await import(/* @vite-ignore */ pathToFileURL(file).href)).default;
  if (!isServerHooks(hooks)) throw new Error(`fluixi start: ${source} must default-export defineServer({ ... }) from @fluixi/start/server`);
  return hooks;
}
