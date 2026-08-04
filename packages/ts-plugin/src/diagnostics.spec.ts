import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import init from './index.js';

const GLOBALS = '/globals.d.ts';
const GLOBALS_SRC =
  'declare function html(s: TemplateStringsArray, ...v: any[]): any;\n' +
  'declare function svg(s: TemplateStringsArray, ...v: any[]): any;\n';

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

const find = (ls: ts.LanguageService, fileName: string, needle: string) =>
  ls.getSemanticDiagnostics(fileName).find((d) => String(d.messageText).includes(needle));

describe('property access on an inferred each item', () => {
  it('reports a property the item type does not have, at the real source position', () => {
    const code =
      'const items = [{ id: 1, label: "a" }];\n' +
      'const t = html`<li each=${items}>${(it) => it.nope}</li>`;';
    const { ls, fileName } = plugin(code);

    const bad = find(ls, fileName, 'nope');
    expect(bad).toBeDefined();
    expect(code.slice(bad!.start!, bad!.start! + bad!.length!)).toBe('nope');
    expect(String(bad!.messageText)).toContain('does not exist');
  });

  it('stays quiet for a property that exists', () => {
    const code =
      'const items = [{ id: 1, label: "a" }];\n' +
      'const t = html`<li each=${items}>${(it) => it.label}</li>`;';
    const { ls, fileName } = plugin(code);
    expect(ls.getSemanticDiagnostics(fileName)).toHaveLength(0);
  });
});

describe('property access on an inferred element ref', () => {
  it('reports a property the element does not have', () => {
    const code = 'const t = html`<input ref=${(el) => el.nope}>`;';
    const { ls, fileName } = plugin(code);
    expect(find(ls, fileName, 'nope')).toBeDefined();
  });

  it('accepts a real element property', () => {
    const code = 'const t = html`<input ref=${(el) => el.value}>`;';
    const { ls, fileName } = plugin(code);
    expect(ls.getSemanticDiagnostics(fileName)).toHaveLength(0);
  });
});

describe('property access on an inferred event', () => {
  it('reports a property the event does not have', () => {
    const code = 'const t = html`<button @click=${(e) => e.nope}>x</button>`;';
    const { ls, fileName } = plugin(code);
    expect(find(ls, fileName, 'nope')).toBeDefined();
  });

  it('accepts a real event property', () => {
    const code = 'const t = html`<button @click=${(e) => e.clientX}>x</button>`;';
    const { ls, fileName } = plugin(code);
    expect(ls.getSemanticDiagnostics(fileName)).toHaveLength(0);
  });
});

describe('restraint', () => {
  it('says nothing when the item type accepts any property', () => {
    const code =
      'const items: any[] = [];\n' +
      'const t = html`<li each=${items}>${(it) => it.whatever}</li>`;';
    const { ls, fileName } = plugin(code);
    expect(ls.getSemanticDiagnostics(fileName)).toHaveLength(0);
  });

  it('leaves an explicitly typed parameter to the author', () => {
    const code =
      'const items = [{ id: 1 }];\n' +
      'const t = html`<li each=${items}>${(it: any) => it.nope}</li>`;';
    const { ls, fileName } = plugin(code);
    expect(ls.getSemanticDiagnostics(fileName)).toHaveLength(0);
  });

  it('does not blame a shadowing local that merely shares the name', () => {
    const code =
      'const items = [{ id: 1 }];\n' +
      'const t = html`<li each=${items}>${(it) => { const inner = { other: 1 }; return inner.other; }}</li>`;';
    const { ls, fileName } = plugin(code);
    expect(ls.getSemanticDiagnostics(fileName)).toHaveLength(0);
  });

  it('leaves a file with no templates completely alone', () => {
    const code = 'const a = { x: 1 };\nconst b = a.x;\n';
    const { ls, fileName } = plugin(code);
    expect(ls.getSemanticDiagnostics(fileName)).toHaveLength(0);
  });
});

describe('a signal read without calling it', () => {
  it('reports a bare accessor in child position', () => {
    const code =
      'declare const count: () => number;\n' +
      'const t = html`<div>${count}</div>`;';
    const { ls, fileName } = plugin(code);
    const bad = find(ls, fileName, 'accessor');
    expect(bad).toBeDefined();
    expect(code.slice(bad!.start!, bad!.start! + bad!.length!)).toBe('count');
  });

  it('accepts the call', () => {
    const code =
      'declare const count: () => number;\n' +
      'const t = html`<div>${count()}</div>`;';
    const { ls, fileName } = plugin(code);
    expect(find(ls, fileName, 'accessor')).toBeUndefined();
  });

  it('leaves a non-callable value alone', () => {
    const code = 'declare const name: string;\nconst t = html`<div>${name}</div>`;';
    const { ls, fileName } = plugin(code);
    expect(find(ls, fileName, 'accessor')).toBeUndefined();
  });

  it('leaves a component prop alone — accessors belong there', () => {
    // `<For each=${items}>` takes the accessor deliberately; only children of a
    // native element render their value.
    const code =
      'declare const items: () => number[];\n' +
      'const t = html`<For each=${items}>${(i) => i}</For>`;';
    const { ls, fileName } = plugin(code);
    expect(find(ls, fileName, 'accessor')).toBeUndefined();
  });

  it('leaves a render-prop child alone', () => {
    const code = 'const t = html`<For each=${[1]}>${(i) => i}</For>`;';
    const { ls, fileName } = plugin(code);
    expect(find(ls, fileName, 'accessor')).toBeUndefined();
  });

  it('reports an accessor reached by index', () => {
    const code =
      'declare const signals: Array<() => number>;\n' +
      'const t = html`<strong>${signals[0]}</strong>`;';
    const { ls, fileName } = plugin(code);
    const bad = find(ls, fileName, 'accessor');
    expect(bad).toBeDefined();
    expect(code.slice(bad!.start!, bad!.start! + bad!.length!)).toBe('signals[0]');
  });

  it('reports an accessor reached by property', () => {
    const code =
      'declare const state: { count: () => number };\n' +
      'const t = html`<strong>${state.count}</strong>`;';
    const { ls, fileName } = plugin(code);
    expect(find(ls, fileName, 'accessor')).toBeDefined();
  });

  it('accepts those forms once called', () => {
    const code =
      'declare const signals: Array<() => number>;\n' +
      'declare const state: { count: () => number };\n' +
      'const t = html`<b>${signals[0]()}</b><i>${state.count()}</i>`;';
    const { ls, fileName } = plugin(code);
    expect(find(ls, fileName, 'accessor')).toBeUndefined();
  });

  it('leaves a function that needs arguments alone', () => {
    // Not an accessor; calling it here would be wrong too.
    const code = 'declare const fmt: (n: number) => string;\nconst t = html`<div>${fmt}</div>`;';
    const { ls, fileName } = plugin(code);
    expect(find(ls, fileName, 'accessor')).toBeUndefined();
  });
});
