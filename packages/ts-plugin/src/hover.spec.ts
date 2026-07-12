import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { componentQuickInfo } from './hover.js';

/** A real in-memory language service over one file. */
function service(code: string, fileName = '/a.tsx') {
  const files: Record<string, string> = { [fileName]: code };
  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () => Object.keys(files),
    getScriptVersion: () => '1',
    getScriptSnapshot: (f) => (files[f] ? ts.ScriptSnapshot.fromString(files[f]) : undefined),
    getCurrentDirectory: () => '/',
    getCompilationSettings: () => ({ jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.Latest, noEmit: true }),
    getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
  };
  return { ls: ts.createLanguageService(host, ts.createDocumentRegistry()), fileName };
}

function displayText(info: ts.QuickInfo | undefined): string {
  return (info?.displayParts ?? []).map((p) => p.text).join('');
}

describe('componentQuickInfo', () => {
  it('shows a component function signature when hovering its tag', () => {
    const code = 'function AsyncName(props: { title?: string }) { return null as any; }\nconst t = html`<main><AsyncName /></main>`;';
    const { ls, fileName } = service(code);
    const pos = code.indexOf('AsyncName />') + 2; // inside the tag name in the template
    const info = componentQuickInfo(ts, ls, fileName, pos);
    expect(info).toBeDefined();
    const text = displayText(info);
    expect(text).toContain('AsyncName');
    expect(text).toContain('title'); // the props type is surfaced, like TS hover
  });

  it('returns undefined off a component tag', () => {
    const code = 'const t = html`<main><span>hi</span></main>`;';
    const { ls, fileName } = service(code);
    const pos = code.indexOf('span');
    expect(componentQuickInfo(ts, ls, fileName, pos)).toBeUndefined();
  });
});
