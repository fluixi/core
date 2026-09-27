import { describe, it, expect, vi } from 'vitest';
import ts from 'typescript';

vi.mock('./rules.js', async (original) => ({
  ...(await original<typeof import('./rules.js')>()),
  envAuthDiagnostics: () => {
    throw new Error('rule exploded');
  },
}));

const { default: init } = await import('./index.js');

describe('a throwing rule', () => {
  it('keeps the real diagnostics and reports the failure to the tsserver log, once', () => {
    const file = '/app/src/page.ts';
    const code = `export const n: number = 'text';\n`;
    const host: ts.LanguageServiceHost = {
      getScriptFileNames: () => [file],
      getScriptVersion: () => '1',
      getScriptSnapshot: (f) => (f === file ? ts.ScriptSnapshot.fromString(code) : undefined),
      getCurrentDirectory: () => '/app',
      getCompilationSettings: () => ({ noEmit: true, types: [] }),
      getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
      fileExists: (f) => f === file || ts.sys.fileExists(f),
      readFile: (f) => (f === file ? code : ts.sys.readFile(f)),
    };
    const logged: string[] = [];
    const ls = (init as any)({ typescript: ts }).create({
      languageService: ts.createLanguageService(host, ts.createDocumentRegistry()),
      languageServiceHost: host,
      project: { projectService: { logger: { info: (m: string) => logged.push(m) } } },
      serverHost: {},
      config: {},
    }) as ts.LanguageService;

    expect(ls.getSemanticDiagnostics(file).map((d) => d.code)).toEqual([2322]);
    ls.getSemanticDiagnostics(file);
    ls.getSuggestionDiagnostics(file);
    expect(logged).toHaveLength(1);
    expect(logged[0]).toMatch(/^\[fluixi\] env and auth rules failed: Error: rule exploded/);
  });
});
