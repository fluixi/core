/** Page files that answer the same address are found at scan time. */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { overlappingRoutes, scanRoutes } from './route-scanner.js';

const tree = (files: string[]) => {
  const root = mkdtempSync(join(tmpdir(), 'fx-routes-'));
  for (const f of files) {
    mkdirSync(join(root, f, '..'), { recursive: true });
    writeFileSync(join(root, f), 'export default () => null;');
  }
  return scanRoutes(root);
};

describe('overlapping routes', () => {
  it('finds two param pages at one level, and the same page in two groups', () => {
    expect(overlappingRoutes(tree(['[a].tsx', '[b].tsx', 'about.tsx']))).toEqual([['[a].tsx', '[b].tsx']]);
    expect(overlappingRoutes(tree(['(x)/team.tsx', '(y)/team.tsx']))).toHaveLength(1);
  });

  it('leaves distinct addresses alone', () => {
    expect(overlappingRoutes(tree(['index.tsx', '[id].tsx', 'users/[id].tsx', 'layout.tsx']))).toEqual([]);
  });
});
