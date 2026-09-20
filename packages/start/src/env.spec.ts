import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadServerEnv } from './internal.js';

describe('loadServerEnv (env management)', () => {
  const dirs: string[] = [];
  const added: string[] = [];
  afterEach(() => {
    while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
    while (added.length) delete process.env[added.pop()!];
  });

  it('loads .env vars (incl. non-VITE_ secrets) into process.env for server code', async () => {
    const root = mkdtempSync(join(tmpdir(), 'fx-env-'));
    dirs.push(root);
    writeFileSync(join(root, '.env'), 'FX_TEST_SECRET=s3cr3t\nVITE_FX_TEST_PUBLIC=pub\n');
    added.push('FX_TEST_SECRET', 'VITE_FX_TEST_PUBLIC');

    await loadServerEnv(root, 'development');
    // The secret (server-only: never inlined into the client bundle) reaches process.env.
    expect(process.env.FX_TEST_SECRET).toBe('s3cr3t');
    expect(process.env.VITE_FX_TEST_PUBLIC).toBe('pub');
  });

  it('never overwrites a real (OS) env var — deploys/secret managers win', async () => {
    const root = mkdtempSync(join(tmpdir(), 'fx-env-'));
    dirs.push(root);
    writeFileSync(join(root, '.env'), 'FX_TEST_OVERRIDE=from-file\n');
    process.env.FX_TEST_OVERRIDE = 'from-os';
    added.push('FX_TEST_OVERRIDE');

    await loadServerEnv(root, 'development');
    expect(process.env.FX_TEST_OVERRIDE).toBe('from-os');
  });
});
