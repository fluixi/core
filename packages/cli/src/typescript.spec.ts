import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { typescriptApi } from './typescript.js';

// An app with `typescript` installed as the given module body.
function app(body?: string): string {
  const root = mkdtempSync(join(tmpdir(), 'fx-ts-'));
  writeFileSync(join(root, 'package.json'), '{"name":"app"}');
  if (body !== undefined) {
    mkdirSync(join(root, 'node_modules', 'typescript'), { recursive: true });
    writeFileSync(join(root, 'node_modules', 'typescript', 'package.json'), '{"name":"typescript","main":"index.js"}');
    writeFileSync(join(root, 'node_modules', 'typescript', 'index.js'), body);
  }
  return root;
}
const own = { createProgram: () => null, version: '6.0.3' };

describe('typescriptApi', () => {
  it("uses the app's TypeScript when it has the compiler API", () => {
    const ts = typescriptApi(app('exports.createProgram = () => null; exports.version = "5.9.3";'), () => own);
    expect(ts.version).toBe('5.9.3');
  });

  it('falls back to its own for TypeScript 7, which ships only the compiler', () => {
    expect(typescriptApi(app('exports.version = "7.0.2";'), () => own).version).toBe('6.0.3');
  });

  it('falls back to its own when the app has no TypeScript', () => {
    expect(typescriptApi(app(), () => own).version).toBe('6.0.3');
  });

  it('really has a classic TypeScript of its own', () => {
    expect(typeof typescriptApi(app('exports.version = "7.0.2";')).createProgram).toBe('function');
  });
});
