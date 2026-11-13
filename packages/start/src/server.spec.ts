import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { connect, type AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { nodeAdapter, webAdapter, type RunningServer } from './adapter.js';
import { checkServerModule } from './commands/build.js';
import { loadBuiltServerHooks } from './commands/start.js';
import { resolveConfig } from './config.js';
import { defineServer, isServerHooks, type ServerHooks } from './server.js';
import { withDeadline } from './worker.js';

/** Sends a raw upgrade request and returns the first chunk of the answer. */
function upgrade(port: number, path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = connect(port, '127.0.0.1', () => {
      socket.write(`GET ${path} HTTP/1.1\r\nHost: localhost\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n`);
    });
    socket.once('data', (chunk) => {
      resolve(chunk.toString());
      socket.destroy();
    });
    socket.once('error', reject);
  });
}

async function serve(hooks: ServerHooks): Promise<{ port: number; running: RunningServer }> {
  const cfg = resolveConfig({ root: mkdtempSync(join(tmpdir(), 'fluixi-server-')), port: 0 });
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  const running = (await nodeAdapter.serve({ handler: () => new Response('page'), cfg, clientDir: cfg.root, hooks })) as RunningServer;
  // serveNode does not hand back the port; the adapter's log line has it.
  await vi.waitFor(() => expect(log).toHaveBeenCalled());
  const port = Number(String(log.mock.calls[0]![0]).match(/:(\d+)/)![1]);
  log.mockRestore();
  return { port, running };
}

describe('server module', () => {
  it('recognises what defineServer returns', () => {
    expect(isServerHooks(defineServer({ start() {}, upgrade: () => false }))).toBe(true);
    expect(isServerHooks({ upgrade: 'yes' })).toBe(false);
    expect(isServerHooks(null)).toBe(false);
  });

  it('hands upgrades to the hook and answers 404 for those it leaves', async () => {
    const taken: string[] = [];
    const { port, running } = await serve({
      upgrade(request, socket) {
        if (request.url !== '/live') return false;
        taken.push(request.url);
        socket.end('HTTP/1.1 101 Switching Protocols\r\n\r\n');
        return true;
      },
    });
    expect(await upgrade(port, '/live')).toMatch(/^HTTP\/1.1 101/);
    expect(await upgrade(port, '/other')).toMatch(/^HTTP\/1.1 404/);
    expect(taken).toEqual(['/live']);
    await running.close();
  });

  it('answers 404 when the hook throws', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { port, running } = await serve({
      upgrade() {
        throw new Error('hook bug');
      },
    });
    expect(await upgrade(port, '/live')).toMatch(/^HTTP\/1.1 404/);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
    await running.close();
  });

  it('closes the server, then settles', async () => {
    const { port, running } = await serve({});
    await running.close();
    await expect(upgrade(port, '/live')).rejects.toThrow();
  });

  it('loads the built module, and refuses one that is not defineServer', async () => {
    const root = mkdtempSync(join(tmpdir(), 'fluixi-server-'));
    expect(await loadBuiltServerHooks(root, 'src/server.ts')).toBeUndefined();
    mkdirSync(join(root, 'dist/server'), { recursive: true });
    writeFileSync(join(root, 'dist/server/server.js'), 'export default { upgrade: 1 };');
    await expect(loadBuiltServerHooks(root, 'src/server.ts')).rejects.toThrow(/defineServer/);
  });

  it('refuses to build a server module for a serverless adapter', () => {
    const root = mkdtempSync(join(tmpdir(), 'fluixi-server-'));
    mkdirSync(join(root, 'src'));
    expect(() => checkServerModule(resolveConfig({ root, adapter: webAdapter }))).not.toThrow();
    writeFileSync(join(root, 'src/server.ts'), 'export default {};');
    expect(() => checkServerModule(resolveConfig({ root, adapter: webAdapter }))).toThrow(/long-running server/);
    expect(() => checkServerModule(resolveConfig({ root, adapter: nodeAdapter }))).not.toThrow();
  });
});

describe('withDeadline', () => {
  it('settles with the work, or at the deadline when the work hangs', async () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    let settled = false;
    void withDeadline(new Promise(() => {}), 2, 'shutdown').then(() => (settled = true));
    await vi.advanceTimersByTimeAsync(1999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(settled).toBe(true);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('shutdown still running after 2s'));
    await expect(withDeadline(Promise.resolve(), 2, 'shutdown')).resolves.toBeUndefined();
    warn.mockRestore();
    vi.useRealTimers();
  });
});

describe('types', () => {
  it('takes hooks that return whatever promise they have', () => {
    const stop = () => Promise.all([Promise.resolve(1), Promise.resolve('x')]);
    expect(isServerHooks(defineServer({ start: stop, shutdown: stop }))).toBe(true);
  });
});
