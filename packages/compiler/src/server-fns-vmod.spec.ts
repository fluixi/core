import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { serverFunctionsVitePlugin } from './integrations.js';

describe('virtual:fluixi-server-fns', () => {
  const dirs: string[] = [];
  afterEach(() => { while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true }); });

  it('side-effect imports every module containing "use server"', () => {
    const root = mkdtempSync(join(tmpdir(), 'fx-sfn-'));
    dirs.push(root);
    mkdirSync(join(root, 'src/routes'), { recursive: true });
    writeFileSync(join(root, 'src/a.ts'), `export const f = () => { 'use server'; return 1; };`);
    writeFileSync(join(root, 'src/routes/lazy.tsx'), `export default () => { 'use server'; return 2; };`);
    writeFileSync(join(root, 'src/plain.ts'), `export const g = () => 3;`);

    const p: any = serverFunctionsVitePlugin();
    p.configResolved({ root });
    expect(p.resolveId('virtual:fluixi-server-fns')).toBe('\0virtual:fluixi-server-fns');
    const code = p.load('\0virtual:fluixi-server-fns') as string;
    expect(code).toContain('src/a.ts');
    expect(code).toContain('routes/lazy.tsx');
    expect(code).not.toContain('plain.ts'); // no directive → not imported
  });
});
