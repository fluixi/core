import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { gzipSync } from 'node:zlib';
import { forward } from './forward.js';
import { setClientAddress } from './client-address.js';

let upstream: Server;
let origin = '';

beforeAll(async () => {
  upstream = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    if (req.url === '/api/gzip') {
      res.writeHead(200, { 'content-type': 'text/plain', 'content-encoding': 'gzip' });
      res.end(gzipSync('decoded'));
      return;
    }
    res.setHeader('set-cookie', ['session=a; HttpOnly', 'session_data=b; HttpOnly']);
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ method: req.method, url: req.url, headers: req.headers, body: Buffer.concat(chunks).toString() }));
  });
  await new Promise<void>((done) => upstream.listen(0, '127.0.0.1', done));
  origin = `http://127.0.0.1:${(upstream.address() as { port: number }).port}`;
});
afterAll(() => upstream.close());

const next = () => Promise.resolve(new Response('page'));

describe('forward', () => {
  it('sends the path, query, method and body on, and brings every cookie back', async () => {
    const request = setClientAddress(
      new Request('https://app.example.test/api/v1/things?page=2', {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: 's=1', connection: 'keep-alive', 'x-forwarded-for': '6.6.6.6' },
        body: JSON.stringify({ name: 'x' }),
      }),
      '203.0.113.4',
    );
    const res = await forward({ to: origin })(request, next);
    const seen = await res.json();
    expect(seen).toMatchObject({ method: 'POST', url: '/api/v1/things?page=2', body: '{"name":"x"}' });
    expect(seen.headers).toMatchObject({
      cookie: 's=1',
      'x-forwarded-for': '203.0.113.4',
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'app.example.test',
    });
    expect(seen.headers.host).toBe(new URL(origin).host);
    expect(res.headers.getSetCookie()).toEqual(['session=a; HttpOnly', 'session_data=b; HttpOnly']);
  });

  it('drops a forwarded-for the client wrote when this server knows no address', async () => {
    const res = await forward({ to: origin })(new Request('http://app.test/api/x', { headers: { 'x-forwarded-for': '6.6.6.6' } }), next);
    expect((await res.json()).headers['x-forwarded-for']).toBeUndefined();
  });

  it('returns the decoded body without the encoding it came with', async () => {
    const res = await forward({ to: origin })(new Request('http://app.test/api/gzip'), next);
    expect(await res.text()).toBe('decoded');
    expect(res.headers.has('content-encoding')).toBe(false);
  });

  it('leaves paths outside the prefix to the app', async () => {
    const res = await forward({ to: origin })(new Request('http://app.test/apiary'), next);
    expect(await res.text()).toBe('page');
  });

  it('answers 502 when the upstream is down', async () => {
    const res = await forward({ to: 'http://127.0.0.1:9' })(new Request('http://app.test/api/x'), next);
    expect(res.status).toBe(502);
    expect((await res.json()).error.code).toBe('upstream_unavailable');
  });
});
