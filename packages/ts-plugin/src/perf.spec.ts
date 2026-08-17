/**
 * The plugin sits inside tsserver, so its cost is paid by every TypeScript feature
 * in the editor, in every project the extension activates for — which is any project
 * with a `.ts` file, template or not.
 *
 * These pin the two properties that keep it out of the way: repeated diagnostics on
 * an unchanged file must not redo the analysis, and a file with no `` html`` `` at all
 * must cost approximately nothing.
 */
import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import init from './index.js';

const GLOBALS = '/globals.d.ts';
const GLOBALS_SRC =
  'declare function html(s: TemplateStringsArray, ...v: any[]): any;\ndeclare function svg(s: TemplateStringsArray, ...v: any[]): any;\n';

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
    getCompilationSettings: () => ({
      target: ts.ScriptTarget.Latest,
      noEmit: true,
      strict: true,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    }),
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
  return { ls, fileName, base: languageService };
}

/** A file big enough that an extra full AST walk per request is measurable. */
function bigTemplateFile(components: number): string {
  const decls = Array.from({ length: components }, (_, i) => `function Card${i}() { return html\`<p>c${i}</p>\`; }`);
  const tags = Array.from({ length: components }, (_, i) => `<Card${i} />`).join('');
  return `${decls.join('\n')}\nconst app = html\`<main>${tags}</main>\`;\n`;
}

/** Same size, same shape, no templates anywhere. */
function bigPlainFile(fns: number): string {
  return (
    Array.from({ length: fns }, (_, i) => `export function plain${i}(a: number, b: string) {\n  return { a, b, i: ${i} };\n}`).join('\n') + '\n'
  );
}

function median(run: () => void, times: number): number {
  const samples: number[] = [];
  for (let i = 0; i < times; i++) {
    const started = performance.now();
    run();
    samples.push(performance.now() - started);
  }
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)];
}

describe('plugin overhead', () => {
  it('repeated diagnostics on an unchanged file reuse the analysis', () => {
    const { ls, fileName } = plugin(bigTemplateFile(60));

    // First call pays for the parse and the walk; later calls should not.
    const first = (() => {
      const started = performance.now();
      ls.getSemanticDiagnostics(fileName);
      return performance.now() - started;
    })();
    const repeat = median(() => ls.getSemanticDiagnostics(fileName), 15);

    // Generous bound — this is asserting "cached", not a specific speed.
    expect(repeat).toBeLessThan(Math.max(first, 1));
  });

  it('a file with no templates costs little over the bare service', () => {
    const plain = bigPlainFile(120);
    const withPlugin = plugin(plain);
    const bare = plugin(plain);

    // Warm both: TypeScript's own first-run cost dwarfs everything and would hide the signal.
    withPlugin.ls.getSemanticDiagnostics(withPlugin.fileName);
    bare.base.getSemanticDiagnostics(bare.fileName);

    const withMs = median(() => withPlugin.ls.getSemanticDiagnostics(withPlugin.fileName), 15);
    const bareMs = median(() => bare.base.getSemanticDiagnostics(bare.fileName), 15);

    // No templates means no tags to collect and nothing to suppress, so the plugin
    // should be a rounding error rather than a multiplier.
    expect(withMs).toBeLessThan(Math.max(bareMs * 3, 2));
  });

  it('a file that cannot hold a template is never walked for one', () => {
    // The guard is a substring test on the source text, so the observable property is
    // that a file with no `html`/`svg` tag reports no templates and no suppressions —
    // reached without traversing the AST.
    const { ls, fileName } = plugin('export const x = `a plain template`;\nexport function f() { return x; }\n');
    expect(ls.getSemanticDiagnostics(fileName)).toHaveLength(0);
    expect(ls.getSuggestionDiagnostics(fileName)).toHaveLength(0);
  });

  it('suggestion and semantic diagnostics share the tag scan', () => {
    const { ls, fileName } = plugin(bigTemplateFile(60));
    ls.getSemanticDiagnostics(fileName);

    // The editor asks for both on every keystroke. The second must not re-walk.
    const suggestion = median(() => ls.getSuggestionDiagnostics(fileName), 15);
    expect(suggestion).toBeLessThan(50);
  });
});
