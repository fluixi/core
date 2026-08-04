import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import init from './index.js';

const GLOBALS = '/globals.d.ts';
const GLOBALS_SRC =
  'declare function html(s: TemplateStringsArray, ...v: any[]): any;\n' +
  'declare function svg(s: TemplateStringsArray, ...v: any[]): any;\n';

function setup(code: string, fileName = '/a.ts') {
  const files: Record<string, string> = { [fileName]: code, [GLOBALS]: GLOBALS_SRC };
  let created = 0;
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
  // The plugin uses the `typescript` it is handed, so counting here counts exactly
  // the services the plugin creates — the real one above is not included.
  const counted = new Proxy(ts, {
    get(target, prop, receiver) {
      if (prop === 'createLanguageService') {
        return (...args: unknown[]) => {
          created++;
          return (target.createLanguageService as unknown as (...a: unknown[]) => ts.LanguageService)(...args);
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });
  const ls = (init as any)({
    typescript: counted,
  }).create({ languageService, languageServiceHost: host, project: {}, serverHost: {}, config: {} });

  return { ls, fileName, host, createdServices: () => created };
}

describe('single program', () => {
  it('does not create a second language service', () => {
    const code = 'const items = [{ id: 1 }];\nconst t = html`<li each=${items}>${(it) => it.id}</li>`;';
    const { createdServices } = setup(code);
    expect(createdServices()).toBe(0);
  });

  it('adds a shadow file to the program for a file with templates', () => {
    const code = 'const items = [{ id: 1 }];\nconst t = html`<li each=${items}>${(it) => it.id}</li>`;';
    const { host } = setup(code);
    expect(host.getScriptFileNames().some((f) => f.endsWith('.__fx.ts'))).toBe(true);
  });

  it('adds no shadow for a file without templates', () => {
    const { host } = setup('export const a = 1;');
    expect(host.getScriptFileNames().some((f) => f.endsWith('.__fx.ts'))).toBe(false);
  });
});

describe('shadow files stay invisible to the editor', () => {
  const code = 'const items = [{ id: 1 }];\nconst t = html`<li each=${items}>${(it) => it.id}</li>`;';

  it('keeps them out of rename locations', () => {
    const { ls, fileName } = setup(code);
    const locations = ls.findRenameLocations(fileName, code.indexOf('items'), false, false) ?? [];
    expect(locations.length).toBeGreaterThan(0);
    expect(locations.every((l: ts.RenameLocation) => !l.fileName.endsWith('.__fx.ts'))).toBe(true);
  });

  it('keeps them out of references', () => {
    const { ls, fileName } = setup(code);
    const refs = ls.getReferencesAtPosition(fileName, code.indexOf('items')) ?? [];
    expect(refs.every((r: ts.ReferenceEntry) => !r.fileName.endsWith('.__fx.ts'))).toBe(true);
  });

  it('reports no diagnostics for the shadow path itself', () => {
    const { ls, fileName } = setup(code);
    expect(ls.getSemanticDiagnostics(fileName + '.__fx.ts')).toEqual([]);
    expect(ls.getSyntacticDiagnostics(fileName + '.__fx.ts')).toEqual([]);
  });
});
