import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { paramQuickInfo } from './infer.js';

/** In-memory language service over one file. */
function service(code: string, fileName = '/a.tsx') {
  const files: Record<string, string> = { [fileName]: code };
  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () => Object.keys(files),
    getScriptVersion: () => '1',
    getScriptSnapshot: (f) => {
      if (files[f]) return ts.ScriptSnapshot.fromString(files[f]);
      const onDisk = ts.sys.readFile(f); // serve lib.*.d.ts so the checker resolves types
      return onDisk !== undefined ? ts.ScriptSnapshot.fromString(onDisk) : undefined;
    },
    getCurrentDirectory: () => '/',
    getCompilationSettings: () => ({ target: ts.ScriptTarget.Latest, noEmit: true }),
    getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
  };
  return { ls: ts.createLanguageService(host, ts.createDocumentRegistry()), fileName };
}

function hover(code: string): string | undefined {
  const at = code.indexOf('|');
  const clean = code.replace('|', '');
  const { ls, fileName } = service(clean);
  const info = paramQuickInfo(ts, ls, fileName, at);
  return info?.displayParts?.map((p) => p.text).join('');
}

describe('html`` callback param inference', () => {
  it('infers the each item type from the array element type', () => {
    // hover the `it` reference inside the each render callback
    const text =
      'const items = [{ id: 1, label: "a" }];\n' +
      'const t = html`<li each=${items}>${(it) => it|.label}</li>`;';
    const h = hover(text);
    expect(h).toBeDefined();
    expect(h).toContain('it:');
    expect(h).toContain('id'); // the element type's shape leaks into the string
    expect(h).toContain('label');
  });

  it('infers the DOM event type for @click', () => {
    const text = 'const t = html`<button @click=${(e|) => e.preventDefault()}>x</button>`;';
    const h = hover(text);
    expect(h).toContain('e:');
    expect(h).toContain('MouseEvent');
  });

  it('infers KeyboardEvent for on:keydown', () => {
    const text = 'const t = html`<input on:keydown=${(ev|) => ev.key}></input>`;';
    expect(hover(text)).toContain('KeyboardEvent');
  });

  it('returns nothing off a callback param', () => {
    const text = 'const t = html`<div>plain |text</div>`;';
    expect(hover(text)).toBeUndefined();
  });

  it('leaves an already-typed param alone', () => {
    const text = 'const t = html`<li each=${[1]}>${(it|: number) => it}</li>`;';
    expect(hover(text)).toBeUndefined();
  });
});
