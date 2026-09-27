import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { apiPath, appInfo, moduleNames } from './info.js';
import { envReport } from './env.js';

describe('moduleNames', () => {
  it('splits the array at its own commas, not a nested call', () => {
    const src = `export default defineApp({ imports: [AuthModule, feature({ a: [1, 2] }),\n  // note\n  Other] });`;
    expect(moduleNames(src)).toEqual(['AuthModule', 'feature({ a: [1, 2] })', 'Other']);
  });

  it('returns any other expression whole', () => {
    const src = `defineApp({\n  imports: env('AUTH_TOKENS') === 'server' ? [authServer()] : [],\n});`;
    expect(moduleNames(src)).toEqual(["env('AUTH_TOKENS') === 'server' ? [authServer()] : []"]);
  });

  it('is empty for an empty list or none', () => {
    expect(moduleNames('defineApp({ imports: [] })')).toEqual([]);
    expect(moduleNames('defineApp({})')).toEqual([]);
  });
});

describe('apiPath', () => {
  it('writes params and catch-alls the way the router matches them', () => {
    expect(apiPath('users/[id].ts')).toBe('/api/users/:id');
    expect(apiPath('auth/[...all].ts')).toBe('/api/auth/*all');
    expect(apiPath('index.ts')).toBe('/api');
  });
});

describe('an app on disk', () => {
  let root: string;
  const file = (rel: string, text: string) => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  };
  const saved = { ...process.env };

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'fx-info-'));
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
    process.env = { ...saved };
  });

  it('lists pages, API routes with their methods, and modules', async () => {
    file('src/routes/index.tsx', 'export default () => null;');
    file('src/routes/users/[id].tsx', 'export default () => null;');
    file('src/api/me.ts', 'export async function GET() {}\nexport const POST = () => {};');
    file('src/api/me.spec.ts', 'export function GET() {}');
    file('src/app.config.ts', 'export default defineApp({ imports: [AuthModule] });');

    const r = await appInfo({ root });
    expect(r.pages).toEqual(['/', '/users/:id']);
    expect(r.api).toEqual([{ path: '/api/me', file: 'src/api/me.ts', methods: ['GET', 'POST'] }]);
    expect(r.modules).toEqual({ 'src/app.config.ts': ['AuthModule'] });
  });

  it('reports env.public values, the example file and secrets that would ship', async () => {
    file('.env', 'VITE_API_URL=https://api\nFXTEST_LOCAL_ONLY=1\nVITE_DB_PASSWORD=x\n');
    file('.env.example', 'API_URL=\nFXTEST_MISSING=\n');
    mkdirSync(join(root, 'src'));
    const r = await envReport({ root, env: { public: ['API_URL', 'FXTEST_UNSET', 'FXTEST_SECRET'] } });

    expect(r.public).toEqual([
      { name: 'API_URL', set: true },
      { name: 'FXTEST_UNSET', set: false },
      { name: 'FXTEST_SECRET', set: false },
    ]);
    expect(r.missing).toEqual(['FXTEST_MISSING']);
    expect(r.undocumented).toEqual(['FXTEST_LOCAL_ONLY', 'VITE_DB_PASSWORD']);
    expect(r.secretPublic).toEqual(['FXTEST_SECRET']);
    expect(r.exposed).toEqual([{ name: 'VITE_DB_PASSWORD', file: '.env' }]);
    expect(r.types).toBe(join(root, 'src/fluixi-env-vars.d.ts'));
  });
});
