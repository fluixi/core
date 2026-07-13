import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import init from './index.js';

/** Create the plugin over a real language service + host for one file. */
function plugin(code: string, fileName = '/a.tsx') {
  const files: Record<string, string> = { [fileName]: code };
  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () => Object.keys(files),
    getScriptVersion: () => '1',
    getScriptSnapshot: (f) => {
      if (files[f]) return ts.ScriptSnapshot.fromString(files[f]);
      const d = ts.sys.readFile(f);
      return d !== undefined ? ts.ScriptSnapshot.fromString(d) : undefined;
    },
    getCurrentDirectory: () => '/',
    getCompilationSettings: () => ({ target: ts.ScriptTarget.Latest, noEmit: true, strict: true }),
    getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
  };
  const languageService = ts.createLanguageService(host, ts.createDocumentRegistry());
  const ls = (init as any)({ typescript: ts }).create({ languageService, languageServiceHost: host, project: {}, serverHost: {}, config: {} });
  return { ls, fileName, code };
}

describe('plugin end-to-end (virtual document)', () => {
  it('reports a bad each item property ON THE SOURCE position', () => {
    const code = 'const items = [{ id: 1 }];\nconst t = html`<li each=${items}>${(it) => it.nope}</li>`;';
    const { ls, fileName } = plugin(code);
    const diags = ls.getSemanticDiagnostics(fileName);
    const bad = diags.find((d: ts.Diagnostic) => String(d.messageText).includes('nope'));
    expect(bad).toBeDefined();
    // mapped back to the real source: the span points at `nope` in the template
    expect(code.slice(bad!.start!, bad!.start! + (bad!.length ?? 4))).toContain('nope');
  });

  it('gives no error for correct each-item usage (no implicit-any noise)', () => {
    const code = 'const items = [{ id: 1, label: "a" }];\nconst t = html`<li each=${items}>${(it) => it.label}</li>`;';
    const { ls, fileName } = plugin(code);
    expect(ls.getSemanticDiagnostics(fileName)).toHaveLength(0);
  });

  it('hover on an each param shows the inferred type, at the source position', () => {
    const code = 'const items = [{ id: 1, label: "a" }];\nconst t = html`<li each=${items}>${(it) => it.label}</li>`;';
    const { ls, fileName } = plugin(code);
    const pos = code.indexOf('it.label');
    const info = ls.getQuickInfoAtPosition(fileName, pos);
    const text = (info?.displayParts ?? []).map((p: ts.SymbolDisplayPart) => p.text).join('');
    expect(text).toContain('label');
    // the hover span is on the source `it`
    expect(code.slice(info!.textSpan.start, info!.textSpan.start + info!.textSpan.length)).toBe('it');
  });

  it('completion inside an each callback offers the item members', () => {
    const code = 'const items = [{ id: 1, label: "a" }];\nconst t = html`<li each=${items}>${(it) => it.}</li>`;';
    const { ls, fileName } = plugin(code);
    const pos = code.indexOf('it.') + 3; // right after the dot
    const list = ls.getCompletionsAtPosition(fileName, pos, {});
    const names = (list?.entries ?? []).map((e: ts.CompletionEntry) => e.name);
    expect(names).toContain('id');
    expect(names).toContain('label');
  });

  it('still suppresses "unused" for a component used only in a template', () => {
    const code = "import { Card } from './c';\nconst t = html`<Card />`;";
    const { ls, fileName } = plugin(code);
    const unused = ls.getSemanticDiagnostics(fileName).filter((d: ts.Diagnostic) => d.code === 6133 || d.code === 6192);
    expect(unused).toHaveLength(0);
  });

  it('leaves a plain file (no templates) unchanged', () => {
    const code = 'const x: number = "no";';
    const { ls, fileName } = plugin(code);
    // the real type error is still reported
    expect(ls.getSemanticDiagnostics(fileName).length).toBeGreaterThan(0);
  });
});
