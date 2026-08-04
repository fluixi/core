import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import init from './index.js';

/**
 * The plugin resolves `IntrinsicElements` from `@fluixi/dom/attributes`. These
 * tests stand in a minimal copy of that module at the path the resolver finds, so
 * the behaviour is exercised without depending on a published dom build.
 */
const GLOBALS = '/globals.d.ts';
const GLOBALS_SRC =
  'declare function html(s: TemplateStringsArray, ...v: any[]): any;\n' +
  'declare function svg(s: TemplateStringsArray, ...v: any[]): any;\n';

const PKG = '/node_modules/@fluixi/dom/package.json';
const PKG_SRC = JSON.stringify({
  name: '@fluixi/dom',
  version: '1.0.0',
  exports: { './attributes': { types: './attributes.d.ts', default: './attributes.js' } },
});
const ATTRS = '/node_modules/@fluixi/dom/attributes.d.ts';
const ATTRS_SRC = `
export interface HTMLAttributes<T = HTMLElement> {
  class?: string | (() => string);
  id?: string;
  onClick?: (event: MouseEvent) => void;
}
export interface InputHTMLAttributes<T = HTMLInputElement> extends HTMLAttributes<T> {
  value?: string | number;
  disabled?: boolean;
}
export interface IntrinsicElements {
  div: HTMLAttributes<HTMLDivElement>;
  input: InputHTMLAttributes<HTMLInputElement>;
  [elemName: string]: any;
}
`;

function plugin(code: string, fileName = '/a.ts') {
  const files: Record<string, string> = {
    [fileName]: code,
    [GLOBALS]: GLOBALS_SRC,
    [ATTRS]: ATTRS_SRC,
    [PKG]: PKG_SRC,
  };
  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () => Object.keys(files),
    getScriptVersion: () => '1',
    getScriptSnapshot: (f) => {
      if (files[f]) return ts.ScriptSnapshot.fromString(files[f]);
      const d = ts.sys.readFile(f);
      return d !== undefined ? ts.ScriptSnapshot.fromString(d) : undefined;
    },
    getCurrentDirectory: () => '/',
    getCompilationSettings: () => ({
      target: ts.ScriptTarget.Latest,
      noEmit: true,
      strict: true,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    }),
    getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
    fileExists: (f) => f in files || ts.sys.fileExists(f),
    readFile: (f) => (f in files ? files[f] : ts.sys.readFile(f)),
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
  return { ls, fileName };
}

describe('element attribute completion', () => {
  it('offers the attributes an element accepts', () => {
    const code = 'const t = html`<div ></div>`;';
    const { ls, fileName } = plugin(code);
    const at = code.indexOf('<div ') + '<div '.length;

    const info = ls.getCompletionsAtPosition(fileName, at, undefined);
    const names = (info?.entries ?? []).map((e: ts.CompletionEntry) => e.name);
    expect(names).toContain('class');
    expect(names).toContain('id');
    expect(names).toContain('onClick');
  });

  it('offers the element-specific attributes, not just the shared ones', () => {
    const code = 'const t = html`<input >`;';
    const { ls, fileName } = plugin(code);
    const at = code.indexOf('<input ') + '<input '.length;

    const names = (ls.getCompletionsAtPosition(fileName, at, undefined)?.entries ?? [])
      .map((e: ts.CompletionEntry) => e.name);
    expect(names).toContain('value');
    expect(names).toContain('disabled');
    expect(names).toContain('class');
  });

  it('does not re-offer an attribute already present', () => {
    const code = 'const t = html`<div class="a" ></div>`;';
    const { ls, fileName } = plugin(code);
    const at = code.indexOf('class="a" ') + 'class="a" '.length;

    const names = (ls.getCompletionsAtPosition(fileName, at, undefined)?.entries ?? [])
      .map((e: ts.CompletionEntry) => e.name);
    expect(names).not.toContain('class');
    expect(names).toContain('id');
  });

  it('leaves ordinary code completion alone', () => {
    const code = 'const value = 1;\nconst other = val';
    const { ls, fileName } = plugin(code);
    const info = ls.getCompletionsAtPosition(fileName, code.length, undefined);
    const names = (info?.entries ?? []).map((e: ts.CompletionEntry) => e.name);
    expect(names).toContain('value');
  });
});

describe('element attribute hover', () => {
  it('shows the attribute type from the element map', () => {
    const code = 'const t = html`<input value="x">`;';
    const { ls, fileName } = plugin(code);
    const at = code.indexOf('value');

    const info = ls.getQuickInfoAtPosition(fileName, at);
    const text = (info?.displayParts ?? []).map((p: ts.SymbolDisplayPart) => p.text).join('');
    expect(text).toContain('value');
    expect(text).toContain('string | number');
  });

  it('types a shared attribute against the specific element', () => {
    const code = 'const t = html`<div onClick=${() => {}}></div>`;';
    const { ls, fileName } = plugin(code);
    const at = code.indexOf('onClick');

    const info = ls.getQuickInfoAtPosition(fileName, at);
    const text = (info?.displayParts ?? []).map((p: ts.SymbolDisplayPart) => p.text).join('');
    expect(text).toContain('MouseEvent');
  });
});
