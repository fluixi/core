import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { FluixiConfig } from '../config.js';
import { resolveConfig } from '../config.js';
import { installCrashGuards, loadServerEnv } from '../internal.js';
import { healthServer, isWorkerJobs, runWorker, stopOnSignal, type WorkerStatus } from '../worker.js';

/** Where `fluixi build` puts the jobs module. */
export const WORKER_OUTPUT = 'dist/server/jobs.js';

/**
 * Production worker: runs the jobs module `fluixi build` produced (`src/jobs.ts` by default) until
 * SIGTERM. With `port`, answers `GET /health` there.
 */
export async function worker(config: FluixiConfig = {}, options: { port?: number } = {}): Promise<void> {
  const cfg = resolveConfig(config);
  installCrashGuards();
  await loadServerEnv(cfg.root, 'production');
  process.env.NODE_ENV ??= 'production';
  const jobs = await loadBuiltJobs(cfg.root, cfg.jobs);
  let status: WorkerStatus = 'starting';
  const health = options.port === undefined ? undefined : healthServer(options.port, () => status);
  const running = await runWorker(jobs);
  status = 'ok';
  stopOnSignal(
    async () => {
      await running.stop(cfg.worker.stopTimeoutSeconds);
      health?.close();
    },
    () => (status = 'stopping'),
  );
}

/** The built jobs module's default export; a clear error when there is none. */
export async function loadBuiltJobs(root: string, source: string) {
  const file = resolve(root, WORKER_OUTPUT);
  if (!existsSync(file)) {
    throw new Error(`fluixi worker: no ${WORKER_OUTPUT}. Write ${source} (default-export createJobs(...)) and run fluixi build.`);
  }
  const jobs = (await import(/* @vite-ignore */ pathToFileURL(file).href)).default;
  if (!isWorkerJobs(jobs)) throw new Error(`fluixi worker: ${source} must default-export createJobs(...) from @fluixi/jobs`);
  return jobs;
}
