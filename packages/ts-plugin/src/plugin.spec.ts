import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import init from './index.js';

// `html`/`svg` are imported in real code; declare them globally in a separate
// file so the tag resolves WITHOUT shifting the user-code positions.
const GLOBALS = '/globals.d.ts';
const GLOBALS_SRC = 'declare function html(s: TemplateStringsArray, ...v: any[]): any;\ndeclare function svg(s: TemplateStringsArray, ...v: any[]): any;\n';

/** Create the plugin over a real language service + host for one file. */
function plugin(code: string, fileName = '/a.tsx') {
  const files: Record<string, string> = { [fileName]: code, [GLOBALS]: GLOBALS_SRC };
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

describe('component prop completion + hover', () => {
  it('completes a partial component prop name', () => {
    const code =
      'function Card(props: { alpha?: string; beta?: number }) { return null as any; }\n' +
      'const t = html`<Card al></Card>`;';
    const { ls, fileName } = plugin(code);
    const pos = code.indexOf('<Card al') + '<Card al'.length; // after `al`
    const list = ls.getCompletionsAtPosition(fileName, pos, {});
    const names = (list?.entries ?? []).map((e: ts.CompletionEntry) => e.name);
    expect(names).toContain('alpha');
    expect(names).toContain('beta');
  });

  it('hovers a component prop name showing its type', () => {
    const code =
      'function Card(props: { header?: string }) { return null as any; }\n' +
      'const t = html`<Card header=${"x"}></Card>`;';
    const { ls, fileName } = plugin(code);
    const pos = code.indexOf('header=');
    const info = ls.getQuickInfoAtPosition(fileName, pos);
    const text = (info?.displayParts ?? []).map((p: ts.SymbolDisplayPart) => p.text).join('');
    expect(text).toContain('header');
    expect(text).toContain('string');
  });

  it('type-checks a wrong prop value', () => {
    const code =
      'function Card(props: { count?: number }) { return null as any; }\n' +
      'const t = html`<Card count=${"nope"}></Card>`;';
    const { ls, fileName } = plugin(code);
    const diags = ls.getSemanticDiagnostics(fileName);
    expect(diags.some((d: ts.Diagnostic) => String(d.messageText).includes('count') || String(d.messageText).includes('number'))).toBe(true);
  });
});

describe('ref element type inference', () => {
  it('infers the element type in a ref callback', () => {
    const code = 'const t = html`<input ref=${(el) => el.value}></input>`;';
    const { ls, fileName } = plugin(code);
    const pos = code.indexOf('el.value');
    const info = ls.getQuickInfoAtPosition(fileName, pos);
    const text = (info?.displayParts ?? []).map((p: ts.SymbolDisplayPart) => p.text).join('');
    expect(text).toContain('HTMLInputElement');
  });

  it('flags a property not on the inferred element', () => {
    const code = 'const t = html`<input ref=${(el) => el.nope}></input>`;';
    const { ls, fileName } = plugin(code);
    expect(ls.getSemanticDiagnostics(fileName).some((d: ts.Diagnostic) => String(d.messageText).includes('nope'))).toBe(true);
  });
});

describe('control-flow prop hover + use inference', () => {
  it('hovers Show when/fallback and Portal mount (inline types, no @fluixi/core)', () => {
    const showCode = 'const cond = true;\nconst t = html`<Show when=${cond} fallback=${"x"}>hi</Show>`;';
    const { ls: ls1, fileName: f1 } = plugin(showCode);
    const w = ls1.getQuickInfoAtPosition(f1, showCode.indexOf('when='));
    expect((w?.displayParts ?? []).map((p: ts.SymbolDisplayPart) => p.text).join('')).toContain('when');
    const portalCode = 'const t = html`<Portal mount=${document.body}>x</Portal>`;';
    const { ls: ls2, fileName: f2 } = plugin(portalCode);
    const m = ls2.getQuickInfoAtPosition(f2, portalCode.indexOf('mount='));
    expect((m?.displayParts ?? []).map((p: ts.SymbolDisplayPart) => p.text).join('')).toContain('mount');
  });

  it('completes control-flow prop names', () => {
    const code = 'const t = html`<Show wh></Show>`;';
    const { ls, fileName } = plugin(code);
    const list = ls.getCompletionsAtPosition(fileName, code.indexOf('<Show wh') + '<Show wh'.length, {});
    expect((list?.entries ?? []).map((e: ts.CompletionEntry) => e.name)).toContain('when');
  });

  it('use callback infers the element type', () => {
    const code = 'const t = html`<input use=${(el) => el.value}></input>`;';
    const { ls, fileName } = plugin(code);
    const info = ls.getQuickInfoAtPosition(fileName, code.indexOf('el.value'));
    expect((info?.displayParts ?? []).map((p: ts.SymbolDisplayPart) => p.text).join('')).toContain('HTMLInputElement');
  });
});
