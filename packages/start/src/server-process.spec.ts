import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { connect } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const jiti = fileURLToPath(new URL('../../../node_modules/jiti/lib/jiti-cli.mjs', import.meta.url));
const startModule = fileURLToPath(new URL('./commands/start.ts', import.meta.url));

/** An app as `fluixi build` leaves it, with only a server module: `shutdown` waits `wait` ms, or hangs. */
function app(wait: number): string {
  const root = mkdtempSync(join(tmpdir(), 'fluixi-server-process-'));
  mkdirSync(join(root, 'dist/server'), { recursive: true });
  mkdirSync(join(root, 'dist/client'), { recursive: true });
  writeFileSync(
    join(root, 'dist/server/server.js'),
    `export default {
  start() { console.log('HOOK start'); },
  upgrade(request, socket) {
    if (request.url !== '/live') return false;
    socket.end('HTTP/1.1 101 Switching Protocols\\r\\n\\r\\n');
    return true;
  },
  // A negative wait never settles and holds a timer, as a shutdown stuck on a live socket would.
  shutdown: () => new Promise((resolve) => { console.log('HOOK shutdown'); if (${wait} >= 0) setTimeout(resolve, ${wait}); else setInterval(() => {}, 1000); }),
};`,
  );
  const runner = join(root, 'run.ts');
  writeFileSync(runner, `import { start } from ${JSON.stringify(startModule)};\nawait start({ root: ${JSON.stringify(root)}, apiOnly: true, port: 0, shutdownTimeoutSeconds: 1 });\n`);
  return runner;
}

function run(runner: string) {
  const child = spawn(process.execPath, [jiti, runner], { stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', (chunk) => (output += chunk));
  child.stderr.on('data', (chunk) => (output += chunk));
  const port = new Promise<number>((resolve, reject) => {
    const poll = setInterval(() => {
      const found = output.match(/localhost:(\d+)/);
      if (found && output.includes('HOOK start')) {
        clearInterval(poll);
        resolve(Number(found[1]));
      }
    }, 20);
    child.once('exit', () => (clearInterval(poll), reject(new Error(output))));
  });
  const exited = new Promise<number | null>((resolve) => child.once('exit', (code) => resolve(code)));
  return { child, port, exited, output: () => output };
}

function upgrade(port: number, path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = connect(port, '127.0.0.1', () => socket.write(`GET ${path} HTTP/1.1\r\nHost: x\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n`));
    socket.once('data', (chunk) => (resolve(chunk.toString().split('\r\n')[0]!), socket.destroy()));
    socket.once('error', reject);
  });
}

describe('fluixi start with a server module, as a process', () => {
  it('starts the hooks, routes upgrades, and on SIGTERM runs shutdown and exits cleanly', async () => {
    const process_ = run(app(50));
    const port = await process_.port;
    expect(await upgrade(port, '/live')).toBe('HTTP/1.1 101 Switching Protocols');
    expect(await upgrade(port, '/other')).toBe('HTTP/1.1 404 Not Found');
    process_.child.kill('SIGTERM');
    expect(await process_.exited).toBe(0);
    expect(process_.output()).toContain('HOOK shutdown');
  }, 30_000);

  it('exits at the deadline when shutdown never settles', async () => {
    const process_ = run(app(-1));
    await process_.port;
    const sent = Date.now();
    process_.child.kill('SIGTERM');
    expect(await process_.exited).toBe(0);
    expect(Date.now() - sent).toBeGreaterThanOrEqual(900);
    expect(process_.output()).toContain('shutdown still running after 1s');
  }, 30_000);
});
