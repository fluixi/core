import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import init from './index.js';

const GLOBALS = '/globals.d.ts';
const GLOBALS_SRC = 'declare function html(s: TemplateStringsArray, ...v: any[]): any;\n';
const ACCESSOR_NOT_CALLED = 9001;

function plugin(code: string, fileName = '/a.ts') {
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
  const ls = (init as any)({ typescript: ts }).create({
    languageService,
    languageServiceHost: host,
    project: {},
    serverHost: {},
    config: {},
  });
  return { ls, fileName, code };
}

/** Apply text changes to source, latest first so offsets stay valid. */
function apply(code: string, changes: readonly ts.TextChange[]): string {
  return [...changes]
    .sort((a, b) => b.span.start - a.span.start)
    .reduce(
      (text, c) => text.slice(0, c.span.start) + c.newText + text.slice(c.span.start + c.span.length),
      code,
    );
}

describe('call-the-accessor fix', () => {
  const code = 'declare const count: () => number;\nconst t = html`<div>${count}</div>`;';

  it('offers a fix on the diagnostic', () => {
    const { ls, fileName } = plugin(code);
    const at = code.indexOf('${count}') + 2;

    const fixes = ls.getCodeFixesAtPosition(fileName, at, at + 5, [ACCESSOR_NOT_CALLED], {}, {});
    const own = fixes.filter((f: ts.CodeFixAction) => f.fixName === 'fluixiCallAccessor');
    expect(own).toHaveLength(1);
    expect(own[0].description).toContain('count');
  });

  it('produces an edit that actually adds the call', () => {
    const { ls, fileName } = plugin(code);
    const at = code.indexOf('${count}') + 2;

    const fix = ls
      .getCodeFixesAtPosition(fileName, at, at + 5, [ACCESSOR_NOT_CALLED], {}, {})
      .find((f: ts.CodeFixAction) => f.fixName === 'fluixiCallAccessor')!;

    expect(apply(code, fix.changes[0].textChanges)).toContain('${count()}');
  });

  it("leaves TypeScript's own fixes in place", () => {
    // A file with a real TS error, asked about TS's code, the plugin adds nothing
    // and must not remove anything.
    const withError = 'const n: number = "no";';
    const { ls, fileName } = plugin(withError);
    const at = withError.indexOf('"no"');
    const fixes = ls.getCodeFixesAtPosition(fileName, at, at + 4, [2322], {}, {});
    expect(fixes.every((f: ts.CodeFixAction) => f.fixName !== 'fluixiCallAccessor')).toBe(true);
  });

  it('offers nothing for an unrelated error code', () => {
    const { ls, fileName } = plugin(code);
    const at = code.indexOf('${count}') + 2;
    const fixes = ls.getCodeFixesAtPosition(fileName, at, at + 5, [2339], {}, {});
    expect(fixes.filter((f: ts.CodeFixAction) => f.fixName === 'fluixiCallAccessor')).toHaveLength(0);
  });

  it('fixes every occurrence at once, without shifting offsets', () => {
    const many =
      'declare const a: () => number;\ndeclare const b: () => number;\n' +
      'const t = html`<div>${a}</div><p>${b}</p>`;';
    const { ls, fileName } = plugin(many);

    const combined = ls.getCombinedCodeFix(
      { type: 'file', fileName },
      'fluixiCallAccessor',
      {},
      {},
    );
    const fixed = apply(many, combined.changes[0].textChanges);
    expect(fixed).toContain('${a()}');
    expect(fixed).toContain('${b()}');
  });
});
