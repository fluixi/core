import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequestHandler, withStaticFiles } from './handler.js';
import { webAdapter } from './adapter.js';

describe('@fluixi/start adapters', () => {
  it('webAdapter exposes the handler as a { fetch } export (edge/Bun/Deno/CF)', () => {
    const handler = createRequestHandler(() => 'X');
    const out = webAdapter.serve({ handler, cfg: {} as any, clientDir: '' });
    expect(out).toHaveProperty('fetch');
    expect((out as { fetch: unknown }).fetch).toBe(handler);
  });

  it('withStaticFiles serves a real asset, else falls through to SSR', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'fx-'));
    writeFileSync(join(dir, 'app.js'), 'console.log(1)');
    const handler = withStaticFiles(createRequestHandler(() => 'SSR'), dir);

    const asset = await handler(new Request('http://x/app.js'));
    expect(asset.headers.get('content-type')).toContain('javascript');
    expect(await asset.text()).toContain('console.log(1)');

    // no extension → page → SSR
    expect(await (await handler(new Request('http://x/about'))).text()).toBe('SSR');
    // extension but missing → SSR fall-through (SPA-ish)
    expect(await (await handler(new Request('http://x/missing.css'))).text()).toBe('SSR');
  });
});
