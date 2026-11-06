import { createServer, type Server } from 'node:http';

/**
 * What `fluixi worker` runs: the default export of the app's jobs module, a `createJobs(...)` from
 * `@fluixi/jobs`. Described by shape, so `@fluixi/start` does not depend on it.
 */
export interface WorkerJobs {
  start(): Promise<void>;
  work(): Promise<{ set: string[]; removed: string[] }>;
  stop(options?: { timeoutSeconds?: number }): Promise<void>;
  onError?(listener: (error: Error) => void): void;
}

export function isWorkerJobs(value: unknown): value is WorkerJobs {
  const jobs = value as Partial<WorkerJobs> | null;
  return !!jobs && typeof jobs.start === 'function' && typeof jobs.work === 'function' && typeof jobs.stop === 'function';
}

export interface RunningWorker {
  /** Stops taking jobs and waits up to `timeoutSeconds` for the running ones. */
  stop(timeoutSeconds?: number): Promise<void>;
}

/** Starts the engine, puts the schedules in place and takes jobs. */
export async function runWorker(jobs: WorkerJobs, log: (line: string) => void = console.log): Promise<RunningWorker> {
  jobs.onError?.((error) => console.warn('[fluixi] worker:', error.message));
  await jobs.start();
  const { set, removed } = await jobs.work();
  log(`  worker taking jobs${set.length ? `, schedules ${set.join(', ')}` : ''}${removed.length ? `, removed ${removed.join(', ')}` : ''}`);
  let stopping: Promise<void> | undefined;
  return { stop: (timeoutSeconds = 30) => (stopping ??= jobs.stop({ timeoutSeconds })) };
}

export type WorkerStatus = 'starting' | 'ok' | 'stopping';

/**
 * `GET /health` on `port`: 200 while the worker takes jobs, 503 while it starts or stops, for a
 * platform's liveness and readiness checks.
 */
export function healthServer(port: number, status: () => WorkerStatus): Server {
  return createServer((request, response) => {
    if (request.url?.split('?')[0] !== '/health') return void response.writeHead(404).end();
    const now = status();
    response.writeHead(now === 'ok' ? 200 : 503, { 'content-type': 'application/json' }).end(JSON.stringify({ status: now }));
  }).listen(port);
}

/**
 * Stops on SIGTERM or SIGINT, waiting up to `timeoutSeconds` for running jobs: the ones left run
 * again on another worker. A second signal exits at once.
 */
export function stopOnSignal(stop: () => Promise<void>, onStopping: () => void = () => {}): void {
  let signalled = false;
  const handle = () => {
    if (signalled) process.exit(1);
    signalled = true;
    onStopping();
    void stop().then(
      () => process.exit(0),
      (error: Error) => {
        console.warn('[fluixi] worker stop failed:', error.message);
        process.exit(1);
      },
    );
  };
  process.on('SIGTERM', handle);
  process.on('SIGINT', handle);
}
