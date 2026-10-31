import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

vi.mock('../adapter.js', () => ({
  createProdHandler: async () => async () => new Response('ok'),
  nodeAdapter: { name: 'node', serve: async () => undefined },
}));
vi.mock('../internal.js', async (original) => ({
  ...(await original<typeof import('../internal.js')>()),
  installCrashGuards: () => {},
}));

const { start } = await import('./start.js');
const silent = { name: 'test', serve: async () => undefined };

describe('fluixi start', () => {
  const previous = process.env.NODE_ENV;
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'fluixi-start-'));
  });
  afterEach(() => {
    process.env.NODE_ENV = previous;
  });

  it('runs as production when nothing says otherwise', async () => {
    delete process.env.NODE_ENV;
    await start({ root, adapter: silent as never });
    expect(process.env.NODE_ENV).toBe('production');
  });

  it("keeps a NODE_ENV the deployment set", async () => {
    process.env.NODE_ENV = 'staging';
    await start({ root, adapter: silent as never });
    expect(process.env.NODE_ENV).toBe('staging');
  });
});
