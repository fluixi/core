import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { buildVirtual, toGenerated, toSource } from './virtual.js';

function sf(code: string) {
  return ts.createSourceFile('/a.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

/** A language service over the VIRTUAL text, so we can query real types/errors. */
function virtualService(virtualText: string, fileName = '/v.tsx') {
  const files: Record<string, string> = { [fileName]: virtualText };
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
  return { ls: ts.createLanguageService(host, ts.createDocumentRegistry()), fileName };
}

describe('virtual document transform', () => {
  it('types an each callback param so it.prop resolves (and misuse errors)', () => {
    const code =
      'const items = [{ id: 1, label: "a" }];\n' +
      'const t = html`<li each=${items}>${(it) => it.label}</li>`;';
    const v = buildVirtual(ts, sf(code))!;
    expect(v).toBeDefined();
    // the virtual embeds the helper + the verbatim holes
    expect(v.text).toContain('__fxEach(');
    expect(v.text).toContain('it.label');

    const { ls, fileName } = virtualService(v.text);
    // hover `it` in the virtual → real inferred type
    const itPos = v.text.indexOf('it.label');
    const info = ls.getQuickInfoAtPosition(fileName, itPos);
    const hoverText = (info?.displayParts ?? []).map((p) => p.text).join('');
    expect(hoverText).toContain('label');
    // no diagnostics for correct usage
    expect(ls.getSemanticDiagnostics(fileName).filter((d) => d.code !== 2307 && d.code !== 2792)).toHaveLength(0);
  });

  it('reports a real error for misused each item', () => {
    const code =
      'const items = [{ id: 1 }];\n' +
      'const t = html`<li each=${items}>${(it) => it.nope}</li>`;';
    const v = buildVirtual(ts, sf(code))!;
    const { ls, fileName } = virtualService(v.text);
    const diags = ls.getSemanticDiagnostics(fileName);
    expect(diags.length).toBeGreaterThan(0);
    expect(diags.some((d) => String(d.messageText).includes('nope'))).toBe(true);
  });

  it('types an event handler param (e: MouseEvent)', () => {
    const code = 'const t = html`<button @click=${(e) => e.clientX}>x</button>`;';
    const v = buildVirtual(ts, sf(code))!;
    expect(v.text).toContain('__fxOn("click"');
    const { ls, fileName } = virtualService(v.text);
    expect(ls.getSemanticDiagnostics(fileName).filter((d) => d.code !== 2307 && d.code !== 2792)).toHaveLength(0); // clientX is valid on MouseEvent
  });

  it('flags a bad event property', () => {
    const code = 'const t = html`<button @click=${(e) => e.notAThing}>x</button>`;';
    const v = buildVirtual(ts, sf(code))!;
    const { ls, fileName } = virtualService(v.text);
    expect(ls.getSemanticDiagnostics(fileName).length).toBeGreaterThan(0);
  });

  it('maps positions between source and virtual round-trip inside a hole', () => {
    const code = 'const items = [1];\nconst t = html`<li each=${items}>${(it) => it}</li>`;';
    const v = buildVirtual(ts, sf(code))!;
    const srcPos = code.indexOf('items}'); // inside the each hole
    const gen = toGenerated(v.segments, srcPos);
    expect(gen).toBeGreaterThan(-1);
    expect(toSource(v.segments, gen)).toBe(srcPos);
  });

  it('returns undefined when the file has no html`` templates', () => {
    expect(buildVirtual(ts, sf('const x = 1;'))).toBeUndefined();
  });
});
