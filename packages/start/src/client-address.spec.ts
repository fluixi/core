import { describe, it, expect } from 'vitest';
import { createServer } from 'node:http';
import { toNodeHandler } from './handler.js';
import { clientAddress, setClientAddress } from './client-address.js';
import { cloudflareEntry, netlifyEntry, vercelEntry, type EntrySource } from './adapters/entry.js';

describe('clientAddress', () => {
  it('is the socket peer on the Node server', async () => {
    let seen: string | undefined;
    const server = createServer(
      toNodeHandler((request) => {
        seen = clientAddress(request);
        return new Response('ok');
      }),
    );
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
    try {
      const { port } = server.address() as { port: number };
      await fetch(`http://127.0.0.1:${port}/`);
      expect(seen).toBe('127.0.0.1');
    } finally {
      server.close();
    }
  });

  it('is undefined for a request no entry recorded', () => {
    expect(clientAddress(new Request('http://x/'))).toBeUndefined();
  });

  const source: EntrySource = {
    serverEntry: './server.js',
    middleware: null,
    template: '',
    ssr: true,
    mountId: 'root',
    prerendered: [],
    routeAssets: {},
  };

  /** Runs a generated entry with its imports swapped for a handler that reports the address. */
  async function load(code: string) {
    const body = code.slice(code.indexOf('\n});\n') + 5);
    const stubs =
      `const { setClientAddress, clientAddress } = globalThis.__fxAddress;\n` +
      `const handler = async (request) => new Response(String(clientAddress(request)));\n`;
    const url = `data:text/javascript;base64,${Buffer.from(stubs + body).toString('base64')}`;
    (globalThis as Record<string, unknown>).__fxAddress = { setClientAddress, clientAddress };
    return (await import(/* @vite-ignore */ url)).default;
  }

  it('comes from cf-connecting-ip on Cloudflare', async () => {
    const worker = await load(cloudflareEntry(source));
    const request = new Request('http://x/page', { headers: { 'cf-connecting-ip': '203.0.113.7' } });
    expect(await (await worker.fetch(request, {}, {})).text()).toBe('203.0.113.7');
  });

  it('comes from context.ip on Netlify', async () => {
    const fn = await load(netlifyEntry(source));
    expect(await (await fn(new Request('http://x/'), { ip: '203.0.113.8' })).text()).toBe('203.0.113.8');
  });

  it('comes from the first x-forwarded-for entry on Vercel', async () => {
    const fn = await load(vercelEntry(source));
    const req = { method: 'GET', url: '/', headers: { host: 'x', 'x-forwarded-for': '203.0.113.9, 10.0.0.1' } };
    let written = '';
    const res = { setHeader() {}, write: (chunk: Uint8Array) => (written += Buffer.from(chunk).toString()), end() {} };
    await fn(req, res);
    expect(written).toBe('203.0.113.9');
  });
});
