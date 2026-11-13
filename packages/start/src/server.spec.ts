import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { connect, type AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { nodeAdapter, webAdapter, type RunningServer } from './adapter.js';
import { checkServerModule } from './commands/build.js';
import { loadBuiltServerHooks } from './commands/start.js';
import { resolveConfig } from './config.js';
import { defineServer, forwardUpgrade, isServerHooks, type ServerHooks } from './server.js';
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

describe('forwardUpgrade', () => {
  /** An upstream that echoes what it gets after the handshake, and refuses /api/deny. */
  async function upstream() {
    const { createServer } = await import('node:http');
    const seen: Record<string, string | string[] | undefined>[] = [];
    const server = createServer();
    server.on('upgrade', (request, socket) => {
      seen.push(request.headers);
      if (request.url === '/api/deny') return socket.end('HTTP/1.1 401 Unauthorized\r\nX-Why: no ticket\r\nContent-Length: 2\r\n\r\nno');
      socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n');
      socket.on('data', (chunk) => socket.write(Buffer.concat([Buffer.from('echo:'), chunk])));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    return { server, seen, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}` };
  }

  function exchange(port: number, path: string, payload?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let text = '';
      const socket = connect(port, '127.0.0.1', () => {
        socket.write(`GET ${path} HTTP/1.1\r\nHost: app.example.test\r\nConnection: Upgrade\r\nUpgrade: websocket\r\nX-Forwarded-For: 6.6.6.6\r\n\r\n`);
      });
      socket.on('data', (chunk) => {
        text += chunk.toString();
        if (payload && text.includes('\r\n\r\n') && !text.includes(payload)) socket.write(payload);
        if (!payload || text.includes(`echo:${payload}`)) {
          socket.destroy();
          resolve(text);
        }
      });
      socket.once('close', () => resolve(text));
      socket.once('error', reject);
    });
  }

  it('pipes upgrades under the prefix both ways, with the caller address it saw', async () => {
    const far = await upstream();
    const { port, running } = await serve({ upgrade: forwardUpgrade({ to: far.url }) });
    const text = await exchange(port, '/api/v1/live?x=1', 'hello');
    expect(text).toMatch(/^HTTP\/1.1 101/);
    expect(text).toContain('echo:hello');
    expect(far.seen[0]!.host).toBe(new URL(far.url).host);
    expect(far.seen[0]!['x-forwarded-for']).toBe('127.0.0.1');
    await running.close();
    far.server.close();
  });

  it('passes a refusal back whole, leaves other paths, and answers 502 when the far side is down', async () => {
    const far = await upstream();
    const { port, running } = await serve({ upgrade: forwardUpgrade({ to: far.url }) });
    const refused = await exchange(port, '/api/deny');
    expect(refused).toMatch(/^HTTP\/1.1 401/);
    expect(refused).toContain('X-Why: no ticket');
    expect(await exchange(port, '/elsewhere')).toMatch(/^HTTP\/1.1 404/);
    await new Promise((resolve) => far.server.close(resolve));
    expect(await exchange(port, '/api/live')).toMatch(/^HTTP\/1.1 502/);
    await running.close();
  });
});
