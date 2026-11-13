import type { ResolvedConfig } from './config.js';
import { isWorkerJobs, runWorker, type RunningWorker } from './worker.js';

export interface DevServer {
  ssrLoadModule(url: string): Promise<Record<string, unknown>>;
  moduleGraph: { getModulesByFile(file: string): Set<{ file: string | null; importers: Set<unknown> }> | undefined };
  watcher: { on(event: 'change', listener: (file: string) => void): unknown };
}

type GraphNode = { file: string | null; importers: Set<GraphNode> };

/**
 * Runs the jobs module beside `fluixi dev`, and runs it again when a file it imports changes:
 * the old worker stops (its running jobs get a few seconds), the module reloads, a new one starts.
 */
export function devWorker(vite: DevServer, cfg: ResolvedConfig): void {
  const entry = `${cfg.root}/${cfg.jobs}`.replace(/\\/g, '/');
  let running: RunningWorker | undefined;
  let chain = Promise.resolve();

  const restart = (reason: string) => {
    chain = chain.then(async () => {
      await running?.stop(5);
      running = undefined;
      try {
        const jobs = (await vite.ssrLoadModule('/' + cfg.jobs)).default;
        if (!isWorkerJobs(jobs)) throw new Error(`${cfg.jobs} must default-export createJobs(...) from @fluixi/jobs`);
        running = await runWorker(jobs, (line) => console.log(`${line}${reason ? ` (${reason})` : ''}`));
      } catch (error) {
        console.warn(`[fluixi] worker not started: ${(error as Error).message}`);
      }
    });
  };

  onModuleChange(vite, entry, () => restart('reloaded'));
  restart('');
}

/** Calls `changed` when a file `entry` imports, directly or not, changes; bursts settle first. */
export function onModuleChange(vite: DevServer, entry: string, changed: () => void): void {
  const reachesEntry = (file: string) => {
    const seen = new Set<GraphNode>();
    const stack = [...((vite.moduleGraph.getModulesByFile(file) ?? []) as Set<GraphNode>)];
    while (stack.length) {
      const node = stack.pop()!;
      if (seen.has(node)) continue;
      seen.add(node);
      if (node.file === entry) return true;
      stack.push(...node.importers);
    }
    return false;
  };

  let pending: ReturnType<typeof setTimeout> | undefined;
  vite.watcher.on('change', (file) => {
    if (!reachesEntry(file.replace(/\\/g, '/'))) return;
    clearTimeout(pending);
    pending = setTimeout(changed, 100);
  });
}
