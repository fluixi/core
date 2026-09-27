/**
 * The rules over every source file in this repository: a throw on any real shape of code
 * fails here. In the editor a throw is caught and logged, so the only symptom is findings
 * that never appear, which no assertion on a planted snippet can notice.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import ts from 'typescript';
import { envAuthDiagnostics } from './rules.js';

const repo = resolve(__dirname, '../../..');

function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sources(path, out);
    else if (/\.[cm]?tsx?$/.test(name) && !name.endsWith('.d.ts')) out.push(path);
  }
  return out;
}

describe('the rules over this repository', () => {
  it('never throw', () => {
    const files = ['examples', 'packages', 'apps']
      .map((d) => join(repo, d))
      .filter((d) => {
        try {
          return statSync(d).isDirectory();
        } catch {
          return false;
        }
      })
      .flatMap((d) => sources(d));
    expect(files.length).toBeGreaterThan(500);

    const options: ts.CompilerOptions = { noResolve: true, noLib: true, jsx: ts.JsxEmit.Preserve, allowJs: true, noEmit: true };
    // Parent pointers, as the editor's program has them: the rules walk up through them.
    const program = ts.createProgram({ rootNames: files, options, host: ts.createCompilerHost(options, true) });

    const failures: string[] = [];
    for (const file of files) {
      try {
        envAuthDiagnostics(ts, program, file);
      } catch (error) {
        failures.push(`${file.slice(repo.length + 1)}: ${(error as Error).message}`);
      }
    }
    expect(failures).toEqual([]);
  }, 120_000);
});
