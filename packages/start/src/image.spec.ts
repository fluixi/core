import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createImageHandler, imageLoader } from './image.js';

describe('imageLoader', () => {
  it('builds an optimization URL for the handler path', () => {
    const loader = imageLoader({ path: '/api/image' });
    expect(loader({ src: '/a.jpg', width: 240, quality: 70 })).toBe('/api/image?url=%2Fa.jpg&w=240&q=70');
    expect(loader({ src: '/a.jpg', width: 240 })).toBe('/api/image?url=%2Fa.jpg&w=240');
  });

  it('defaults the path to /api/image', () => {
    expect(imageLoader()({ src: '/a.jpg', width: 100 })).toBe('/api/image?url=%2Fa.jpg&w=100');
  });
});

describe('createImageHandler', () => {
  let root: string;
  const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG magic bytes

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'fluixi-img-'));
    writeFileSync(join(root, 'cat.png'), PNG);
  });
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  const handle = (path: string, accept = '') =>
    createImageHandler({ root, domains: ['cdn.example.com'] })(
      new Request(`http://x${path}`, { headers: accept ? { accept } : {} }),
    );

  it('serves a local file with immutable cache headers (passthrough without sharp)', async () => {
    const res = await handle('/api/image?url=/cat.png&w=64');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(res.headers.get('cache-control')).toContain('immutable');
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(PNG);
  });

  it('400s on a missing url or a width outside the allow-list', async () => {
    expect((await handle('/api/image?w=64')).status).toBe(400);
    expect((await handle('/api/image?url=/cat.png&w=63')).status).toBe(400);
  });

  it('403s on path traversal', async () => {
    expect((await handle('/api/image?url=/../secret&w=64')).status).toBe(403);
  });

  it('403s on a remote domain that is not allow-listed', async () => {
    expect((await handle('/api/image?url=https://evil.com/a.jpg&w=64')).status).toBe(403);
  });

  it('404s on a missing local file', async () => {
    expect((await handle('/api/image?url=/nope.png&w=64')).status).toBe(404);
  });
});
