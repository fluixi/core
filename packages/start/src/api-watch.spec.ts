/** A route file added while the dev server runs reaches the route table and the route map. */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { apiRoutesVitePlugin } from './api.js';

describe('API routes in dev', () => {
  it('invalidates the table and rewrites api.gen.ts when a route file is added or removed', () => {
    const root = mkdtempSync(join(tmpdir(), 'fx-api-watch-'));
    mkdirSync(join(root, 'src/api/v1'), { recursive: true });
    writeFileSync(join(root, 'src/api/v1/me.ts'), 'export const GET = () => ({});\n');

    const plugin = apiRoutesVitePlugin({ dir: 'src/api' });
    plugin.configResolved({ root });
    const handlers: Record<string, (file: string) => void> = {};
    const invalidated: unknown[] = [];
    const table = { id: 'table' };
    plugin.configureServer({
      watcher: { add: () => {}, on: (event: string, fn: (file: string) => void) => (handlers[event] = fn) },
      moduleGraph: { getModuleById: () => table, invalidateModule: (mod: unknown) => invalidated.push(mod) },
    });

    const added = join(root, 'src/api/v1/organizations.ts');
    writeFileSync(added, 'export const GET = () => [];\n');
    handlers.add(added);
    expect(invalidated).toEqual([table]);
    expect(readFileSync(join(root, 'src/api.gen.ts'), 'utf8')).toContain('"/api/v1/organizations"');

    // A spec beside the routes is not a route.
    handlers.add(join(root, 'src/api/v1/me.spec.ts'));
    expect(invalidated).toHaveLength(1);
  });
});
