import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import ts from 'typescript';
import { checkProject } from './check.js';

let root: string;
const file = (rel: string, text: string) => {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), text);
};

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'fx-check-'));
  file('package.json', '{}');
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('checkProject', () => {
  it('reports browser findings, skips server files, and reads fluixi.config outside include', () => {
    file('tsconfig.json', JSON.stringify({ compilerOptions: { strict: true, noEmit: true }, include: ['src'] }));
    file('fluixi.config.ts', `export default { env: { public: ['API_URL', 'SESSION_SECRET'] } };\n`);
    file(
      'src/routes/page.ts',
      `import { createTokenVerifier } from '@fluixi/oauth2/verify';\n` +
        `export const v = createTokenVerifier({ issuer: 'i', audience: 'a', algorithms: ['none'] });\n` +
        `if (import.meta.env.SSR) console.log(process.env.X);\n` +
        `export const y = process.env.Y;\n`,
    );
    file('src/services/db.server.ts', `export const url = process.env.DATABASE_URL;\n`);

    const found = checkProject(root, ts).map((f) => [f.file, f.line, f.code, f.severity]);
    expect(found).toEqual([
      ['fluixi.config.ts', 1, 9104, 'error'],
      ['src/routes/page.ts', 2, 9107, 'error'],
      ['src/routes/page.ts', 4, 9102, 'warning'],
    ]);
  });

  it('follows the references of a solution-style tsconfig', () => {
    file('tsconfig.json', JSON.stringify({ files: [], references: [{ path: './tsconfig.app.json' }] }));
    file('tsconfig.app.json', JSON.stringify({ compilerOptions: { composite: true }, include: ['src'] }));
    file('src/page.ts', `export const y = process.env.Y;\n`);

    expect(checkProject(root, ts).map((f) => f.file)).toEqual(['src/page.ts']);
  });
});
