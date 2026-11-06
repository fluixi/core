import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadBuiltJobs } from './commands/worker.js';
import { healthServer, isWorkerJobs, runWorker, type WorkerJobs, type WorkerStatus } from './worker.js';

function fakeJobs() {
  const calls: string[] = [];
  const jobs: WorkerJobs = {
    start: async () => void calls.push('start'),
    work: async () => (calls.push('work'), { set: ['repair.daily'], removed: [] }),
    stop: async (options) => void calls.push(`stop ${options?.timeoutSeconds}`),
  };
  return { jobs, calls };
}

describe('worker', () => {
  it('starts the engine before taking jobs, and stops once however often asked', async () => {
    const { jobs, calls } = fakeJobs();
    const lines: string[] = [];
    const running = await runWorker(jobs, (line) => lines.push(line));
    await Promise.all([running.stop(7), running.stop(7)]);
    expect(calls).toEqual(['start', 'work', 'stop 7']);
    expect(lines[0]).toContain('repair.daily');
  });

  it('answers /health with 200 only while taking jobs', async () => {
    let status: WorkerStatus = 'starting';
    const server = healthServer(0, () => status);
    await new Promise((resolve) => server.once('listening', resolve));
    const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    expect((await fetch(`${url}/health`)).status).toBe(503);
    status = 'ok';
    expect((await fetch(`${url}/health`)).status).toBe(200);
    status = 'stopping';
    expect((await fetch(`${url}/health`)).status).toBe(503);
    expect((await fetch(`${url}/other`)).status).toBe(404);
    server.close();
  });

  it('loads the built jobs module, and says what to do when it is missing or wrong', async () => {
    // A folder per case: node caches a module by its address.
    const built = (source?: string) => {
      const root = mkdtempSync(join(tmpdir(), 'fluixi-worker-'));
      if (source) {
        mkdirSync(join(root, 'dist/server'), { recursive: true });
        writeFileSync(join(root, 'dist/server/jobs.js'), source);
      }
      return root;
    };
    await expect(loadBuiltJobs(built(), 'src/jobs.ts')).rejects.toThrow(/fluixi build/);
    await expect(loadBuiltJobs(built('export default { nothing: true };'), 'src/jobs.ts')).rejects.toThrow(/must default-export createJobs/);
    expect(isWorkerJobs(await loadBuiltJobs(built('export default { start() {}, work() {}, stop() {} };'), 'src/jobs.ts'))).toBe(true);
  });
});
