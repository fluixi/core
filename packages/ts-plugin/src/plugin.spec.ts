import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import init from './index.js';

// `html`/`svg` are imported in real code; declare them globally in a separate
// file so the tag resolves WITHOUT shifting the user-code positions.
const GLOBALS = '/globals.d.ts';
const GLOBALS_SRC = 'declare function html(s: TemplateStringsArray, ...v: any[]): any;\ndeclare function svg(s: TemplateStringsArray, ...v: any[]): any;\n';

/** Create the plugin over a real language service + host for one file. */
function plugin(code: string, fileName = '/a.tsx', extra: Record<string, string> = {}) {
  const files: Record<string, string> = { [fileName]: code, [GLOBALS]: GLOBALS_SRC, ...extra };
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
      // Without these a `./x.js` specifier does not resolve, so an alias declaration
      // silently degrades to `any` — which is what a real project would never do.
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    }),
    getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
  };
  const languageService = ts.createLanguageService(host, ts.createDocumentRegistry());
  const ls = (init as any)({ typescript: ts }).create({ languageService, languageServiceHost: host, project: {}, serverHost: {}, config: {} });
  return { ls, fileName, code };
}

describe('plugin end-to-end', () => {
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

  // The editor filters entries against the word it finds at the cursor, and inside a
  // template literal that word is not the attribute name — so without a span the props
  // appeared until the first keystroke and then disappeared.
  it('spans the partially typed name, so the editor filters against it', () => {
    const code =
      'function Card(props: { alpha?: string; beta?: number }) { return null as any; }\n' +
      'const t = html`<Card al></Card>`;';
    const { ls, fileName } = plugin(code);
    const pos = code.indexOf('<Card al') + '<Card al'.length;
    const entry = ls
      .getCompletionsAtPosition(fileName, pos, {})
      ?.entries.find((e: ts.CompletionEntry) => e.name === 'alpha');
    expect(entry?.replacementSpan).toEqual({ start: pos - 2, length: 2 });
  });

  it('spans nothing when the cursor sits after whitespace', () => {
    const code =
      'function Card(props: { alpha?: string }) { return null as any; }\n' +
      'const t = html`<Card ></Card>`;';
    const { ls, fileName } = plugin(code);
    const pos = code.indexOf('<Card ') + '<Card '.length;
    const entry = ls
      .getCompletionsAtPosition(fileName, pos, {})
      ?.entries.find((e: ts.CompletionEntry) => e.name === 'alpha');
    expect(entry?.replacementSpan).toEqual({ start: pos, length: 0 });
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

  it('completes props of a component supplied by a resolve rule', () => {
    // The compiler injects the import, so the file has neither an import nor a local
    // declaration — only an ambient global from generated declarations. Scanning the
    // file's own statements found nothing, so `<Stack ` offered no props at all while
    // hover on the same tag worked.
    const decls =
      'declare global {\n' +
      '  function Stack(props: { gap?: number; direction?: "row" | "column" }): any;\n' +
      '}\nexport {};\n';
    const code = 'const t = html`<Stack ></Stack>`;';
    const { ls, fileName } = plugin(code, '/a.tsx', { '/resolved.d.ts': decls });
    const pos = code.indexOf('<Stack ') + '<Stack '.length;
    const names = (ls.getCompletionsAtPosition(fileName, pos, {})?.entries ?? []).map(
      (e: ts.CompletionEntry) => e.name,
    );
    expect(names).toContain('gap');
    expect(names).toContain('direction');
  });

  it('completes props of a component reached through an alias declaration', () => {
    // The generated globals are `export import X = ns.X`, so the alias has to be followed
    // before the call signature is reachable. Verified against the real playground too:
    // `Stack` resolves through the alias to `StackProps`.
    const decls =
      'declare namespace _ui {\n' +
      '  function Stack(props: { gap?: number }): any;\n' +
      '}\n' +
      'declare global {\n  export import Stack = _ui.Stack;\n}\nexport {};\n';
    const code = 'const t = html`<Stack ></Stack>`;';
    const { ls, fileName } = plugin(code, '/a.tsx', { '/resolved.d.ts': decls });
    const pos = code.indexOf('<Stack ') + '<Stack '.length;
    const names = (ls.getCompletionsAtPosition(fileName, pos, {})?.entries ?? []).map(
      (e: ts.CompletionEntry) => e.name,
    );
    expect(names).toContain('gap');
  });

  it('keeps offsets correct after an escape sequence in the template', () => {
    // `node.text` is the *cooked* value, where `\`` is one character while the source
    // spends two. Using it shifted every span after an escape, so a tag's attribute area
    // moved left and completion silently returned nothing — in a file that looked
    // completely ordinary.
    const code =
      'function Card(props: { alpha?: string }) { return null as any; }\n' +
      'const t = html`<p>``x`` y</p><Card ><b>c</b></Card>`;'.replace(/``/g, '\\`');
    const { ls, fileName } = plugin(code);
    const pos = code.indexOf('<Card ') + '<Card '.length;
    const names = (ls.getCompletionsAtPosition(fileName, pos, {})?.entries ?? []).map(
      (e: ts.CompletionEntry) => e.name,
    );
    expect(names).toContain('alpha');
  });
});
