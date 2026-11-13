import type { Server } from 'node:http';
import type { ResolvedConfig } from './config.js';
import { onModuleChange, type DevServer } from './dev-worker.js';
import { isServerHooks, routeUpgrade, type ServerHooks } from './server.js';
import { withDeadline } from './worker.js';

/**
 * Runs the server module beside `fluixi dev`: upgrades go to its hook, except Vite's own HMR
 * socket, and an edit to a file it imports shuts it down and starts it again.
 */
export function devServerHooks(vite: DevServer, cfg: ResolvedConfig, http: Server): { stop(): Promise<void> } {
  const entry = `${cfg.root}/${cfg.server}`.replace(/\\/g, '/');
  let hooks: ServerHooks | undefined;
  let chain = Promise.resolve();

  const stopHooks = async () => {
    const current = hooks;
    hooks = undefined;
    if (current?.shutdown) await withDeadline(Promise.resolve(current.shutdown()), cfg.shutdownTimeoutSeconds, 'shutdown');
  };

  const restart = (reason: string) => {
    chain = chain.then(async () => {
      await stopHooks();
      try {
        const loaded = (await vite.ssrLoadModule('/' + cfg.server)).default;
        if (!isServerHooks(loaded)) throw new Error(`${cfg.server} must default-export defineServer({ ... }) from @fluixi/start/server`);
        await loaded.start?.();
        hooks = loaded;
        if (reason) console.log(`  server module ${reason}`);
      } catch (error) {
        console.warn(`[fluixi] server module not started: ${(error as Error).message}`);
      }
    });
  };

  http.on('upgrade', (request, socket, head) => {
    // Vite's HMR socket shares this server and answers its own protocol.
    if (request.headers['sec-websocket-protocol']?.split(',').some((p) => p.trim().startsWith('vite-'))) return;
    void routeUpgrade(hooks, request, socket, head);
  });
  onModuleChange(vite, entry, () => restart('reloaded'));
  restart('');
  return { stop: () => (chain = chain.then(stopHooks)) };
}
